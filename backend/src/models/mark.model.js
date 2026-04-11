const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    marksObtained: {
        type: Number,
        required: true,
        min: 0,
        validate: {
            validator: function (value) {
                // Check if maxMarks is available (document check)
                if (this.maxMarks != null) {
                    return value <= this.maxMarks;
                }
                return true;
            },
            message: 'Marks obtained cannot be greater than maximum marks'
        }
    },
    maxMarks: {
        type: Number,
        default: 100
    },
    remarks: {
        type: String,
        trim: true
    },
    grade: {
        type: String,
        trim: true
    },
    gpa: {
        type: Number,
        min: 0,
        max: 4.0
    },
    gradeRemarks: {
        type: String,
        trim: true
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure a student only has one mark record for a specific exam/subject/class
markSchema.index({ student: 1, exam: 1, subject: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
