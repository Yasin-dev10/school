const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined if some don't have subdomains
    },
    config: {
        academicYear: String,
        gradingSystem: { type: String, default: 'GPA' },
        currency: { type: String, default: 'USD' },
        timezone: { type: String, default: 'UTC' },
        logoUrl: String,
        primaryColor: { type: String, default: '#4f46e5' },
        secondaryColor: { type: String, default: '#1e293b' },
        address: String,
        contactEmail: String,
        contactPhone: String,
        vision: String,
        mission: String,
        gradeLevels: {
            type: [String],
            enum: ['elementary', 'middle', 'high'],
            default: ['elementary', 'middle', 'high']
        }
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    subscription: {
        plan: { type: String, default: 'basic' },
        validUntil: Date,
        isActive: { type: Boolean, default: true }
    },
    superAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Tenant', tenantSchema);
