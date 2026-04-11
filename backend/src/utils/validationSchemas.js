/**
 * Validation schemas for different entities
 */

// Contact Message Schema
const contactMessageSchema = {
    firstName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50,
        message: 'First name is required'
    },
    lastName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50,
        message: 'Last name is required'
    },
    email: {
        type: 'string',
        required: true,
        email: true,
        message: 'Valid email is required'
    },
    institution: {
        type: 'string',
        required: false,
        maxLength: 200
    },
    message: {
        type: 'string',
        required: true,
        minLength: 10,
        maxLength: 2000,
        message: 'Message must be between 10 and 2000 characters'
    },
    role: {
        type: 'string',
        required: false,
        maxLength: 50
    }
};

// Student Schema
const studentSchema = {
    firstName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50
    },
    lastName: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 50
    },
    email: {
        type: 'string',
        required: true,
        email: true
    },
    password: {
        type: 'string',
        required: false,
        minLength: 6
    }
};

// Exam Schema
const examSchema = {
    name: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100
    },
    startDate: {
        type: 'date',
        required: true
    },
    endDate: {
        type: 'date',
        required: true
    },
    classes: {
        type: 'array',
        required: true,
        minItems: 1
    }
};

// Mark Entry Schema
const markEntrySchema = {
    examId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid exam ID format';
        }
    },
    subjectId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid subject ID format';
        }
    },
    classId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid class ID format';
        }
    },
    marks: {
        type: 'array',
        required: true,
        minItems: 1
    },
    maxMarks: {
        type: 'number',
        required: true,
        min: 0
    }
};

// Bulk Mark Entry Schema
const bulkMarkEntrySchema = {
    examId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid exam ID format';
        }
    },
    subjectId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid subject ID format';
        }
    },
    classId: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid class ID format';
        }
    },
    marks: {
        type: 'array',
        required: true,
        minItems: 1
    },
    maxMarks: {
        type: 'number',
        required: true,
        min: 0
    }
};

// Fee Payment Schema
const feePaymentSchema = {
    amount: {
        type: 'number',
        required: true,
        min: 0.01
    },
    paymentMethod: {
        type: 'string',
        required: true
    },
    transactionId: {
        type: 'string',
        required: false
    }
};

// Timetable Schema
const timetableSchema = {
    class: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid class ID format';
        }
    },
    subject: {
        type: 'string',
        required: true,
        custom: (value) => {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            return objectIdPattern.test(value) || 'Invalid subject ID format';
        }
    },
    startTime: {
        type: 'string',
        required: true,
        pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        patternMessage: 'Time must be in HH:MM format'
    },
    endTime: {
        type: 'string',
        required: true,
        pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        patternMessage: 'Time must be in HH:MM format'
    },
    day: {
        type: 'string',
        required: true
    }
};

module.exports = {
    contactMessageSchema,
    studentSchema,
    examSchema,
    markEntrySchema,
    bulkMarkEntrySchema,
    feePaymentSchema,
    timetableSchema
};
