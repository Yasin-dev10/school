const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['note', 'video', 'link', 'file'],
        default: 'note'
    },
    content: {
        type: String, // Can store text content for notes or URLs for videos/links
    },
    fileUrl: {
        type: String, // For uploaded files
    },
    class: {
        type: mongoose.Schema.ObjectId,
        ref: 'Class',
        required: true
    },
    subject: {
        type: mongoose.Schema.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacher: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    visibleToStudents: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Material', materialSchema);
