const prisma = require('../config/prismaClient');

// Helper: verify child belongs to parent
const verifyChild = async (parentId, studentId, tenantId) => {
    return prisma.user.findFirst({
        where: {
            id: studentId,
            parentLinks: { some: { parentId } },
            tenantId,
            role: 'student'
        }
    });
};

// @desc    Get all children
exports.getMyChildren = async (req, res) => {
    try {
        const children = await prisma.user.findMany({
            where: {
                parentLinks: { some: { parentId: req.user.id } },
                tenantId: req.user.tenantId,
                role: 'student'
            },
            select: {
                id: true, firstName: true, lastName: true, email: true, status: true,
                admissionNo: true, profileClass: true, profileSection: true, gender: true
            }
        });
        res.status(200).json({ success: true, count: children.length, data: children });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child attendance
exports.getChildAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user.id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied. Child not linked to parent.' });

        const { startDate, endDate } = req.query;
        let where = { studentId, tenantId: req.user.tenantId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        });

        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;

        res.status(200).json({
            success: true,
            data: {
                records: attendance,
                stats: { total, present, absent, percentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0' }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child marks
exports.getChildMarks = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user.id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied.' });

        const marks = await prisma.mark.findMany({
            where: { studentId, tenantId: req.user.tenantId },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                exam: { select: { id: true, name: true, term: true, isApproved: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, data: marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get child timetable
exports.getChildTimetable = async (req, res) => {
    try {
        const { studentId } = req.params;
        const child = await verifyChild(req.user.id, studentId, req.user.tenantId);
        if (!child) return res.status(403).json({ message: 'Access denied.' });

        let where = { tenantId: req.user.tenantId };
        if (child.profileClass) {
            const cls = await prisma.class.findFirst({ where: { name: child.profileClass, tenantId: req.user.tenantId } });
            if (cls) where.classId = cls.id;
        }

        const timetable = await prisma.timetable.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }
            },
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
        });

        res.status(200).json({ success: true, data: timetable });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get notifications for parent
exports.getParentNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                tenantId: req.user.tenantId,
                OR: [{ targetRole: 'all' }, { targetRole: 'parent' }]
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
