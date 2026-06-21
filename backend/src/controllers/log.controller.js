const prisma = require('../config/prismaClient');

// @desc    Get all audit logs
exports.getAuditLogs = async (req, res) => {
    try {
        let where = {};
        if (req.user.role !== 'super-admin') {
            where.tenantId = req.user.tenantId;
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                performedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
