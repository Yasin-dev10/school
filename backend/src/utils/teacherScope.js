const prisma = require('../config/prismaClient');

const getTeacherScope = async (teacherId, tenantId) => {
    const [classes, subjects, timetables] = await Promise.all([
        prisma.class.findMany({
            where: {
                tenantId,
                OR: [
                    { classTeacherId: teacherId },
                    { subjects: { some: { teachers: { some: { teacherId } } } } },
                    { timetables: { some: { teachers: { some: { teacherId } } } } }
                ]
            },
            select: { id: true, name: true, section: true }
        }),
        prisma.subject.findMany({
            where: {
                tenantId,
                OR: [
                    { teachers: { some: { teacherId } } },
                    { classSubjects: { some: { teachers: { some: { teacherId } } } } },
                    { timetables: { some: { teachers: { some: { teacherId } } } } }
                ]
            },
            select: { id: true }
        }),
        prisma.timetable.findMany({
            where: { tenantId, teachers: { some: { teacherId } } },
            select: { classId: true, subjectId: true }
        })
    ]);

    return {
        classIds: [...new Set(classes.map(c => c.id))],
        classFilters: classes.flatMap(c => [
            { profileClass: c.name, profileSection: c.section },
            { profileClass: c.id }
        ]),
        subjectIds: [...new Set(subjects.map(s => s.id))],
        timetablePairs: timetables.map(t => ({ classId: t.classId, subjectId: t.subjectId }))
    };
};

const canTeacherAccessClass = async (teacherId, classId, tenantId) => {
    const academicClass = await prisma.class.findFirst({
        where: {
            id: classId,
            tenantId,
            OR: [
                { classTeacherId: teacherId },
                { subjects: { some: { teachers: { some: { teacherId } } } } },
                { timetables: { some: { teachers: { some: { teacherId } } } } }
            ]
        },
        select: { id: true }
    });

    return Boolean(academicClass);
};

const canTeacherAccessSubject = async (teacherId, subjectId, tenantId) => {
    const subject = await prisma.subject.findFirst({
        where: {
            id: subjectId,
            tenantId,
            OR: [
                { teachers: { some: { teacherId } } },
                { classSubjects: { some: { teachers: { some: { teacherId } } } } },
                { timetables: { some: { teachers: { some: { teacherId } } } } }
            ]
        },
        select: { id: true }
    });

    return Boolean(subject);
};

const canTeacherAccessClassSubject = async (teacherId, classId, subjectId, tenantId) => {
    const academicClass = await prisma.class.findFirst({
        where: {
            id: classId,
            tenantId,
            OR: [
                { subjects: { some: { subjectId, teachers: { some: { teacherId } } } } },
                { timetables: { some: { subjectId, teachers: { some: { teacherId } } } } }
            ]
        },
        select: { id: true }
    });

    return Boolean(academicClass);
};

const canTeacherAccessStudent = async (teacherId, studentId, tenantId) => {
    const scope = await getTeacherScope(teacherId, tenantId);
    if (scope.classFilters.length === 0) return false;

    const student = await prisma.user.findFirst({
        where: {
            id: studentId,
            tenantId,
            role: 'student',
            OR: scope.classFilters
        },
        select: { id: true }
    });

    return Boolean(student);
};

module.exports = {
    getTeacherScope,
    canTeacherAccessClass,
    canTeacherAccessSubject,
    canTeacherAccessClassSubject,
    canTeacherAccessStudent
};
