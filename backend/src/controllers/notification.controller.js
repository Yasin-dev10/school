const prisma = require('../config/prismaClient');

// @desc    Send notification
exports.createNotification = async (req, res) => {
    try {
        const { title, message, type, channels, targetRole, targetClass } = req.body;
        const tenantId = req.user.tenantId;

        const notification = await prisma.notification.create({
            data: {
                title, message,
                type: type || 'announcement',
                channels: channels || [],
                targetRole: targetRole || 'all',
                targetClass: targetClass || null,
                senderId: req.user.id,
                tenantId,
                status: 'sent'
            }
        });

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        let where = { tenantId };

        if (role === 'student' || role === 'parent') {
            where.OR = [
                { targetRole: 'all' },
                { targetRole: role }
            ];
        } else if (role === 'teacher') {
            where.OR = [{ targetRole: 'all' }, { targetRole: 'teacher' }];
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

