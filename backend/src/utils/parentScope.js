const prisma = require('../config/prismaClient');

const getParentScope = async (parentId, tenantId) => {
    const children = await prisma.user.findMany({
        where: { tenantId, role: 'student', parentLinks: { some: { parentId } } },
        select: { id: true, profileClass: true, profileSection: true }
    });
    const classRefs = [...new Set(children.map((child) => child.profileClass).filter(Boolean))];
    const classes = classRefs.length ? await prisma.class.findMany({
        where: { tenantId, OR: [{ id: { in: classRefs } }, { name: { in: classRefs } }] },
        select: { id: true, name: true, section: true }
    }) : [];
    const classesByName = classes.reduce((counts, schoolClass) => {
        counts.set(schoolClass.name, (counts.get(schoolClass.name) || 0) + 1);
        return counts;
    }, new Map());
    const classIds = classes.filter((schoolClass) => children.some((child) =>
        child.profileClass === schoolClass.id ||
        (child.profileClass === schoolClass.name && (child.profileSection
            ? child.profileSection === schoolClass.section
            : classesByName.get(schoolClass.name) === 1))
    )).map((schoolClass) => schoolClass.id);

    return {
        studentIds: children.map((child) => child.id),
        classIds: [...new Set(classIds)]
    };
};

const getParentTeacherIds = async (parentId, tenantId) => {
    const { classIds } = await getParentScope(parentId, tenantId);
    if (!classIds.length) return [];
    const [classes, timetableSlots] = await Promise.all([
        prisma.class.findMany({
            where: { id: { in: classIds }, tenantId },
            select: { classTeacherId: true, subjects: { select: { teachers: { select: { teacherId: true } } } } }
        }),
        prisma.timetable.findMany({
            where: { classId: { in: classIds }, tenantId },
            select: { teachers: { select: { teacherId: true } } }
        })
    ]);
    return [...new Set([
        ...classes.map((schoolClass) => schoolClass.classTeacherId),
        ...classes.flatMap((schoolClass) => schoolClass.subjects.flatMap((subject) => subject.teachers.map((teacher) => teacher.teacherId))),
        ...timetableSlots.flatMap((slot) => slot.teachers.map((teacher) => teacher.teacherId))
    ].filter(Boolean))];
};

module.exports = { getParentScope, getParentTeacherIds };
