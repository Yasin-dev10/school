const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const prisma = require('../config/prismaClient');

const MAX_PUSH_ATTEMPTS = 5;

const sendSMS = async (phoneNumber, message) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token || !from || !phoneNumber) return false;
    const client = twilio(sid, token);
    await client.messages.create({ body: message, from, to: phoneNumber });
    return true;
};

const sendEmail = async (to, subject, text, html) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !to) return false;
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM || `"School Registry" <${process.env.SMTP_USER}>`, to, subject, text, html });
    return true;
};

const getMessaging = () => {
    if (admin.apps.length) return admin.messaging();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    return admin.messaging();
};

const preferenceKey = (notification) => {
    if (notification.type === 'attendance_alert') return 'attendanceAlerts';
    if (notification.type === 'fee_reminder') return 'feeAlerts';
    if (notification.data?.eventType === 'exam_result') return 'examResultAlerts';
    if (notification.data?.eventType === 'assignment') return 'assignmentAlerts';
    return 'announcementAlerts';
};

const recipientWhere = async (notification) => {
    const where = { tenantId: notification.tenantId, status: 'active' };
    if (notification.targetUserId) return { ...where, id: notification.targetUserId };
    if (notification.targetRole && notification.targetRole !== 'all') where.role = notification.targetRole;
    if (notification.targetClass) {
        const cls = await prisma.class.findFirst({ where: { id: notification.targetClass, tenantId: notification.tenantId }, select: { name: true, section: true } });
        if (cls) {
            if (where.role === 'parent') where.childLinks = { some: { student: { profileClass: cls.name, profileSection: cls.section } } };
            else { where.profileClass = cls.name; where.profileSection = cls.section; }
        }
    }
    return where;
};

const getRecipients = async (notification) => prisma.user.findMany({
    where: await recipientWhere(notification),
    select: { id: true, email: true, phone: true, notificationPreference: true, deviceTokens: { where: { active: true }, select: { id: true, token: true } } }
});

const stringifyData = (notification) => {
    const data = { ...(notification.data || {}), notificationId: notification.id };
    if (notification.deepLink) data.deepLink = notification.deepLink;
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
};

const retryDate = (attempts) => new Date(Date.now() + Math.min(60, 2 ** attempts) * 60 * 1000);
const invalidTokenCodes = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

const deliverPushToken = async (notification, userId, deviceToken, existingDelivery) => {
    const messaging = getMessaging();
    const attempts = (existingDelivery?.attempts || 0) + 1;
    const delivery = existingDelivery || await prisma.notificationDelivery.create({ data: { notificationId: notification.id, userId, deviceTokenId: deviceToken.id } });
    if (!messaging) {
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'failed', attempts, errorCode: 'firebase/not-configured', errorMessage: 'Firebase credentials are not configured', nextRetryAt: null } });
        return false;
    }
    try {
        await messaging.send({
            token: deviceToken.token,
            notification: { title: notification.title, body: notification.message },
            data: stringifyData(notification),
            android: { priority: 'high', notification: { channelId: 'school_alerts', sound: 'default' } },
            apns: { payload: { aps: { sound: 'default', contentAvailable: true } } },
            webpush: notification.deepLink ? { fcmOptions: { link: `${String(process.env.FRONTEND_URL || '').replace(/\/$/, '')}${notification.deepLink}` } } : undefined
        });
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'sent', attempts, sentAt: new Date(), nextRetryAt: null, errorCode: null, errorMessage: null } });
        return true;
    } catch (error) {
        const errorCode = error.code || 'messaging/unknown';
        const invalid = invalidTokenCodes.has(errorCode);
        await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'failed', attempts, errorCode, errorMessage: String(error.message || error).slice(0, 500), nextRetryAt: !invalid && attempts < MAX_PUSH_ATTEMPTS ? retryDate(attempts) : null } });
        if (invalid) await prisma.deviceToken.update({ where: { id: deviceToken.id }, data: { active: false } });
        return false;
    }
};

