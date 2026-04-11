const mongoose = require('mongoose');

const permissionConditionSchema = new mongoose.Schema({
    field: {
        type: String,
        required: true
    },
    operator: {
        type: String,
        enum: ['equals', 'not_equals', 'in', 'not_in'],
        required: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, { _id: false });

const permissionSchema = new mongoose.Schema({
    resource: {
        type: String,
        required: true,
        enum: [
            'profile',
            'grades',
            'attendance',
            'assignments',
            'schedules',
            'materials',
            'users',
            'classes',
            'subjects',
            'exams',
            'fees',
            'notifications'
        ]
    },
    action: {
        type: String,
        required: true,
        enum: ['create', 'read', 'update', 'delete']
    },
    conditions: [permissionConditionSchema]
}, {
    timestamps: true
});

// Compound index for efficient permission lookups
permissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('Permission', permissionSchema);