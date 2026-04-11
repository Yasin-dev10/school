const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    assignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String, // Text submission
        required: false
    },
    filePath: {
        type: String, // URL/Path to file
        required: false
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    grade: {
        type: String, // e.g., "A", "95/100", "Pass"
        required: false
    },
    feedback: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'graded', 'returned'],
        default: 'submitted'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Submission', submissionSchema);
