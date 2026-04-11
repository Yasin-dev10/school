const { validate, validateQuery } = require('../utils/validation');

// Custom validation middleware for specific use cases
const customValidations = {
    // Validate ObjectId parameters
    validateObjectId: (paramName = 'id') => {
        return (req, res, next) => {
            const id = req.params[paramName];
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            
            if (!id || !objectIdPattern.test(id)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ${paramName} format`,
                    errors: [{
                        field: paramName,
                        message: `${paramName} must be a valid ObjectId`,
                        value: id
                    }]
                });
            }
            
            next();
        };
    },

    // Validate date ranges
    validateDateRange: (req, res, next) => {
        const { startDate, endDate } = req.query;
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date range',
                    errors: [{
                        field: 'dateRange',
                        message: 'Start date must be before end date',
                        value: { startDate, endDate }
                    }]
                });
            }
        }
        
        next();
    },

    // Validate file uploads
    validateFileUpload: (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
        return (req, res, next) => {
            if (!req.files || req.files.length === 0) {
                return next();
            }

            const errors = [];

            req.files.forEach((file, index) => {
                // Check file type
                if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                    errors.push({
                        field: `files[${index}]`,
                        message: `File type ${file.mimetype} is not allowed`,
                        value: file.originalname
                    });
                }

                // Check file size
                if (file.size > maxSize) {
                    errors.push({
                        field: `files[${index}]`,
                        message: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
                        value: file.originalname
                    });
                }
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'File validation failed',
                    errors
                });
            }

            next();
        };
    },

    // Validate academic year format
    validateAcademicYear: (req, res, next) => {
        const { academicYear } = req.body;
        
        if (academicYear) {
            const yearPattern = /^\d{4}-\d{4}$/;
            if (!yearPattern.test(academicYear)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid academic year format',
                    errors: [{
                        field: 'academicYear',
                        message: 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)',
                        value: academicYear
                    }]
                });
            }

            const [startYear, endYear] = academicYear.split('-').map(Number);
            if (endYear !== startYear + 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid academic year',
                    errors: [{
                        field: 'academicYear',
                        message: 'End year must be exactly one year after start year',
                        value: academicYear
                    }]
                });
            }
        }
        
        next();
    },

    // Validate time format and range
    validateTimeSlot: (req, res, next) => {
        const { startTime, endTime } = req.body;
        
        if (startTime && endTime) {
            const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            
            if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid time format',
                    errors: [{
                        field: 'timeSlot',
                        message: 'Time must be in HH:MM format',
                        value: { startTime, endTime }
                    }]
                });
            }

            const start = new Date(`2000-01-01T${startTime}:00`);
            const end = new Date(`2000-01-01T${endTime}:00`);
            
            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid time range',
                    errors: [{
                        field: 'timeSlot',
                        message: 'Start time must be before end time',
                        value: { startTime, endTime }
                    }]
                });
            }
        }
        
        next();
    },

    // Validate marks entry
    validateMarks: (req, res, next) => {
        const { marks, maxMarks } = req.body;
        
        if (marks && maxMarks) {
            const errors = [];
            
            marks.forEach((mark, index) => {
                if (mark.marksObtained > maxMarks) {
                    errors.push({
                        field: `marks[${index}].marksObtained`,
                        message: 'Marks obtained cannot exceed maximum marks',
                        value: mark.marksObtained
                    });
                }
                
                if (mark.marksObtained < 0) {
                    errors.push({
                        field: `marks[${index}].marksObtained`,
                        message: 'Marks cannot be negative',
                        value: mark.marksObtained
                    });
                }
            });
            
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Marks validation failed',
                    errors
                });
            }
        }
        
        next();
    },

    // Validate fee payment
    validatePayment: (req, res, next) => {
        const { amount, paymentMethod, transactionId } = req.body;
        
        const errors = [];
        
        if (amount <= 0) {
            errors.push({
                field: 'amount',
                message: 'Payment amount must be positive',
                value: amount
            });
        }
        
        if (['card', 'bank-transfer', 'online'].includes(paymentMethod) && !transactionId) {
            errors.push({
                field: 'transactionId',
                message: 'Transaction ID is required for electronic payments',
                value: transactionId
            });
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment validation failed',
                errors
            });
        }
        
        next();
    },

    // Validate bulk operations
    validateBulkOperation: (maxItems = 100) => {
        return (req, res, next) => {
            const items = req.body.items || req.body.students || req.body.data || [];
            
            if (!Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: 'Bulk operation requires an array of items',
                    errors: [{
                        field: 'items',
                        message: 'Items must be an array',
                        value: typeof items
                    }]
                });
            }
            
            if (items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bulk operation requires at least one item',
                    errors: [{
                        field: 'items',
                        message: 'Items array cannot be empty',
                        value: items.length
                    }]
                });
            }
            
            if (items.length > maxItems) {
                return res.status(400).json({
                    success: false,
                    message: `Bulk operation exceeds maximum limit of ${maxItems} items`,
                    errors: [{
                        field: 'items',
                        message: `Maximum ${maxItems} items allowed per operation`,
                        value: items.length
                    }]
                });
            }
            
            next();
        };
    }
};

// Error handler for validation errors
const handleValidationError = (error, req, res, next) => {
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }
    
    next(error);
};

module.exports = {
    validate,
    validateQuery,
    ...customValidations,
    handleValidationError
};