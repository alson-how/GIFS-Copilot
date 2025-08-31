/**
 * Base Controller Class
 * Provides common controller functionality and response patterns
 */

import { ResponseHandler, asyncHandler } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class BaseController {
  constructor(service, controllerName = null) {
    this.service = service;
    this.controllerName = controllerName || this.constructor.name;
  }

  /**
   * Log controller operation
   * @param {Object} req - Express request object
   * @param {string} operation - Operation name
   * @param {Object} meta - Additional metadata
   */
  logOperation(req, operation, meta = {}) {
    logger.request(req.method, req.path, {
      controller: this.controllerName,
      operation,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ...meta
    });
  }

  /**
   * Handle service operation with standardized response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} operation - Async service operation
   * @param {string} operationName - Operation name for logging
   * @param {Object} options - Response options
   */
  async handleOperation(req, res, operation, operationName, options = {}) {
    try {
      this.logOperation(req, operationName);
      
      const result = await operation();
      
      const {
        statusCode = 200,
        message = null,
        dataKey = 'data'
      } = options;
      
      const responseData = dataKey ? { [dataKey]: result } : result;
      ResponseHandler.success(res, responseData, message, statusCode);
      
    } catch (error) {
      this.handleError(res, error, operationName);
    }
  }

  /**
   * Handle errors with appropriate response
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {string} operation - Operation name
   */
  handleError(res, error, operation) {
    logger.error(`${this.controllerName}.${operation} failed`, { 
      error,
      errorName: error.name,
      errorCode: error.code
    });

    // Handle different error types
    switch (error.name) {
      case 'ValidationError':
        return ResponseHandler.validationError(res, error.details);
      
      case 'NotFoundError':
        return ResponseHandler.notFound(res, error.resource);
      
      case 'UnauthorizedError':
        return ResponseHandler.unauthorized(res);
      
      case 'BusinessError':
        return ResponseHandler.error(res, error, error.message, 400);
      
      case 'DatabaseError':
        return ResponseHandler.databaseError(res, error);
      
      default:
        return ResponseHandler.error(res, error);
    }
  }

  /**
   * Create async route handler
   * @param {Function} handler - Route handler function
   * @returns {Function} Wrapped async handler
   */
  asyncRoute(handler) {
    return asyncHandler(handler.bind(this));
  }

  /**
   * Extract pagination parameters from request
   * @param {Object} req - Express request object
   * @param {Object} defaults - Default values
   * @returns {Object} Pagination parameters
   */
  extractPagination(req, defaults = {}) {
    const {
      page = 1,
      limit = 20,
      orderBy = defaults.orderBy || 'created_at',
      orderDirection = defaults.orderDirection || 'DESC'
    } = req.query;

    return {
      page: Math.max(1, parseInt(page)),
      limit: Math.min(100, Math.max(1, parseInt(limit))),
      orderBy: String(orderBy),
      orderDirection: ['ASC', 'DESC'].includes(String(orderDirection).toUpperCase()) 
        ? String(orderDirection).toUpperCase() 
        : 'DESC'
    };
  }

  /**
   * Extract filters from request query
   * @param {Object} req - Express request object
   * @param {Array} allowedFilters - Allowed filter keys
   * @returns {Object} Filters object
   */
  extractFilters(req, allowedFilters = []) {
    const filters = {};
    
    allowedFilters.forEach(key => {
      if (req.query[key] !== undefined && req.query[key] !== '') {
        filters[key] = req.query[key];
      }
    });
    
    return filters;
  }

  /**
   * Create standard CRUD routes
   * @returns {Object} CRUD route handlers
   */
  createCrudRoutes() {
    return {
      // GET /resource - List with pagination
      list: this.asyncRoute(async (req, res) => {
        const pagination = this.extractPagination(req);
        const filters = this.extractFilters(req, this.getAllowedFilters());
        
        await this.handleOperation(
          req, res,
          () => this.service.getPaginated(filters, pagination.page, pagination.limit, {
            orderBy: pagination.orderBy,
            orderDirection: pagination.orderDirection
          }),
          'list',
          { dataKey: null } // Return pagination object directly
        );
      }),

      // GET /resource/:id - Get by ID
      getById: this.asyncRoute(async (req, res) => {
        const { id } = req.params;
        
        await this.handleOperation(
          req, res,
          () => this.service.getByIdOrFail(id, this.getEntityName()),
          'getById',
          { dataKey: this.getEntityName().toLowerCase() }
        );
      }),

      // POST /resource - Create
      create: this.asyncRoute(async (req, res) => {
        const data = req.validatedBody || req.body;
        
        await this.handleOperation(
          req, res,
          () => this.service.createWithValidation(data, this.getCreateValidator()),
          'create',
          { 
            statusCode: 201,
            message: `${this.getEntityName()} created successfully`,
            dataKey: this.getEntityName().toLowerCase()
          }
        );
      }),

      // PUT /resource/:id - Update
      update: this.asyncRoute(async (req, res) => {
        const { id } = req.params;
        const data = req.validatedBody || req.body;
        
        await this.handleOperation(
          req, res,
          () => this.service.updateWithValidation(id, data, this.getUpdateValidator(), this.getEntityName()),
          'update',
          { 
            message: `${this.getEntityName()} updated successfully`,
            dataKey: this.getEntityName().toLowerCase()
          }
        );
      }),

      // DELETE /resource/:id - Delete
      delete: this.asyncRoute(async (req, res) => {
        const { id } = req.params;
        
        await this.handleOperation(
          req, res,
          () => this.service.deleteWithCheck(id, this.getEntityName()),
          'delete',
          { 
            message: `${this.getEntityName()} deleted successfully`,
            dataKey: 'deleted'
          }
        );
      })
    };
  }

  /**
   * Get entity name (override in subclasses)
   * @returns {string} Entity name
   */
  getEntityName() {
    return 'Entity';
  }

  /**
   * Get allowed filter keys for list operations (override in subclasses)
   * @returns {Array} Allowed filter keys
   */
  getAllowedFilters() {
    return [];
  }

  /**
   * Get create validator (override in subclasses)
   * @returns {Function} Validator function
   */
  getCreateValidator() {
    return () => true; // Default no-op validator
  }

  /**
   * Get update validator (override in subclasses)
   * @returns {Function} Validator function
   */
  getUpdateValidator() {
    return () => true; // Default no-op validator
  }
}

export default BaseController;