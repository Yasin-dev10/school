const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: false // Optional if cross-subject or general
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'published'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
