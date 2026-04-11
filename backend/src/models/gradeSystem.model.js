const mongoose = require('mongoose');

const gradeSystemSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    grades: [{
        grade: { type: String, required: true }, // e.g., 'A+'
        minPercentage: { type: Number, required: true }, // e.g., 90
        maxPercentage: { type: Number, required: true }, // e.g., 100
        gpa: { type: Number, required: true }, // e.g., 4.0
        remarks: String
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GradeSystem', gradeSystemSchema);
