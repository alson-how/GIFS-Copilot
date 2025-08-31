/**
 * Custom Error Classes
 * Standardized error handling across the application
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', resource = null) {
    super(message, 409, 'CONFLICT');
    this.resource = resource;
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT');
    this.retryAfter = retryAfter;
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error', originalError = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message, query = null, params = []) {
    super(message, 500, 'DATABASE_ERROR');
    this.query = query;
    this.params = params;
  }
}

/**
 * File Operation Error
 */
export class FileError extends AppError {
  constructor(message, operation = null, filePath = null) {
    super(message, 500, 'FILE_ERROR');
    this.operation = operation;
    this.filePath = filePath;
  }
}

/**
 * Business Logic Error
 */
export class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Configuration Error
 */
export class ConfigError extends AppError {
  constructor(message, configKey = null) {
    super(message, 500, 'CONFIG_ERROR');
    this.configKey = configKey;
  }
}

/**
 * Error factory functions
 */
export const ErrorFactory = {
  /**
   * Create validation error from AJV errors
   * @param {Array} ajvErrors - AJV validation errors
   * @returns {ValidationError} Validation error instance
   */
  fromAjvErrors(ajvErrors) {
    const details = ajvErrors.map(error => ({
      field: error.instancePath.replace('/', '') || error.params?.missingProperty || 'root',
      message: error.message,
      value: error.data,
      expectedType: error.schema?.type,
      constraint: error.keyword
    }));
    
    return new ValidationError('Input validation failed', details);
  },

  /**
   * Create database error from PostgreSQL error
   * @param {Error} pgError - PostgreSQL error
   * @param {string} query - SQL query that failed
   * @param {Array} params - Query parameters
   * @returns {AppError} Appropriate error type
   */
  fromDatabaseError(pgError, query = null, params = []) {
    const { message, code, detail } = pgError;
    
    // Handle specific PostgreSQL error codes
    switch (code) {
      case '23505': // unique_violation
        return new ConflictError('Resource already exists', detail);
      
      case '23503': // foreign_key_violation
        return new ValidationError('Referenced resource does not exist');
      
      case '23502': // not_null_violation
        return new ValidationError('Required field is missing');
      
      case '22P02': // invalid_text_representation (e.g., invalid UUID)
        return new ValidationError('Invalid data format');
      
      case '42P01': // undefined_table
        return new DatabaseError('Database schema error: table not found');
      
      case '42703': // undefined_column
        return new DatabaseError('Database schema error: column not found');
      
      default:
        return new DatabaseError(message, query, params);
    }
  },

  /**
   * Create external service error
   * @param {string} service - Service name
   * @param {Error} originalError - Original error from service
   * @param {Object} context - Additional context
   * @returns {ExternalServiceError} External service error
   */
  fromExternalService(service, originalError, context = {}) {
    let message = `${service} service error`;
    let statusCode = 502;
    
    // Handle HTTP errors
    if (originalError.response) {
      statusCode = originalError.response.status >= 500 ? 502 : 400;
      message = `${service} service returned ${originalError.response.status}: ${originalError.response.statusText}`;
    } else if (originalError.code === 'ECONNREFUSED') {
      message = `Cannot connect to ${service} service`;
    } else if (originalError.code === 'ETIMEDOUT') {
      message = `${service} service timeout`;
    }
    
    const error = new ExternalServiceError(service, message, originalError);
    error.statusCode = statusCode;
    error.context = context;
    return error;
  }
};

/**
 * Error classification utility
 */
export const ErrorClassifier = {
  /**
   * Check if error is operational (expected) vs programming error
   * @param {Error} error - Error to classify
   * @returns {boolean} True if operational error
   */
  isOperationalError(error) {
    if (error.isOperational !== undefined) {
      return error.isOperational;
    }
    
    // Consider these as operational errors
    const operationalErrorNames = [
      'ValidationError',
      'NotFoundError',
      'UnauthorizedError',
      'ForbiddenError',
      'ConflictError',
      'RateLimitError',
      'BusinessError'
    ];
    
    return operationalErrorNames.includes(error.name);
  },

  /**
   * Get appropriate HTTP status code from error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getStatusCode(error) {
    if (error.statusCode) {
      return error.statusCode;
    }
    
    // Default mappings
    switch (error.name) {
      case 'ValidationError':
        return 400;
      case 'UnauthorizedError':
        return 401;
      case 'ForbiddenError':
        return 403;
      case 'NotFoundError':
        return 404;
      case 'ConflictError':
        return 409;
      case 'RateLimitError':
        return 429;
      default:
        return 500;
    }
  }
};

export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  FileError,
  BusinessError,
  ConfigError,
  ErrorFactory,
  ErrorClassifier
};