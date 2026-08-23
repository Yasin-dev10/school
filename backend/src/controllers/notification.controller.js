const prisma = require('../config/prismaClient');
const { dispatchNotification, retryFailedPushDeliveries } = require('../services/notification.service');

// @desc    Send notification
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, channels, targetRole, targetClass, targetUserId, deepLink, data } = req.body;
        const tenantId = req.user.tenantId;
        const selectedChannels = Array.isArray(channels) && channels.length ? channels : ['in_app'];
        if (deepLink && (!deepLink.startsWith('/') || deepLink.startsWith('//'))) {
            return res.status(400).json({ success: false, message: 'Deep link must be an internal application path' });
        }

        const notification = await prisma.notification.create({
            data: {
                title, message,
                type: type || 'announcement',
                channels: selectedChannels,
                targetRole: targetRole || 'all',
                targetClass: targetClass || null,
                senderId: req.user.id,
                tenantId,
                targetUserId: targetUserId || null,
                deepLink: deepLink || null,
                data: data || undefined,
                status: selectedChannels.some(channel => channel !== 'in_app') ? 'pending' : 'sent'
            }
        });

        let delivery = null;
        if (selectedChannels.some(channel => channel !== 'in_app')) {
            delivery = await dispatchNotification(notification);
        }

        res.status(201).json({ success: true, data: notification, delivery });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.registerDeviceToken = async (req, res) => {
    try {
        const { token, platform, deviceName } = req.body;
        if (!token || !['android', 'ios', 'web'].includes(platform)) {
            return res.status(400).json({ success: false, message: 'A valid token and platform are required' });
        }
        const device = await prisma.deviceToken.upsert({
            where: { token },
            update: { userId: req.user.id, tenantId: req.user.tenantId, platform, deviceName: deviceName || null, active: true, lastSeenAt: new Date() },
            create: { token, userId: req.user.id, tenantId: req.user.tenantId, platform, deviceName: deviceName || null }
        });
        res.status(200).json({ success: true, data: { id: device.id, platform: device.platform, active: device.active } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.unregisterDeviceToken = async (req, res) => {
    try {
        await prisma.deviceToken.updateMany({ where: { token: req.body.token, userId: req.user.id }, data: { active: false } });
        res.status(200).json({ success: true, message: 'Device unregistered' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const preferences = await prisma.notificationPreference.upsert({
            where: { userId: req.user.id }, update: {}, create: { userId: req.user.id, tenantId: req.user.tenantId }
        });
        res.status(200).json({ success: true, data: preferences });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const allowed = ['pushEnabled', 'emailEnabled', 'smsEnabled', 'attendanceAlerts', 'examResultAlerts', 'assignmentAlerts', 'feeAlerts', 'announcementAlerts'];
        const values = Object.fromEntries(allowed.filter(key => typeof req.body[key] === 'boolean').map(key => [key, req.body[key]]));
        const preferences = await prisma.notificationPreference.upsert({
            where: { userId: req.user.id }, update: values, create: { userId: req.user.id, tenantId: req.user.tenantId, ...values }
        });
        res.status(200).json({ success: true, data: preferences });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getDeliveryStatus = async (req, res) => {
    try {
        const notification = await prisma.notification.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
        const deliveries = await prisma.notificationDelivery.findMany({
            where: { notificationId: notification.id },
            select: { id: true, userId: true, status: true, attempts: true, sentAt: true, nextRetryAt: true, errorCode: true, errorMessage: true }
        });
        res.status(200).json({ success: true, data: deliveries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.retryDeliveries = async (_req, res) => {
    try {
        const count = await retryFailedPushDeliveries();
        res.status(200).json({ success: true, retried: count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        if (!tenantId && role !== 'super-admin') {
            return res.status(400).json({ success: false, message: 'User is not assigned to a school' });
        }

        // Platform super-admin accounts may legitimately have no tenant. Prisma
        // rejects `tenantId: null` here because Notification.tenantId is required.
        let where = tenantId ? { tenantId } : { senderId: req.user.id };

        if (role === 'student' || role === 'parent') {
            const accessRules = [
                { OR: [{ targetUserId: null }, { targetUserId: req.user.id }] },
                { OR: [{ targetRole: 'all' }, { targetRole: role }] }
            ];
            if (role === 'student' && req.user.profileClass) {
                const cls = await prisma.class.findFirst({
                    where: { tenantId, name: req.user.profileClass, section: req.user.profileSection || undefined },
                    select: { id: true }
                });
                accessRules.push({ OR: [{ targetClass: null }, { targetClass: cls?.id || '__none__' }] });
            }
            where.AND = accessRules;
        } else if (role === 'teacher') {
            where.AND = [
                { OR: [{ targetUserId: null }, { targetUserId: req.user.id }] },
                { OR: [{ targetRole: 'all' }, { targetRole: 'teacher' }] }
            ];
        }

        const notifications = await prisma.notification.findMany({
            where,
            include: {
                sender: { select: { id: true, firstName: true, lastName: true } },
                readBy: { select: { userId: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        await prisma.notificationRead.upsert({
            where: { notificationId_userId: { notificationId: req.params.id, userId: req.user.id } },
            update: {},
            create: { notificationId: req.params.id, userId: req.user.id }
        });
        res.status(200).json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const existing = await prisma.notification.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Notification not found' });

        await prisma.notification.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({ where: { tenantId: req.user.tenantId, status: 'sent', NOT: { readBy: { some: { userId: req.user.id } } } } });
        res.status(200).json({ success: true, count });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// @desc    Get all platform announcements (Super Admin)
exports.getPlatformAnnouncements = async (req, res) => {
    try {
        const announcements = await prisma.notification.findMany({
            where: { type: 'announcement', senderId: req.user.id },
            include: { sender: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.status(200).json({ success: true, count: announcements.length, data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send platform-wide announcement to all tenants (Super Admin)
exports.sendPlatformAnnouncement = async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });

        const tenants = await prisma.tenant.findMany({
            where: { status: 'active' },
            select: { tenantId: true }
        });

        // Create one announcement per active tenant
        const created = await prisma.$transaction(
            tenants.map(t =>
                prisma.notification.create({
                    data: {
                        title, message,
                        type: 'announcement',
                        channels: [],
                        targetRole: 'all',
                        senderId: req.user.id,
                        tenantId: t.tenantId,
                        status: 'sent'
                    }
                })
            )
        );

        res.status(201).json({ success: true, message: `Announcement sent to ${created.length} schools`, count: created.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

