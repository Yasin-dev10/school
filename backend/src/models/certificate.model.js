const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    certificateType: {
        type: String,
        enum: ['Academic Excellence', 'Perfect Attendance', 'Course Completion', 'Sports Achievement', 'Extra-Curricular', 'Graduation'],
        required: true
    },
    certificateNumber: {
        type: String,
        unique: true,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    issuer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        grade: String,
        academicYear: String,
        rank: Number,
        score: String,
        examType: String
    },
    status: {
        type: String,
        enum: ['active', 'revoked'],
        default: 'active'
    },
    verificationCode: {
        type: String,
        unique: true,
        required: true
    },
    isDigital: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate a unique certificate number and verification code before saving
certificateSchema.pre('validate', function (next) {
    if (!this.certificateNumber) {
        this.certificateNumber = 'CERT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    if (!this.verificationCode) {
        this.verificationCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    }
    next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
