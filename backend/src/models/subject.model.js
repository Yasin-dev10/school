const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a subject name'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'Please add a subject code'],
        trim: true
    },
    gradeLevel: {
        type: [String],
        enum: ['elementary', 'middle', 'high'],
        default: ['elementary', 'middle', 'high'],
        required: true
    },
    type: {
        type: String,
        enum: ['theory', 'practical', 'both'],
        default: 'theory'
    },
    credits: {
        type: Number,
        default: 3
    },
    description: String,
    resources: [{
        title: String,
        url: String,
        type: { type: String, enum: ['link', 'pdf', 'video', 'image'], default: 'link' },
        addedAt: { type: Date, default: Date.now }
    }],
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Ensure subject name + code is unique per tenant
subjectSchema.index({ name: 1, code: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
