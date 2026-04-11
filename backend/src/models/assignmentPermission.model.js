const mongoose = require('mongoose');

const assignmentPermissionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    canSubmit: {
        type: Boolean,
        default: true
    },
    canUpdate: {
        type: Boolean,
        default: true
    },
    canDelete: {
        type: Boolean,
        default: true
    },
    submissionDeadline: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// Compound index for efficient lookups
assignmentPermissionSchema.index({ userId: 1, assignmentId: 1 }, { unique: true });

// Method to check if deadline has passed
assignmentPermissionSchema.methods.isDeadlinePassed = function() {
    return new Date() > this.submissionDeadline;
};

// Method to check if user can perform action
assignmentPermissionSchema.methods.canPerformAction = function(action) {
    if (this.isDeadlinePassed()) {
        return false;
    }

    switch (action) {
        case 'submit':
            return this.canSubmit;
        case 'update':
            return this.canUpdate;
        case 'delete':
            return this.canDelete;
        default:
            return false;
    }
};

module.exports = mongoose.model('AssignmentPermission', assignmentPermissionSchema);