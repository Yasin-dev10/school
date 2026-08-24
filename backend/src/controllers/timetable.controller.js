const prisma = require('../config/prismaClient');

// @desc    Create timetable slot
exports.createTimetable = async (req, res) => {
    try {
        const { classId, subjectId, day, startTime, endTime, room, teachers } = req.body;
        const tenantId = req.user.tenantId;

        if (!classId || !subjectId || !day || !startTime || !endTime || startTime >= endTime) {
            return res.status(400).json({ success: false, message: 'Class, subject, day and a valid time range are required' });
        }
        const [schoolClass, subject, validTeachers] = await Promise.all([
            prisma.class.findFirst({ where: { id: classId, tenantId } }),
            prisma.subject.findFirst({ where: { id: subjectId, tenantId } }),
            teachers?.length
                ? prisma.user.count({ where: { id: { in: teachers }, tenantId, role: 'teacher', status: 'active' } })
                : Promise.resolve(0)
        ]);
        if (!schoolClass || !subject) return res.status(404).json({ success: false, message: 'Class or subject not found' });
        if (teachers?.length && validTeachers !== new Set(teachers).size) {
            return res.status(400).json({ success: false, message: 'One or more selected teachers are invalid' });
        }
        const conflicts = await findConflicts({ tenantId, classId, day, startTime, endTime, room, teachers: teachers || [] });
        if (conflicts.length) {
            return res.status(409).json({ success: false, message: 'Class, teacher, or room has a conflicting timetable slot', conflicts });
        }

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
        const classId = req.params.classId || req.query.classId;

        let where = { tenantId };
        if (classId) where.classId = classId;
        else if (req.user.role === 'student' && req.user.profile?.class) {
            const cls = await prisma.class.findFirst({
                where: {
                    name: req.user.profile.class,
                    tenantId,
                    ...(req.user.profile.section && { section: req.user.profile.section })
                }
            });
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

const overlaps = (startA, endA, startB, endB) => startA < endB && endA > startB;

const findConflicts = async ({ tenantId, classId, day, startTime, endTime, room, teachers = [], excludeId }) => {
    const slots = await prisma.timetable.findMany({
        where: {
            tenantId,
            day,
            ...(excludeId && { id: { not: excludeId } }),
            OR: [
                { classId },
                ...(teachers.length ? [{ teachers: { some: { teacherId: { in: teachers } } } }] : []),
                ...(room?.trim() ? [{ room: { equals: room.trim(), mode: 'insensitive' } }] : [])
            ]
        },
        include: timetableInclude
    });

    return slots
        .filter(slot => overlaps(startTime, endTime, slot.startTime, slot.endTime))
        .map(formatSlot);
};

exports.validateTimetableSlot = async (req, res) => {
    try {
        const { classId, day, startTime, endTime, room, teachers = [], excludeId } = req.body;
        if (!classId || !day || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'classId, day, startTime and endTime are required' });
        }
        if (startTime >= endTime) {
            return res.status(400).json({ success: false, message: 'End time must be after start time' });
        }

        const conflicts = await findConflicts({
            tenantId: req.user.tenantId, classId, day, startTime, endTime, room, teachers, excludeId
        });
        res.status(200).json({ success: true, valid: conflicts.length === 0, conflicts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTeacherWorkload = async (req, res) => {
    try {
        const slots = await prisma.timetable.findMany({
            where: {
                tenantId: req.user.tenantId,
                teachers: { some: { teacherId: req.user.id } }
            },
            include: timetableInclude,
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
        });

        const minutes = slots.reduce((total, slot) => {
            const [sh, sm] = slot.startTime.split(':').map(Number);
            const [eh, em] = slot.endTime.split(':').map(Number);
            return total + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        }, 0);

        res.status(200).json({
            success: true,
            data: {
                totalSlots: slots.length,
                totalMinutes: minutes,
                totalHours: Number((minutes / 60).toFixed(2)),
                byDay: slots.reduce((result, slot) => {
                    result[slot.day] = (result[slot.day] || 0) + 1;
                    return result;
                }, {}),
                slots: slots.map(formatSlot)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkUpdateClassTimetable = async (req, res) => {
    try {
        const { classId, slots } = req.body;
        const tenantId = req.user.tenantId;
        if (!classId || !Array.isArray(slots)) {
            return res.status(400).json({ success: false, message: 'classId and slots array are required' });
        }

        const schoolClass = await prisma.class.findFirst({ where: { id: classId, tenantId } });
        if (!schoolClass) return res.status(404).json({ success: false, message: 'Class not found' });

        for (let index = 0; index < slots.length; index += 1) {
            const slot = slots[index];
            if (!slot.subjectId || !slot.day || !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
                return res.status(400).json({ success: false, message: `Invalid timetable slot at index ${index}` });
            }
            const duplicate = slots.findIndex((other, otherIndex) =>
                otherIndex !== index &&
                other.day === slot.day &&
                overlaps(slot.startTime, slot.endTime, other.startTime, other.endTime)
            );
            if (duplicate !== -1) {
                return res.status(409).json({ success: false, message: `Class time conflict between slots ${index} and ${duplicate}` });
            }
        }

        const teacherIds = [...new Set(slots.flatMap(slot => slot.teachers || []))];
        const rooms = [...new Set(slots.map(slot => slot.room?.trim()).filter(Boolean))];
        const externalSlots = teacherIds.length || rooms.length ? await prisma.timetable.findMany({
            where: {
                tenantId,
                classId: { not: classId },
                OR: [
                    ...(teacherIds.length ? [{ teachers: { some: { teacherId: { in: teacherIds } } } }] : []),
                    ...(rooms.length ? rooms.map(room => ({ room: { equals: room, mode: 'insensitive' } })) : [])
                ]
            },
            include: { teachers: true }
        }) : [];

        for (const slot of slots) {
            const conflict = externalSlots.find(existing =>
                existing.day === slot.day &&
                overlaps(slot.startTime, slot.endTime, existing.startTime, existing.endTime) &&
                (existing.teachers.some(link => (slot.teachers || []).includes(link.teacherId)) ||
                    (!!slot.room?.trim() && existing.room?.trim().toLowerCase() === slot.room.trim().toLowerCase()))
            );
            if (conflict) {
                return res.status(409).json({ success: false, message: 'A selected teacher or room is occupied during this time' });
            }
        }

        await prisma.$transaction(async tx => {
            await tx.timetable.deleteMany({ where: { classId, tenantId } });

            if (!slots.length) return;

            await tx.timetable.createMany({
                data: slots.map(slot => ({
                    classId,
                    subjectId: slot.subjectId,
                    day: slot.day,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    room: slot.room || null,
                    tenantId
                }))
            });

            const createdSlots = await tx.timetable.findMany({
                where: { classId, tenantId },
                select: { id: true, day: true, startTime: true }
            });
            const slotIds = new Map(createdSlots.map(slot => [`${slot.day}:${slot.startTime}`, slot.id]));
            const teacherLinks = slots.flatMap(slot => {
                const timetableId = slotIds.get(`${slot.day}:${slot.startTime}`);
                return (slot.teachers || []).map(teacherId => ({ timetableId, teacherId }));
            }).filter(link => link.timetableId);

            if (teacherLinks.length) {
                await tx.timetableTeacher.createMany({ data: teacherLinks, skipDuplicates: true });
            }
        }, { timeout: 20000 });

        const updated = await prisma.timetable.findMany({
            where: { classId, tenantId },
            include: timetableInclude,
            orderBy: [{ day: 'asc' }, { startTime: 'asc' }]
        });
        res.status(200).json({ success: true, count: updated.length, data: updated.map(formatSlot) });
    } catch (error) {
        if (error.code === 'P2028') {
            return res.status(503).json({ success: false, message: 'Timetable save timed out. Please try again.' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

