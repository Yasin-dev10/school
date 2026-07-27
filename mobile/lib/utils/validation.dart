class ValidationError {
  final String field;
  final String message;
  final dynamic value;

  ValidationError({
    required this.field,
    required this.message,
    this.value,
  });

  Map<String, dynamic> toJson() {
    return {
      'field': field,
      'message': message,
      if (value != null) 'value': value,
    };
  }
}

class ValidationResult {
  final bool isValid;
  final String message;
  final List<ValidationError>? errors;

  ValidationResult({
    required this.isValid,
    required this.message,
    this.errors,
  });

  Map<String, dynamic> toJson() {
    return {
      'isValid': isValid,
      'message': message,
      if (errors != null) 'errors': errors!.map((e) => e.toJson()).toList(),
    };
  }
}

class ValidationUtils {
  /// Validates a mark entry.
  static ValidationResult validateMarkEntry(
    dynamic score,
    dynamic maxMarks,
  ) {
    if (score == null || score.toString().isEmpty) {
      return ValidationResult(
        isValid: false,
        message: 'Score is required',
      );
    }

    double? marksObtained = double.tryParse(score.toString());
    double? max = double.tryParse(maxMarks.toString());

    if (marksObtained == null) {
      return ValidationResult(
        isValid: false,
        message: 'Score must be a number',
      );
    }

    if (marksObtained < 0) {
      return ValidationResult(
        isValid: false,
        message: 'Score cannot be negative',
      );
    }

    if (max != null && marksObtained > max) {
      return ValidationResult(
        isValid: false,
        message: 'Score ($marksObtained) cannot exceed max marks ($max)',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates email format.
  static ValidationResult validateEmail(String? email) {
    if (email == null || email.trim().isEmpty) {
      return ValidationResult(
        isValid: false,
        message: 'Email is required',
      );
    }

    final emailRegex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!emailRegex.hasMatch(email)) {
      return ValidationResult(
        isValid: false,
        message: 'Please provide a valid email address',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates required field.
  static ValidationResult validateRequired(
    dynamic value,
    String fieldName,
  ) {
    if (value == null ||
        value.toString().isEmpty ||
        (value is List && value.isEmpty)) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName is required',
      );
    }
    return ValidationResult(isValid: true, message: '');
  }

  /// Validates string length.
  static ValidationResult validateLength(
    String? value,
    int minLength,
    int maxLength,
    String fieldName,
  ) {
    if (value == null || value.isEmpty) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be a string',
      );
    }

    if (value.length < minLength) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be at least $minLength characters',
      );
    }

