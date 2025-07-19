/**
 * Input validation utilities for security and data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string | number;
}

/**
 * Sanitize and validate text input
 */
export function validateTextInput(
  value: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    customValidator?: (value: string) => boolean;
    sanitize?: boolean;
  } = {}
): ValidationResult {
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    pattern,
    customValidator,
    sanitize = true
  } = options;

  let sanitizedValue = value;

  // Sanitize input if requested
  if (sanitize) {
    sanitizedValue = value
      .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters  
      .replace(/\p{Cc}/gu, '') // Remove control characters (Unicode category)
      .trim();
  }

  // Check if required
  if (required && (!sanitizedValue || sanitizedValue.length === 0)) {
    return {
      isValid: false,
      error: 'This field is required',
      sanitizedValue
    };
  }

  // Check length constraints
  if (sanitizedValue.length < minLength) {
    return {
      isValid: false,
      error: `Minimum length is ${minLength} characters`,
      sanitizedValue
    };
  }

  if (sanitizedValue.length > maxLength) {
    return {
      isValid: false,
      error: `Maximum length is ${maxLength} characters`,
      sanitizedValue
    };
  }

  // Check pattern if provided
  if (pattern && !pattern.test(sanitizedValue)) {
    return {
      isValid: false,
      error: 'Invalid format',
      sanitizedValue
    };
  }

  // Run custom validator if provided
  if (customValidator && !customValidator(sanitizedValue)) {
    return {
      isValid: false,
      error: 'Invalid value',
      sanitizedValue
    };
  }

  return {
    isValid: true,
    sanitizedValue
  };
}

/**
 * Validate numeric input with range checking
 */
export function validateNumericInput(
  value: string | number,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    customValidator?: (value: number) => boolean;
  } = {}
): ValidationResult {
  const {
    required = false,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    integer = false,
    customValidator
  } = options;

  const stringValue = typeof value === 'string' ? value.trim() : value.toString();

  // Check if required
  if (required && (!stringValue || stringValue === '')) {
    return {
      isValid: false,
      error: 'This field is required'
    };
  }

  // Parse number
  const numericValue = integer ? parseInt(stringValue, 10) : parseFloat(stringValue);

  // Check if valid number
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return {
      isValid: false,
      error: 'Please enter a valid number'
    };
  }

  // Check range
  if (numericValue < min) {
    return {
      isValid: false,
      error: `Value must be at least ${min}`,
      sanitizedValue: min
    };
  }

  if (numericValue > max) {
    return {
      isValid: false,
      error: `Value must be at most ${max}`,
      sanitizedValue: max
    };
  }

  // Run custom validator if provided
  if (customValidator && !customValidator(numericValue)) {
    return {
      isValid: false,
      error: 'Invalid value',
      sanitizedValue: numericValue
    };
  }

  return {
    isValid: true,
    sanitizedValue: numericValue
  };
}

/**
 * Validate BPM specifically
 */
export function validateBpm(value: string | number): ValidationResult {
  return validateNumericInput(value, {
    required: true,
    min: 40,
    max: 300,
    integer: true,
    customValidator: (bpm) => {
      // Additional BPM-specific validation
      return bpm >= 40 && bpm <= 300 && Number.isInteger(bpm);
    }
  });
}

/**
 * Validate song name
 */
export function validateSongName(name: string, existingNames: string[] = []): ValidationResult {
  const result = validateTextInput(name, {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_.()[\]]+$/, // Allow alphanumeric, spaces, and common symbols
    sanitize: true
  });

  if (!result.isValid) {
    return result;
  }

  // Check for duplicates
  const sanitizedName = result.sanitizedValue as string;
  if (existingNames.some(existing => existing.toLowerCase() === sanitizedName.toLowerCase())) {
    return {
      isValid: false,
      error: 'A song with this name already exists',
      sanitizedValue: sanitizedName
    };
  }

  return result;
}

/**
 * Validate progression name
 */
export function validateProgressionName(name: string, existingNames: string[] = []): ValidationResult {
  const result = validateTextInput(name, {
    required: true,
    minLength: 1,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9\s\-_.()[\]]+$/,
    sanitize: true
  });

  if (!result.isValid) {
    return result;
  }

  // Check for duplicates
  const sanitizedName = result.sanitizedValue as string;
  if (existingNames.some(existing => existing.toLowerCase() === sanitizedName.toLowerCase())) {
    return {
      isValid: false,
      error: 'A progression with this name already exists',
      sanitizedValue: sanitizedName
    };
  }

  return result;
}

/**
 * Validate chord name
 */
export function validateChordName(name: string): ValidationResult {
  return validateTextInput(name, {
    required: true,
    minLength: 1,
    maxLength: 10,
    pattern: /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|[0-9])*$/,
    sanitize: true,
    customValidator: (value) => {
      // Basic chord validation - starts with note, followed by optional modifiers
      return /^[A-G]/.test(value);
    }
  });
}

/**
 * Validate file names for exports/imports
 */
export function validateFileName(name: string): ValidationResult {
  return validateTextInput(name, {
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.()[\]]+$/, // No path separators or dangerous characters
    sanitize: true,
    customValidator: (value) => {
      // Ensure it doesn't start with dots or contain dangerous patterns
      return !value.startsWith('.') && !value.includes('..') && !value.includes('/') && !value.includes('\\');
    }
  });
}
