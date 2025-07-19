/**
 * Secure JSON parsing utilities with validation and error handling
 */

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type AllowedType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface ParseOptions<T = unknown> {
  maxSize?: number; // Maximum size in characters
  allowedTypes?: AllowedType[];
  validator?: (data: unknown) => data is T;
}

/**
 * Safely parse JSON with validation and security checks
 */
export function safeJSONParse<T = unknown>(
  jsonString: string | null | undefined,
  options: ParseOptions<T> = {}
): T | null {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default limit
    allowedTypes = ['string', 'number', 'boolean', 'object', 'array'],
    validator
  } = options;

  // Handle null/undefined input
  if (!jsonString) {
    return null;
  }

  // Check string length to prevent DoS attacks
  if (jsonString.length > maxSize) {
    throw new SecurityError(`JSON string too large: ${jsonString.length} characters (max: ${maxSize})`);
  }

  try {
    // Parse JSON with error handling
    const parsed: unknown = JSON.parse(jsonString);
    
    // Validate type
    const dataType = Array.isArray(parsed) ? 'array' : typeof parsed;
    if (!allowedTypes.includes(dataType as AllowedType)) {
      throw new ValidationError(`Invalid data type: ${dataType}. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Run custom validator if provided
    if (validator && !validator(parsed)) {
      throw new ValidationError('Data failed custom validation');
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof SecurityError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new ValidationError(`Invalid JSON format: ${error.message}`);
    }
    
    throw new ValidationError(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Safely stringify JSON with size limits
 */
export function safeJSONStringify(
  data: unknown,
  options: { maxSize?: number } = {}
): string {
  const { maxSize = 10 * 1024 * 1024 } = options;

  try {
    const result = JSON.stringify(data);
    
    if (result.length > maxSize) {
      throw new SecurityError(`Serialized data too large: ${result.length} characters (max: ${maxSize})`);
    }
    
    return result;
  } catch (error) {
    if (error instanceof SecurityError) {
      throw error;
    }
    
    throw new ValidationError(`JSON serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that parsed data matches expected schema
 */
export function validateSchema(data: unknown, schema: {
  required?: string[];
  properties?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    maxLength?: number;
    minLength?: number;
  }>;
}): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const dataObj = data as Record<string, unknown>;

  // Check required properties
  if (schema.required) {
    for (const prop of schema.required) {
      if (!(prop in dataObj)) {
        console.warn(`Missing required property: ${prop}`);
        return false;
      }
    }
  }

  // Validate properties
  if (schema.properties) {
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      if (prop in dataObj) {
        const value = dataObj[prop];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        
        if (valueType !== propSchema.type) {
          console.warn(`Property ${prop} has wrong type: ${valueType}, expected: ${propSchema.type}`);
          return false;
        }

        // Additional string validation
        if (propSchema.type === 'string' && typeof value === 'string') {
          if (propSchema.maxLength && value.length > propSchema.maxLength) {
            console.warn(`Property ${prop} exceeds max length: ${value.length} > ${propSchema.maxLength}`);
            return false;
          }
          if (propSchema.minLength && value.length < propSchema.minLength) {
            console.warn(`Property ${prop} below min length: ${value.length} < ${propSchema.minLength}`);
            return false;
          }
        }
      } else if (propSchema.required) {
        console.warn(`Missing required property: ${prop}`);
        return false;
      }
    }
  }

  return true;
}

/**
 * Sanitize data by removing potentially dangerous properties
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData) as T;
  }

  const sanitized: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;
  
  for (const [key, value] of Object.entries(dataObj)) {
    // Skip dangerous property names
    if (key.startsWith('__') || key.includes('prototype') || key.includes('constructor')) {
      console.warn(`Skipping dangerous property: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitizeData(value);
  }

  return sanitized as T;
}
