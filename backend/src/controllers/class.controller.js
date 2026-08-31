const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const { resolveClassReference, studentWhereForClass } = require('../utils/classProfile');

const classInclude = {
    classTeacher: { select: { id: true, firstName: true, lastName: true, email: true } },
    subjects: {
        include: {
            subject: { select: { id: true, name: true, code: true } },
            teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }
        }
    }
};

const withId = (record) => record ? { ...record, _id: record.id } : record;

const formatClass = (c) => ({
    ...c,
    _id: c.id,
    classTeacher: withId(c.classTeacher),
    subjects: c.subjects?.map(cs => ({
        subject: withId(cs.subject),
        teachers: cs.teachers?.map(t => withId(t.teacher)) || [],
        weeklyPeriods: cs.weeklyPeriods,
        room: cs.room
    })) || []
});

// @desc    Create a new class
exports.createClass = async (req, res) => {
    try {
        const { name, section, room, classTeacher, gradeLevel, grade, subjects } = req.body;
        const tenantId = req.user.tenantId;

        const exists = await prisma.class.findFirst({ where: { name, section, tenantId } });
        if (exists) return res.status(400).json({ message: 'Class with this section already exists' });

        // Validate subjects
        let validatedSubjects = [];
        if (subjects?.length > 0) {
            for (const sub of subjects) {
                if (!sub.subject)
                    return res.status(400).json({ success: false, message: 'Each subject entry must have a subject ID' });

                const subjectExists = await prisma.subject.findFirst({ where: { id: sub.subject, tenantId } });
                if (!subjectExists)
                    return res.status(400).json({ success: false, message: `Subject ${sub.subject} not found` });

                const teachers = Array.isArray(sub.teachers) ? sub.teachers : [];
                if (teachers.length > 0) {
                    const validTeachers = await prisma.user.findMany({ where: { id: { in: teachers }, tenantId, role: 'teacher' } });
                    if (validTeachers.length !== teachers.length)
                        return res.status(400).json({ success: false, message: 'One or more teacher IDs are invalid' });
                }
                validatedSubjects.push({
                    subjectId: sub.subject,
                    teachers,
                    weeklyPeriods: Number.isFinite(Number(sub.weeklyPeriods)) ? Number(sub.weeklyPeriods) : null,
                    room: sub.room ? String(sub.room).trim() : null
                });
            }
        }

        const newClass = await prisma.class.create({
            data: {
                name, section, gradeLevel, grade,
                room: room || null,
                classTeacherId: classTeacher || null,
                tenantId,
                subjects: {
                    create: validatedSubjects.map(vs => ({
                        subject: { connect: { id: vs.subjectId } },
                        weeklyPeriods: vs.weeklyPeriods,
                        room: vs.room,
                        teachers: { create: vs.teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
                    }))
                }
            },
            include: classInclude
        });

        await logAction({ action: 'CREATE', module: 'CLASS', details: `Created class: ${name} - ${section}`, userId: req.user._id, tenantId });
        res.status(201).json({ success: true, data: formatClass(newClass) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all classes
exports.getClasses = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        let where = { tenantId };

        if (role === 'teacher') {
            const slots = await prisma.timetable.findMany({
                where: { tenantId, teachers: { some: { teacherId: req.user.id } } },
                select: { classId: true }
            });
            const classIdsFromTimetable = slots.map(s => s.classId);
            where.OR = [
                { classTeacherId: req.user.id },
                { subjects: { some: { teachers: { some: { teacherId: req.user.id } } } } },
                { id: { in: classIdsFromTimetable } }
            ];
        } else if (role === 'student') {
            if (req.user.profile?.class) {
                const ownClass = await resolveClassReference(prisma, {
                    tenantId,
                    classRef: req.user.profile.class,
                    section: req.user.profile.section
                });

                if (!ownClass) return res.status(200).json({ success: true, count: 0, data: [] });
                where.id = ownClass.id;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        } else if (role === 'parent') {
            const children = await prisma.user.findMany({
                where: { parentLinks: { some: { parentId: req.user.id } }, tenantId, role: 'student' }
            });
            if (children.length > 0) {
                const childClasses = await Promise.all(children
                    .filter(c => c.profileClass)
                    .map(c => resolveClassReference(prisma, {
                        tenantId,
                        classRef: c.profileClass,
                        section: c.profileSection
                    }).catch(() => null)));
                const filters = childClasses.filter(Boolean).map(c => ({ id: c.id }));
                if (filters.length > 0) where.OR = filters;
                else return res.status(200).json({ success: true, count: 0, data: [] });
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        const classes = await prisma.class.findMany({
            where, include: classInclude, orderBy: [{ name: 'asc' }, { section: 'asc' }]
        });

        const studentCounts = await prisma.user.groupBy({
            by: ['profileClass', 'profileSection'],
            where: { tenantId, role: 'student' },
            _count: { id: true }
        });

        const teacherTimetablePairs = role === 'teacher'
            ? new Set((await prisma.timetable.findMany({
                where: { tenantId, teachers: { some: { teacherId: req.user.id } } },
                select: { classId: true, subjectId: true }
            })).map(slot => `${slot.classId}:${slot.subjectId}`))
            : null;

        const formattedClasses = classes.map(c => {
            const studentCount = studentCounts.reduce((total, sc) => {
                const canonicalMatch = sc.profileClass === c.name && sc.profileSection === c.section;
                const legacyIdMatch = sc.profileClass === c.id;
                return canonicalMatch || legacyIdMatch ? total + sc._count.id : total;
            }, 0);

            const formatted = formatClass(c);
            if (role === 'teacher') {
                formatted.subjects = formatted.subjects.filter(subjectEntry =>
                    subjectEntry.teachers.some(teacher => teacher.id === req.user.id) ||
                    teacherTimetablePairs.has(`${c.id}:${subjectEntry.subject.id}`)
                );
            }

            return {
                ...formatted,
                studentCount
            };
        });

        res.status(200).json({ success: true, count: classes.length, data: formattedClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single class
exports.getClass = async (req, res) => {
    try {
        const academicClass = await prisma.class.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: classInclude
        });
        if (!academicClass) return res.status(404).json({ success: false, message: 'Class not found' });

        const studentCount = await prisma.user.count({
            where: studentWhereForClass(req.user.tenantId, academicClass)
        });

        res.status(200).json({
            success: true,
            data: {
                ...formatClass(academicClass),
                studentCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update class
exports.updateClass = async (req, res) => {
    try {
        const exists = await prisma.class.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Class not found' });

        const { name, section, room, classTeacher, gradeLevel, grade, subjects } = req.body;

        let subjectCreate = [];
        if (subjects !== undefined) {
            if (!Array.isArray(subjects)) return res.status(400).json({ success: false, message: 'Subjects must be an array' });

            const validatedSubjects = [];
            for (const sub of subjects) {
                if (!sub.subject) return res.status(400).json({ success: false, message: 'Each subject entry must have a subject ID' });
                const subjectExists = await prisma.subject.findFirst({ where: { id: sub.subject, tenantId: req.user.tenantId } });
                if (!subjectExists) return res.status(400).json({ success: false, message: `Subject ${sub.subject} not found` });
                const teachers = Array.isArray(sub.teachers) ? sub.teachers : [];
                if (teachers.length > 0) {
                    const validTeachers = await prisma.user.findMany({ where: { id: { in: teachers }, tenantId: req.user.tenantId, role: 'teacher' } });
                    if (validTeachers.length !== teachers.length) return res.status(400).json({ success: false, message: 'Invalid teacher IDs' });
                }
                validatedSubjects.push({
                    subjectId: sub.subject,
                    teachers,
                    weeklyPeriods: Number.isFinite(Number(sub.weeklyPeriods)) ? Number(sub.weeklyPeriods) : null,
                    room: sub.room ? String(sub.room).trim() : null
                });
            }

            subjectCreate = validatedSubjects.map(vs => ({
                subject: { connect: { id: vs.subjectId } },
                weeklyPeriods: vs.weeklyPeriods,
                room: vs.room,
                teachers: { create: vs.teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
            }));
        }

        const nextName = name !== undefined ? name : exists.name;
        const nextSection = section !== undefined ? section : exists.section;
        const classIdentityChanged = nextName !== exists.name || nextSection !== exists.section;

        const updated = await prisma.$transaction(async (tx) => {
            if (subjects !== undefined) {
                await tx.classSubject.deleteMany({ where: { classId: req.params.id } });
            }

            const updatedClass = await tx.class.update({
                where: { id: req.params.id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(section !== undefined && { section }),
                    ...(room !== undefined && { room }),
                    ...(classTeacher !== undefined && { classTeacherId: classTeacher || null }),
                    ...(gradeLevel !== undefined && { gradeLevel }),
                    ...(grade !== undefined && { grade }),
                    ...(subjects !== undefined && subjectCreate.length > 0 && { subjects: { create: subjectCreate } })
                },
                include: classInclude
            });

            if (classIdentityChanged) {
                await tx.user.updateMany({
                    where: studentWhereForClass(req.user.tenantId, exists),
                    data: {
                        profileClass: updatedClass.name,
                        profileSection: updatedClass.section
                    }
                });
            }

            return updatedClass;
        });

        await logAction({ action: 'UPDATE', module: 'CLASS', details: `Updated class: ${updated.name} - ${updated.section}`, userId: req.user._id, tenantId: req.user.tenantId });
        res.status(200).json({ success: true, data: formatClass(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete class
exports.deleteClass = async (req, res) => {
    try {
        const academicClass = await prisma.class.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!academicClass) return res.status(404).json({ message: 'Class not found' });

        await prisma.class.delete({ where: { id: req.params.id } });

        await logAction({ action: 'DELETE', module: 'CLASS', details: `Deleted class: ${academicClass.name} - ${academicClass.section}`, userId: req.user._id, tenantId: req.user.tenantId });
        res.status(200).json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
