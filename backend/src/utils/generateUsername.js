const normalizeSchoolCode = tenantId => {
    const code = String(tenantId || 'GLOBAL').replace(/[^a-z0-9]/gi, '').toUpperCase();
    return (code || 'GLOBAL').slice(0, 8);
};

const rolePrefix = role => role === 'student' ? 'STU' : 'TCH';

const generateUsername = async (prisma, { role, tenantId }) => {
    if (!['student', 'teacher'].includes(role)) {
        throw new Error('Username generation is only available for students and teachers');
    }
    const base = `${rolePrefix(role)}-${normalizeSchoolCode(tenantId)}-`;
    const latest = await prisma.user.findFirst({
        where: { username: { startsWith: base } },
        select: { username: true },
        orderBy: { username: 'desc' }
    });
    const previous = Number(latest?.username?.slice(base.length)) || 0;

    for (let offset = 1; offset <= 100; offset += 1) {
        const username = `${base}${String(previous + offset).padStart(4, '0')}`;
        const exists = await prisma.user.findUnique({ where: { username }, select: { id: true } });
        if (!exists) return username;
    }
    throw new Error('Could not generate a unique username');
};

module.exports = generateUsername;
