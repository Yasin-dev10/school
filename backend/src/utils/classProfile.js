const normalizeProfileValue = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized || null;
};

const classIdentitySelect = { id: true, name: true, section: true };

const resolveClassReference = async (prisma, { tenantId, classRef, section }) => {
    const normalizedRef = normalizeProfileValue(classRef);
    const normalizedSection = normalizeProfileValue(section);

    if (!normalizedRef) return null;

    const byId = await prisma.class.findFirst({
        where: { id: normalizedRef, tenantId },
        select: classIdentitySelect
    });

    if (byId) return byId;

    const matches = await prisma.class.findMany({
        where: {
            tenantId,
            name: normalizedRef,
            ...(normalizedSection && { section: normalizedSection })
        },
        select: classIdentitySelect,
        orderBy: [{ section: 'asc' }]
    });

    if (matches.length === 1) return matches[0];

    if (matches.length > 1) {
        const error = new Error(`Class "${normalizedRef}" has multiple sections. Please choose a section.`);
        error.code = 'AMBIGUOUS_CLASS';
        error.statusCode = 400;
        throw error;
    }

    return null;
};

const profileForClass = (academicClass) => ({
    profileClass: academicClass.name,
    profileSection: academicClass.section
});

const studentWhereForClass = (tenantId, academicClass) => ({
    tenantId,
    role: 'student',
    OR: [
        { profileClass: academicClass.name, profileSection: academicClass.section },
        { profileClass: academicClass.id }
    ]
});

module.exports = {
    normalizeProfileValue,
    resolveClassReference,
    profileForClass,
    studentWhereForClass
};
