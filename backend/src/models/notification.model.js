const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['announcement', 'alert', 'fee_reminder', 'attendance_alert'],
        default: 'announcement'
    },
    channels: [{
        type: String,
        enum: ['in-app', 'sms', 'email']
    }],
    targetRole: {
        type: String,
        enum: ['all', 'student', 'teacher', 'parent'],
        default: 'all'
    },
    targetClass: {
        type: String, // Optional: if targeting a specific class
        default: null
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['sent', 'pending', 'failed'],
        default: 'sent'
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
