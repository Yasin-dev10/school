const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add an exam name'],
        trim: true
    },
    term: {
        type: String,
        required: true,
        enum: ['First Term', 'Mid Term', 'Final Term', 'Unit Test', 'Monthly Test']
    },
    classes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
    }],
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvalDate: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);