    if (value.length > maxLength) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be at most $maxLength characters',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates ObjectId format.
  static ValidationResult validateObjectId(
    String? id, [
    String fieldName = 'ID',
  ]) {
    if (id == null || id.isEmpty) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName is required',
      );
    }

    final objectIdPattern = RegExp(r'^[0-9a-fA-F]{24}$');
    if (!objectIdPattern.hasMatch(id)) {
      return ValidationResult(
        isValid: false,
        message: 'Invalid $fieldName format',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates phone number format.
  static ValidationResult validatePhone(String? phone) {
    if (phone == null || phone.isEmpty) {
      return ValidationResult(
        isValid: false,
        message: 'Phone number is required',
      );
    }

    final phoneRegex = RegExp(r'^[\d\s\-\+\(\)]+$');
    final digitsOnly = phone.replaceAll(RegExp(r'\D'), '');

    if (!phoneRegex.hasMatch(phone)) {
      return ValidationResult(
        isValid: false,
        message: 'Invalid phone number format',
      );
    }

    if (digitsOnly.length < 10) {
      return ValidationResult(
        isValid: false,
        message: 'Phone number must contain at least 10 digits',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates number range.
  static ValidationResult validateNumberRange(
    dynamic value,
    double min,
    double max,
    String fieldName,
  ) {
    final numValue = double.tryParse(value.toString());

    if (numValue == null) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be a number',
      );
    }

    if (numValue < min) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be at least $min',
      );
    }

    if (numValue > max) {
      return ValidationResult(
        isValid: false,
        message: '$fieldName must be at most $max',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates date range.
  static ValidationResult validateDateRange(
    DateTime? startDate,
    DateTime? endDate,
  ) {
    if (startDate == null) {
      return ValidationResult(
        isValid: false,
        message: 'Invalid start date',
      );
    }

    if (endDate == null) {
      return ValidationResult(
        isValid: false,
        message: 'Invalid end date',
      );
    }

    if (startDate.isAfter(endDate)) {
      return ValidationResult(
        isValid: false,
        message: 'Start date must be before end date',
      );
    }

    return ValidationResult(isValid: true, message: '');
  }

  /// Validates contact message form data.
  static ValidationResult validateContactMessage({
    String? firstName,
    String? lastName,
    String? email,
    String? institution,
    String? message,
  }) {
    final errors = <ValidationError>[];

    // First name validation
    final firstNameResult = validateRequired(firstName, 'First name');
    if (!firstNameResult.isValid) {
      errors.add(ValidationError(
        field: 'firstName',
        message: firstNameResult.message,
      ));
    } else {
      final lengthResult = validateLength(firstName, 1, 50, 'First name');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'firstName',
          message: lengthResult.message,
        ));
      }
    }

    // Last name validation
    final lastNameResult = validateRequired(lastName, 'Last name');
    if (!lastNameResult.isValid) {
      errors.add(ValidationError(
        field: 'lastName',
        message: lastNameResult.message,
      ));
    } else {
      final lengthResult = validateLength(lastName, 1, 50, 'Last name');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'lastName',
          message: lengthResult.message,
        ));
      }
    }

    // Email validation
    final emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      errors.add(ValidationError(
        field: 'email',
        message: emailResult.message,
      ));
    }

    // Message validation
    final messageResult = validateRequired(message, 'Message');
    if (!messageResult.isValid) {
      errors.add(ValidationError(
        field: 'message',
        message: messageResult.message,
      ));
    } else {
      final lengthResult = validateLength(message, 10, 2000, 'Message');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'message',
          message: lengthResult.message,
        ));
      }
    }

    // Institution validation (optional)
    if (institution != null && institution.isNotEmpty) {
      final lengthResult = validateLength(institution, 0, 200, 'Institution');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'institution',
          message: lengthResult.message,
        ));
      }
    }

    return ValidationResult(
      isValid: errors.isEmpty,
      message: errors.isEmpty ? '' : 'Please fix the validation errors',
      errors: errors.isEmpty ? null : errors,
    );
  }

  /// Validates exam form data.
  static ValidationResult validateExam({
    String? name,
    DateTime? startDate,
    DateTime? endDate,
    List<String>? classes,
  }) {
    final errors = <ValidationError>[];

    // Name validation
    final nameResult = validateRequired(name, 'Exam name');
    if (!nameResult.isValid) {
      errors.add(ValidationError(
        field: 'name',
        message: nameResult.message,
      ));
    } else {
      final lengthResult = validateLength(name, 1, 100, 'Exam name');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'name',
          message: lengthResult.message,
        ));
      }
    }

    // Start date validation
    final startDateResult = validateRequired(startDate, 'Start date');
    if (!startDateResult.isValid) {
      errors.add(ValidationError(
        field: 'startDate',
        message: startDateResult.message,
      ));
    }

    // End date validation
    final endDateResult = validateRequired(endDate, 'End date');
    if (!endDateResult.isValid) {
      errors.add(ValidationError(
        field: 'endDate',
        message: endDateResult.message,
      ));
    }

    // Date range validation
    if (startDate != null && endDate != null) {
      final dateRangeResult = validateDateRange(startDate, endDate);
      if (!dateRangeResult.isValid) {
        errors.add(ValidationError(
          field: 'dateRange',
          message: dateRangeResult.message,
        ));
      }
    }

    // Classes validation
    final classesResult = validateRequired(classes, 'Classes');
    if (!classesResult.isValid) {
      errors.add(ValidationError(
        field: 'classes',
        message: classesResult.message,
      ));
    } else if (classes != null && classes.isEmpty) {
      errors.add(ValidationError(
        field: 'classes',
        message: 'At least one class must be selected',
      ));
    }

    return ValidationResult(
      isValid: errors.isEmpty,
      message: errors.isEmpty ? '' : 'Please fix the validation errors',
      errors: errors.isEmpty ? null : errors,
    );
  }

  /// Validates student form data.
  static ValidationResult validateStudent({
    String? firstName,
    String? lastName,
    String? email,
    String? password,
  }) {
    final errors = <ValidationError>[];

    // First name validation
    final firstNameResult = validateRequired(firstName, 'First name');
    if (!firstNameResult.isValid) {
      errors.add(ValidationError(
        field: 'firstName',
        message: firstNameResult.message,
      ));
    } else {
      final lengthResult = validateLength(firstName, 1, 50, 'First name');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'firstName',
          message: lengthResult.message,
        ));
      }
    }

    // Last name validation
    final lastNameResult = validateRequired(lastName, 'Last name');
    if (!lastNameResult.isValid) {
      errors.add(ValidationError(
        field: 'lastName',
        message: lastNameResult.message,
      ));
    } else {
      final lengthResult = validateLength(lastName, 1, 50, 'Last name');
      if (!lengthResult.isValid) {
        errors.add(ValidationError(
          field: 'lastName',
          message: lengthResult.message,
        ));
      }
    }

    // Email validation
    final emailResult = validateEmail(email);
    if (!emailResult.isValid) {
      errors.add(ValidationError(
        field: 'email',
        message: emailResult.message,
      ));
    }

    // Password validation (if provided)
    if (password != null && password.isNotEmpty) {
      final passwordResult = validateLength(password, 6, 100, 'Password');
      if (!passwordResult.isValid) {
        errors.add(ValidationError(
          field: 'password',
          message: passwordResult.message,
        ));
      }
    }

    return ValidationResult(
      isValid: errors.isEmpty,
      message: errors.isEmpty ? '' : 'Please fix the validation errors',
      errors: errors.isEmpty ? null : errors,
    );
  }
}