const dispatchNotification = async (notification) => {
    const recipients = await getRecipients(notification);
    const prefKey = preferenceKey(notification);
    let attempted = 0;
    let delivered = 0;
    for (const recipient of recipients) {
        const prefs = recipient.notificationPreference;
        if (prefs && prefs[prefKey] === false) continue;
        if (notification.channels.includes('push') && (!prefs || prefs.pushEnabled)) {
            for (const token of recipient.deviceTokens) { attempted++; if (await deliverPushToken(notification, recipient.id, token)) delivered++; }
        }
        if (notification.channels.includes('email') && (!prefs || prefs.emailEnabled)) {
            attempted++; try { if (await sendEmail(recipient.email, notification.title, notification.message)) delivered++; } catch (_) {}
        }
        if (notification.channels.includes('sms') && (!prefs || prefs.smsEnabled)) {
            attempted++; try { if (await sendSMS(recipient.phone, notification.message)) delivered++; } catch (_) {}
        }
    }
    const status = delivered > 0 ? 'sent' : 'failed';
    await prisma.notification.update({ where: { id: notification.id }, data: { status } });
    return { recipients: recipients.length, attempted, delivered, status };
};

const retryFailedPushDeliveries = async () => {
    const deliveries = await prisma.notificationDelivery.findMany({
        where: { status: 'failed', attempts: { lt: MAX_PUSH_ATTEMPTS }, nextRetryAt: { lte: new Date() } },
        include: { notification: true, deviceToken: true }, take: 100
    });
    for (const delivery of deliveries) {
        if (delivery.deviceToken?.active) await deliverPushToken(delivery.notification, delivery.userId, delivery.deviceToken, delivery);
    }
    return deliveries.length;
};

const createAutomatedNotification = async ({ tenantId, senderId, targetUserId, targetRole = 'student', targetClass, title, message, type = 'alert', eventType, deepLink }) => {
    const notification = await prisma.notification.create({
        data: { tenantId, senderId, targetUserId, targetRole, targetClass, title, message, type, channels: ['in_app', 'push'], status: 'pending', deepLink, data: eventType ? { eventType } : undefined }
    });
    dispatchNotification(notification).catch(error => console.error('Automated notification delivery failed:', error.message));
    return notification;
};

const notifyStudentAndParents = async ({ tenantId, senderId, studentId, title, message, type, eventType, deepLink }) => {
    const links = await prisma.studentParent.findMany({ where: { studentId }, select: { parentId: true } });
    const targets = [{ id: studentId, role: 'student' }, ...links.map(link => ({ id: link.parentId, role: 'parent' }))];
    return Promise.all(targets.map(target => createAutomatedNotification({
        tenantId, senderId, targetUserId: target.id, targetRole: target.role, title, message, type, eventType, deepLink
    })));
};

const processEventReminders = async () => {
    const now = new Date();
    const events = await prisma.schoolEvent.findMany({ where: { cancelled: false, reminderSentAt: null, startAt: { gt: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } }, take: 100 });
    let processed = 0;
    for (const event of events) {
        const dueAt = new Date(event.startAt.getTime() - event.reminderMinutes * 60 * 1000);
        if (dueAt > now) continue;
        const claimed = await prisma.schoolEvent.updateMany({ where: { id: event.id, reminderSentAt: null }, data: { reminderSentAt: now } });
        if (!claimed.count) continue;
        const roles = event.targetRoles.length ? event.targetRoles : (event.classId ? ['student', 'parent'] : ['all']);
        await Promise.all(roles.map(role => createAutomatedNotification({
            tenantId: event.tenantId, senderId: event.createdById, targetRole: role, targetClass: event.classId,
            title: `Reminder: ${event.title}`,
            message: `${event.title} starts ${event.allDay ? event.startAt.toLocaleDateString() : event.startAt.toLocaleString()}${event.location ? ` at ${event.location}` : ''}.`,
            eventType: 'calendar_event', deepLink: `/dashboard/calendar?event=${event.id}`
        })));
        processed++;
    }
    return processed;
};

module.exports = { sendSMS, sendEmail, dispatchNotification, retryFailedPushDeliveries, createAutomatedNotification, notifyStudentAndParents, processEventReminders, getMessaging };
