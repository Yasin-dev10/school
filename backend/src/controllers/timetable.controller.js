const prisma = require('../config/prismaClient');

// @desc    Create timetable slot
exports.createTimetable = async (req, res) => {
    try {
        const { classId, subjectId, day, startTime, endTime, room, teachers } = req.body;
        const tenantId = req.user.tenantId;

        const exists = await prisma.timetable.findFirst({ where: { classId, day, startTime, tenantId } });
        if (exists) return res.status(400).json({ message: 'Timetable slot already exists for this class, day and time' });

        const slot = await prisma.timetable.create({
            data: {
                classId, subjectId, day, startTime, endTime,
                room: room || null, tenantId,
                ...(teachers?.length > 0 && {
                    teachers: { create: teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
                })
            },
            include: timetableInclude
        });

        res.status(201).json({ success: true, data: formatSlot(slot) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get timetable for class
exports.getTimetable = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { classId } = req.query;

        let where = { tenantId };
        if (classId) where.classId = classId;
        else if (req.user.role === 'student' && req.user.profile?.class) {
            const cls = await prisma.class.findFirst({ where: { name: req.user.profile.class, tenantId } });
            if (cls) where.classId = cls.id;
        } else if (req.user.role === 'teacher') {
            where.teachers = { some: { teacherId: req.user.id } };
        }

        const slots = await prisma.timetable.findMany({
            where, include: timetableInclude,
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
        });

        res.status(200).json({ success: true, count: slots.length, data: slots.map(formatSlot) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update timetable slot
exports.updateTimetable = async (req, res) => {
    try {
        const exists = await prisma.timetable.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Timetable slot not found' });

        const { subjectId, day, startTime, endTime, room, teachers } = req.body;

        if (teachers !== undefined) {
            await prisma.timetableTeacher.deleteMany({ where: { timetableId: req.params.id } });
        }

        const updated = await prisma.timetable.update({
            where: { id: req.params.id },
            data: {
                ...(subjectId && { subjectId }),
                ...(day && { day }),
                ...(startTime && { startTime }),
                ...(endTime && { endTime }),
                ...(room !== undefined && { room }),
                ...(teachers?.length > 0 && {
                    teachers: { create: teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
                })
            },
            include: timetableInclude
        });

        res.status(200).json({ success: true, data: formatSlot(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete timetable slot
exports.deleteTimetable = async (req, res) => {
    try {
        const slot = await prisma.timetable.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!slot) return res.status(404).json({ message: 'Timetable slot not found' });

        await prisma.timetable.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Timetable slot deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const timetableInclude = {
    class: { select: { id: true, name: true, section: true } },
    subject: { select: { id: true, name: true, code: true } },
    teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }
};

const formatSlot = (s) => ({
    ...s, _id: s.id,
    teachers: s.teachers?.map(t => t.teacher) || []
});


exports.addTimetableSlot = exports.createTimetable;
exports.getClassTimetable = exports.getTimetable;
exports.getTeacherTimetable = exports.getTimetable;
exports.getStudentTimetable = exports.getTimetable;
exports.deleteTimetableSlot = exports.deleteTimetable;
exports.getAllTimetable = exports.getTimetable;
exports.validateTimetableSlot = async (req, res) => { res.status(200).json({ success: true, valid: true }) };
exports.getTeacherWorkload = async (req, res) => { res.status(200).json({ success: true, data: [] }) };
exports.bulkUpdateClassTimetable = async (req, res) => { res.status(200).json({ success: true, message: "Not implemented" }) };

