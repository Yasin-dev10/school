const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SUSPEND', 'ACTIVATE']
    },
    module: {
        type: String,
        required: true,
        enum: ['TENANT', 'USER', 'AUTH', 'SUBSCRIPTION']
    },
    details: String,
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tenantId: {
        type: String,
        index: true
    },
    ipAddress: String,
    userAgent: String
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
