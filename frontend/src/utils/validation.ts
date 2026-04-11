export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errors?: ValidationError[];
}

/**
 * Validates a mark entry.
 * @param score - The marks obtained.
 * @param maxMarks - The maximum possible marks.
 * @returns Validation result object.
 */
export const validateMarkEntry = (score: number | string, maxMarks: number | string): ValidationResult => {
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
 * Validates email format.
 * @param email - Email to validate.
 * @returns Validation result.
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Please provide a valid email address' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates required field.
 * @param value - Value to validate.
 * @param fieldName - Name of the field.
 * @returns Validation result.
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates string length.
 * @param value - String to validate.
 * @param minLength - Minimum length.
 * @param maxLength - Maximum length.
 * @param fieldName - Name of the field.
 * @returns Validation result.
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): ValidationResult => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, message: `${fieldName} must be a string` };
  }

  if (value.length < minLength) {
    return { isValid: false, message: `${fieldName} must be at least ${minLength} characters` };
  }

  if (value.length > maxLength) {
    return { isValid: false, message: `${fieldName} must be at most ${maxLength} characters` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates ObjectId format.
 * @param id - ID to validate.
 * @param fieldName - Name of the field.
 * @returns Validation result.
 */
export const validateObjectId = (id: string, fieldName: string = 'ID'): ValidationResult => {
  if (!id) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(id)) {
    return { isValid: false, message: `Invalid ${fieldName} format` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates phone number format.
 * @param phone - Phone number to validate.
 * @returns Validation result.
 */
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const digitsOnly = phone.replace(/\D/g, '');

  if (!phoneRegex.test(phone)) {
    return { isValid: false, message: 'Invalid phone number format' };
  }

  if (digitsOnly.length < 10) {
    return { isValid: false, message: 'Phone number must contain at least 10 digits' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates number range.
 * @param value - Number to validate.
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @param fieldName - Name of the field.
 * @returns Validation result.
 */
export const validateNumberRange = (
  value: number | string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult => {
  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { isValid: false, message: `${fieldName} must be a number` };
  }

  if (numValue < min) {
    return { isValid: false, message: `${fieldName} must be at least ${min}` };
  }

  if (numValue > max) {
    return { isValid: false, message: `${fieldName} must be at most ${max}` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates date range.
 * @param startDate - Start date.
 * @param endDate - End date.
 * @returns Validation result.
 */
export const validateDateRange = (startDate: Date | string, endDate: Date | string): ValidationResult => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { isValid: false, message: 'Invalid start date' };
  }

  if (isNaN(end.getTime())) {
    return { isValid: false, message: 'Invalid end date' };
  }

  if (start > end) {
    return { isValid: false, message: 'Start date must be before end date' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates contact message form data.
 * @param data - Contact message data.
 * @returns Validation result with errors array.
 */
export const validateContactMessage = (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  institution?: string;
  message?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // First name validation
  const firstNameResult = validateRequired(data.firstName, 'First name');
  if (!firstNameResult.isValid) {
    errors.push({ field: 'firstName', message: firstNameResult.message });
  } else {
    const lengthResult = validateLength(data.firstName!, 1, 50, 'First name');
    if (!lengthResult.isValid) {
      errors.push({ field: 'firstName', message: lengthResult.message });
    }
  }

  // Last name validation
  const lastNameResult = validateRequired(data.lastName, 'Last name');
  if (!lastNameResult.isValid) {
    errors.push({ field: 'lastName', message: lastNameResult.message });
  } else {
    const lengthResult = validateLength(data.lastName!, 1, 50, 'Last name');
    if (!lengthResult.isValid) {
      errors.push({ field: 'lastName', message: lengthResult.message });
    }
  }

  // Email validation
  const emailResult = validateEmail(data.email || '');
  if (!emailResult.isValid) {
    errors.push({ field: 'email', message: emailResult.message });
  }

  // Message validation
  const messageResult = validateRequired(data.message, 'Message');
  if (!messageResult.isValid) {
    errors.push({ field: 'message', message: messageResult.message });
  } else {
    const lengthResult = validateLength(data.message!, 10, 2000, 'Message');
    if (!lengthResult.isValid) {
      errors.push({ field: 'message', message: lengthResult.message });
    }
  }

  // Institution validation (optional)
  if (data.institution) {
    const lengthResult = validateLength(data.institution, 0, 200, 'Institution');
    if (!lengthResult.isValid) {
      errors.push({ field: 'institution', message: lengthResult.message });
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? 'Please fix the validation errors' : '',
    errors
  };
};

/**
 * Validates exam form data.
 * @param data - Exam data.
 * @returns Validation result with errors array.
 */
export const validateExam = (data: {
  name?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  classes?: string[];
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Name validation
  const nameResult = validateRequired(data.name, 'Exam name');
  if (!nameResult.isValid) {
    errors.push({ field: 'name', message: nameResult.message });
  } else {
    const lengthResult = validateLength(data.name!, 1, 100, 'Exam name');
    if (!lengthResult.isValid) {
      errors.push({ field: 'name', message: lengthResult.message });
    }
  }

  // Start date validation
  const startDateResult = validateRequired(data.startDate, 'Start date');
  if (!startDateResult.isValid) {
    errors.push({ field: 'startDate', message: startDateResult.message });
  }

  // End date validation
  const endDateResult = validateRequired(data.endDate, 'End date');
  if (!endDateResult.isValid) {
    errors.push({ field: 'endDate', message: endDateResult.message });
  }

  // Date range validation
  if (data.startDate && data.endDate) {
    const dateRangeResult = validateDateRange(data.startDate, data.endDate);
    if (!dateRangeResult.isValid) {
      errors.push({ field: 'dateRange', message: dateRangeResult.message });
    }
  }

  // Classes validation
  const classesResult = validateRequired(data.classes, 'Classes');
  if (!classesResult.isValid) {
    errors.push({ field: 'classes', message: classesResult.message });
  } else if (data.classes && data.classes.length === 0) {
    errors.push({ field: 'classes', message: 'At least one class must be selected' });
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? 'Please fix the validation errors' : '',
    errors
  };
};

/**
 * Validates a name (first name, last name).
 * Prohibits numbers and special characters unlike standard strings.
 * @param name - Name to validate.
 * @param fieldName - Name of the field.
 * @returns Validation result.
 */
export const validateName = (name: string, fieldName: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, message: `${fieldName} is required` };
  }

  // Regex: Allow letters, spaces, hyphens, and apostrophes. No numbers.
  const nameRegex = /^[a-zA-Z\s\-\']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, message: `${fieldName} must contain only letters, spaces, hyphens, or apostrophes (no numbers)` };
  }

  if (name.length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters` };
  }

  if (name.length > 50) {
    return { isValid: false, message: `${fieldName} must be at most 50 characters` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validates student form data.
 * @param data - Student data.
 * @returns Validation result with errors array.
 */
export const validateStudent = (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // First name validation
  const firstNameResult = validateName(data.firstName || '', 'First name');
  if (!firstNameResult.isValid) {
    errors.push({ field: 'firstName', message: firstNameResult.message });
  }

  // Last name validation
  const lastNameResult = validateName(data.lastName || '', 'Last name');
  if (!lastNameResult.isValid) {
    errors.push({ field: 'lastName', message: lastNameResult.message });
  }

  // Email validation
  const emailResult = validateEmail(data.email || '');
  if (!emailResult.isValid) {
    errors.push({ field: 'email', message: emailResult.message });
  }

  // Password validation (if provided)
  if (data.password) {
    const passwordResult = validateLength(data.password, 6, 100, 'Password');
    if (!passwordResult.isValid) {
      errors.push({ field: 'password', message: passwordResult.message });
    }
  }

  // Phone validation (optional but if provided should be valid)
  if (data.phone) {
    const phoneResult = validatePhone(data.phone);
    if (!phoneResult.isValid) {
      errors.push({ field: 'phone', message: phoneResult.message });
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? 'Please fix the validation errors' : '',
    errors
  };
};