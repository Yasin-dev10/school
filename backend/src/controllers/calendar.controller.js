const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

const admins = ['school-admin', 'super-admin'];
const prismaRoles = new Set(['super_admin', 'school_admin', 'teacher', 'student', 'parent', 'accountant', 'librarian', 'receptionist']);
const canManage = user => admins.includes(user.role) || user.role === 'teacher';
const sendError = (res, error) => res.status(error.statusCode || 500).json({ success: false, message: error.message });

const toPrismaRole = role => String(role).replaceAll('-', '_');
const normalizeTargetRoles = roles => {
    if (!Array.isArray(roles)) {
        const error = new Error('Target roles must be an array');
        error.statusCode = 400;
        throw error;
    }
    const normalized = [...new Set(roles.map(toPrismaRole))];
    const invalidRole = normalized.find(role => !prismaRoles.has(role));
    if (invalidRole) {
        const error = new Error(`Invalid target role: ${invalidRole}`);
        error.statusCode = 400;
        throw error;
    }
    return normalized;
};

const accessibleClassIds = async user => {
    if (admins.includes(user.role) || user.role === 'receptionist') return null;
    if (user.role === 'student') {
        const cls = await prisma.class.findFirst({ where: { tenantId: user.tenantId, name: user.profileClass, section: user.profileSection || undefined }, select: { id: true } });
        return cls ? [cls.id] : [];
    }
    if (user.role === 'parent') {
        const children = await prisma.user.findMany({ where: { tenantId: user.tenantId, role: 'student', parentLinks: { some: { parentId: user.id } } }, select: { profileClass: true, profileSection: true } });
        const classes = await prisma.class.findMany({ where: { tenantId: user.tenantId, OR: children.filter(c => c.profileClass).map(c => ({ name: c.profileClass, section: c.profileSection || undefined })) }, select: { id: true } });
        return classes.map(c => c.id);
    }
    if (user.role === 'teacher') {
        const classes = await prisma.class.findMany({ where: { tenantId: user.tenantId, OR: [{ classTeacherId: user.id }, { subjects: { some: { teachers: { some: { teacherId: user.id } } } } }] }, select: { id: true } });
        return classes.map(c => c.id);
    }
    return [];
};

const eventWhere = async (user, from, to) => {
    const classIds = await accessibleClassIds(user);
    return {
        tenantId: user.tenantId, cancelled: false,
        ...(from || to ? { startAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
        AND: [
            { OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: toPrismaRole(user.role) } }] },
            ...(classIds === null ? [] : [{ OR: [{ classId: null }, { classId: { in: classIds } }] }])
        ]
    };
};

exports.getEvents = async (req, res) => {
    try {
        const where = await eventWhere(req.user, req.query.from, req.query.to);
        const events = await prisma.schoolEvent.findMany({ where, include: { createdBy: { select: { id: true, firstName: true, lastName: true } }, rsvps: { select: { userId: true, status: true, note: true } }, _count: { select: { rsvps: true } } }, orderBy: { startAt: 'asc' } });
        const classIds = await accessibleClassIds(req.user);
        const exams = await prisma.exam.findMany({
            where: { tenantId: req.user.tenantId, status: { not: 'cancelled' }, ...(req.query.from || req.query.to ? { startDate: { ...(req.query.from ? { gte: new Date(req.query.from) } : {}), ...(req.query.to ? { lte: new Date(req.query.to) } : {}) } } : {}), ...(classIds === null ? {} : { classes: { some: { classId: { in: classIds } } } }) },
            select: { id: true, name: true, startDate: true, endDate: true, term: true }
        });
        const virtualExams = exams.map(exam => ({ id: `exam:${exam.id}`, title: exam.name, description: exam.term, type: 'exam', startAt: exam.startDate, endAt: exam.endDate, allDay: true, source: 'exam', rsvps: [] }));
        res.json({ success: true, data: [...events, ...virtualExams].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)) });
    } catch (error) { sendError(res, error); }
};

exports.createEvent = async (req, res) => {
    try {
        if (!canManage(req.user)) return res.status(403).json({ message: 'You cannot create events' });
        const { title, description, type, startAt, endAt, allDay, location, classId, targetRoles = [], reminderMinutes = 1440 } = req.body;
        if (!title || !startAt || !endAt || !['holiday', 'exam', 'parent_meeting', 'school_event'].includes(type)) return res.status(400).json({ message: 'Title, type, start and end are required' });
        if (new Date(endAt) < new Date(startAt)) return res.status(400).json({ message: 'End date must be after start date' });
        if (req.user.role === 'teacher' && !classId) return res.status(400).json({ message: 'Teachers must select a class' });
        if (classId) {
            const allowedIds = await accessibleClassIds(req.user);
            if (allowedIds !== null && !allowedIds.includes(classId)) return res.status(403).json({ message: 'Class access denied' });
        }
        const event = await prisma.schoolEvent.create({ data: { tenantId: req.user.tenantId, title: title.trim(), description: description || null, type, startAt: new Date(startAt), endAt: new Date(endAt), allDay: !!allDay, location: location || null, classId: classId || null, targetRoles: normalizeTargetRoles(targetRoles), createdById: req.user.id, reminderMinutes: Math.max(0, Math.min(Number(reminderMinutes), 43200)) } });
        await logAction({ action: 'CREATE', module: 'TENANT', details: `Created calendar event: ${event.title}`, userId: req.user.id, tenantId: req.user.tenantId });
        res.status(201).json({ success: true, data: event });
    } catch (error) { sendError(res, error); }
};

exports.updateEvent = async (req, res) => {
    try {
        const event = await prisma.schoolEvent.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!admins.includes(req.user.role) && event.createdById !== req.user.id) return res.status(403).json({ message: 'You can only edit your own events' });
        const allowed = ['title', 'description', 'type', 'allDay', 'location', 'classId', 'targetRoles', 'reminderMinutes', 'cancelled'];
        const data = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
        if (req.body.targetRoles !== undefined) data.targetRoles = normalizeTargetRoles(req.body.targetRoles);
        if (req.body.startAt) data.startAt = new Date(req.body.startAt);
        if (req.body.endAt) data.endAt = new Date(req.body.endAt);
        if (req.body.startAt || req.body.reminderMinutes !== undefined) data.reminderSentAt = null;
        const updated = await prisma.schoolEvent.update({ where: { id: event.id }, data });
        res.json({ success: true, data: updated });
    } catch (error) { sendError(res, error); }
};

exports.deleteEvent = async (req, res) => {
    try {
        const event = await prisma.schoolEvent.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!admins.includes(req.user.role) && event.createdById !== req.user.id) return res.status(403).json({ message: 'You can only cancel your own events' });
        await prisma.schoolEvent.update({ where: { id: event.id }, data: { cancelled: true } });
        res.json({ success: true, message: 'Event cancelled' });
    } catch (error) { sendError(res, error); }
};

exports.rsvp = async (req, res) => {
    try {
        if (!['going', 'maybe', 'not_going'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid RSVP status' });
        const accessible = await prisma.schoolEvent.findFirst({ where: { id: req.params.id, ...(await eventWhere(req.user)) } });
        if (!accessible) return res.status(404).json({ message: 'Event not found' });
        const rsvp = await prisma.eventRsvp.upsert({ where: { eventId_userId: { eventId: accessible.id, userId: req.user.id } }, update: { status: req.body.status, note: req.body.note || null }, create: { eventId: accessible.id, userId: req.user.id, status: req.body.status, note: req.body.note || null } });
        res.json({ success: true, data: rsvp });
    } catch (error) { sendError(res, error); }
};
