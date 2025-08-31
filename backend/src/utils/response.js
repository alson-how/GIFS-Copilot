/**
 * Standardized Response Utilities
 * Consistent API response formatting and error handling
 */

import { logger } from './logger.js';

/**
 * Standard API response wrapper
 */
export class ApiResponse {
  constructor(success = true, data = null, message = null, errors = []) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Create success response
   * @param {*} data - Response data
   * @param {string} message - Optional success message
   * @returns {ApiResponse} Success response
   */
  static success(data = null, message = null) {
    return new ApiResponse(true, data, message);
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {Array} errors - Detailed error array
   * @param {*} data - Optional error data
   * @returns {ApiResponse} Error response
   */
  static error(message, errors = [], data = null) {
    return new ApiResponse(false, data, message, errors);
  }

  /**
   * Create validation error response
   * @param {Array} validationErrors - Validation error details
   * @returns {ApiResponse} Validation error response
   */
  static validationError(validationErrors) {
    return new ApiResponse(
      false,
      null,
      'Validation failed',
      validationErrors
    );
  }

  /**
   * Create not found error response
   * @param {string} resource - Resource that was not found
   * @returns {ApiResponse} Not found error response
   */
  static notFound(resource = 'Resource') {
    return new ApiResponse(
      false,
      null,
      `${resource} not found`,
      []
    );
  }

  /**
   * Create unauthorized error response
   * @returns {ApiResponse} Unauthorized error response
   */
  static unauthorized() {
    return new ApiResponse(
      false,
      null,
      'Unauthorized access',
      []
    );
  }

  /**
   * Create internal server error response
   * @param {string} message - Optional custom error message
   * @returns {ApiResponse} Server error response
   */
  static serverError(message = 'Internal server error') {
    return new ApiResponse(
      false,
      null,
      message,
      []
    );
  }
}

/**
 * Response handler middleware and utilities
 */
export class ResponseHandler {
  /**
   * Send success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = null, statusCode = 200) {
    const response = ApiResponse.success(data, message);
    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    this.success(res, data, message, 201);
  }

  /**
   * Send error response with appropriate logging
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} customMessage - Custom error message
   * @param {number} statusCode - HTTP status code
   */
  static error(res, error, customMessage = null, statusCode = 500) {
    const message = customMessage || error.message || 'An error occurred';
    
    // Log the error with context
    logger.error('API Error', {
      message,
      originalError: error.message,
      stack: error.stack,
      statusCode
    });

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    const responseMessage = isProduction && statusCode >= 500 
      ? 'Internal server error' 
      : message;

    const response = ApiResponse.error(responseMessage);
    res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   * @param {Object} res - Express response object
   * @param {Array} validationErrors - Array of validation errors
   */
  static validationError(res, validationErrors) {
    const response = ApiResponse.validationError(validationErrors);
    res.status(400).json(response);
  }

  /**
   * Send not found response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   */
  static notFound(res, resource = 'Resource') {
    const response = ApiResponse.notFound(resource);
    res.status(404).json(response);
  }

  /**
   * Send unauthorized response
   * @param {Object} res - Express response object
   */
  static unauthorized(res) {
    const response = ApiResponse.unauthorized();
    res.status(401).json(response);
  }

  /**
   * Send database error response
   * @param {Object} res - Express response object
   * @param {Error} error - Database error
   */
  static databaseError(res, error) {
    // Handle specific database errors
    if (error.message.includes('invalid input syntax for type uuid')) {
      return this.validationError(res, [{
        field: 'id',
        message: 'Invalid ID format'
      }]);
    }

    if (error.message.includes('duplicate key value')) {
      return this.error(res, error, 'Resource already exists', 409);
    }

    if (error.message.includes('foreign key constraint')) {
      return this.error(res, error, 'Referenced resource does not exist', 400);
    }

    // Generic database error
    this.error(res, error, 'Database operation failed');
  }
}

/**
 * Express middleware for handling async route errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function globalErrorHandler(err, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle different error types
  if (err.name === 'ValidationError') {
    return ResponseHandler.validationError(res, err.details);
  }

  if (err.name === 'DatabaseError') {
    return ResponseHandler.databaseError(res, err);
  }

  if (err.status === 404) {
    return ResponseHandler.notFound(res);
  }

  if (err.status === 401) {
    return ResponseHandler.unauthorized(res);
  }

  // Default server error
  ResponseHandler.error(res, err);
}

/**
 * Pagination utilities
 */
export class PaginationHelper {
  /**
   * Create pagination metadata
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total items count
   * @returns {Object} Pagination metadata
   */
  static createMeta(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    };
  }

  /**
   * Create paginated response
   * @param {Array} items - Array of items for current page
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total items count
   * @returns {Object} Paginated response data
   */
  static createResponse(items, page, limit, total) {
    return {
      items,
      pagination: this.createMeta(page, limit, total)
    };
  }

  /**
   * Calculate offset for SQL queries
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {number} SQL OFFSET value
   */
  static calculateOffset(page, limit) {
    return (page - 1) * limit;
  }
}

export default {
  ApiResponse,
  ResponseHandler,
  asyncHandler,
  globalErrorHandler,
  PaginationHelper
};