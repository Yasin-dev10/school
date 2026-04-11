/**
 * Validation utility functions
 */

/**
 * Validates a mark entry.
 * @param {number} score - The marks obtained.
 * @param {number} maxMarks - The maximum possible marks.
 * @returns {object} - { isValid: boolean, message: string }
 */
const validateMarkEntry = (score, maxMarks) => {
    if (score === undefined || score === null || score === '') {
        return { isValid: false, message: 'Score is required' };
    }

    const marksObtained = Number(score);
    const max = Number(maxMarks);

    if (isNaN(marksObtained)) {
        return { isValid: false, message: 'Score must be a number' };
    }

    if (marksObtained < 0) {
        return { isValid: false, message: 'Score cannot be negative' };
    }

    if (marksObtained > max) {
        return { isValid: false, message: `Score (${marksObtained}) cannot exceed max marks (${max})` };
    }

    return { isValid: true, message: '' };
};

/**
 * Generic validation middleware factory
 * @param {object} schema - Validation schema with field rules
 * @returns {function} Express middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];
        const data = req.body;

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            const fieldErrors = validateField(field, value, rules);
            errors.push(...fieldErrors);
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};

/**
 * Validate query parameters
 * @param {object} schema - Validation schema with field rules
 * @returns {function} Express middleware
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const errors = [];
        const data = req.query;

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            const fieldErrors = validateField(field, value, rules);
            errors.push(...fieldErrors);
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Query validation failed',
                errors
            });
        }

        next();
    };
};

/**
 * Validate a single field based on rules
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {object} rules - Validation rules
 * @returns {array} Array of error objects
 */
const validateField = (field, value, rules) => {
    const errors = [];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
            field,
            message: rules.message || `${field} is required`,
            value
        });
        return errors; // Stop validation if required field is missing
    }

    // Skip other validations if field is optional and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
        return errors;
    }

    // Type validation
    if (rules.type) {
        const typeErrors = validateType(field, value, rules.type);
        if (typeErrors.length > 0) {
            errors.push(...typeErrors);
            return errors; // Stop if type is wrong
        }
    }

    // String validations
    if (rules.type === 'string' || typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            errors.push({
                field,
                message: rules.minLengthMessage || `${field} must be at least ${rules.minLength} characters`,
                value
            });
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
                field,
                message: rules.maxLengthMessage || `${field} must be at most ${rules.maxLength} characters`,
                value
            });
        }
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
                field,
                message: rules.patternMessage || `${field} format is invalid`,
                value
            });
        }
    }

    // Number validations
    if (rules.type === 'number' || typeof value === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            errors.push({
                field,
                message: `${field} must be a number`,
                value
            });
        } else {
            if (rules.min !== undefined && numValue < rules.min) {
                errors.push({
                    field,
                    message: rules.minMessage || `${field} must be at least ${rules.min}`,
                    value
                });
            }
            if (rules.max !== undefined && numValue > rules.max) {
                errors.push({
                    field,
                    message: rules.maxMessage || `${field} must be at most ${rules.max}`,
                    value
                });
            }
        }
    }

    // Email validation
    if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            errors.push({
                field,
                message: rules.emailMessage || `${field} must be a valid email address`,
                value
            });
        }
    }

    // Array validation
    if (rules.type === 'array' || Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
            errors.push({
                field,
                message: rules.minItemsMessage || `${field} must have at least ${rules.minItems} items`,
                value
            });
        }
        if (rules.maxItems && value.length > rules.maxItems) {
            errors.push({
                field,
                message: rules.maxItemsMessage || `${field} must have at most ${rules.maxItems} items`,
                value
            });
        }
    }

    // Custom validation function
    if (rules.custom && typeof rules.custom === 'function') {
        const customResult = rules.custom(value);
        if (customResult !== true) {
            errors.push({
                field,
                message: typeof customResult === 'string' ? customResult : `${field} validation failed`,
                value
            });
        }
    }

    return errors;
};

/**
 * Validate data type
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {string} expectedType - Expected type
 * @returns {array} Array of error objects
 */
const validateType = (field, value, expectedType) => {
    const errors = [];
    let isValid = false;

    switch (expectedType) {
        case 'string':
            isValid = typeof value === 'string';
            break;
        case 'number':
            isValid = typeof value === 'number' || !isNaN(Number(value));
            break;
        case 'boolean':
            isValid = typeof value === 'boolean' || value === 'true' || value === 'false';
            break;
        case 'array':
            isValid = Array.isArray(value);
            break;
        case 'object':
            isValid = typeof value === 'object' && value !== null && !Array.isArray(value);
            break;
        case 'date':
            isValid = value instanceof Date || !isNaN(Date.parse(value));
            break;
        case 'email':
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            break;
        default:
            isValid = true;
    }

    if (!isValid) {
        errors.push({
            field,
            message: `${field} must be of type ${expectedType}`,
            value
        });
    }

    return errors;
};

/**
 * Validate ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidObjectId = (id) => {
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    return objectIdPattern.test(id);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
const isValidPhone = (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

module.exports = {
    validateMarkEntry,
    validate,
    validateQuery,
    validateField,
    isValidObjectId,
    isValidEmail,
    isValidPhone
};