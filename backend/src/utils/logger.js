const prisma = require('../config/prismaClient');

/**
 * Log a system action
 */
exports.logAction = async (logData) => {
    try {
        await prisma.auditLog.create({
            data: {
                action: logData.action,
                module: logData.module,
                details: logData.details || null,
                performedById: logData.userId || null,
                tenantId: logData.tenantId || 'platform',
                ipAddress: logData.ip || '',
                userAgent: logData.userAgent || ''
            }
        });
    } catch (error) {
        console.error('Audit Log Error:', error);
        // Don't throw — avoid breaking main transaction
    }
};
