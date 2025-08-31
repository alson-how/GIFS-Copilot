/**
 * Base Service Class
 * Provides common service functionality and patterns
 */

import { serviceLogger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

export class BaseService {
  constructor(repository, name = null) {
    this.repository = repository;
    this.serviceName = name || this.constructor.name;
  }

  /**
   * Validate input data against schema
   * @param {Object} data - Data to validate
   * @param {Function} validator - AJV validator function
   * @param {string} operation - Operation name for logging
   * @throws {ValidationError} If validation fails
   */
  validateInput(data, validator, operation = 'validation') {
    if (!validator(data)) {
      const errors = validator.errors.map(error => ({
        field: error.instancePath.replace('/', '') || error.params?.missingProperty || 'root',
        message: error.message,
        value: error.data
      }));
      
      serviceLogger.error(`${this.serviceName}.${operation}`, 'Validation failed', { errors });
      throw new ValidationError('Input validation failed', errors);
    }
  }

  /**
   * Log service operation start
   * @param {string} operation - Operation name
   * @param {Object} params - Operation parameters
   */
  logStart(operation, params = {}) {
    serviceLogger.start(this.serviceName, operation, params);
  }

  /**
   * Log service operation success
   * @param {string} operation - Operation name
   * @param {Object} result - Operation result metadata
   */
  logSuccess(operation, result = {}) {
    serviceLogger.success(this.serviceName, operation, result);
  }

  /**
   * Log service operation error
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(operation, error, context = {}) {
    serviceLogger.error(this.serviceName, operation, error, context);
  }

  /**
   * Execute operation with standardized logging and error handling
   * @param {string} operation - Operation name
   * @param {Function} fn - Async function to execute
   * @param {Object} params - Operation parameters for logging
   * @returns {*} Operation result
   */
  async executeOperation(operation, fn, params = {}) {
    try {
      this.logStart(operation, params);
      const result = await fn();
      this.logSuccess(operation, { success: true });
      return result;
    } catch (error) {
      this.logError(operation, error, params);
      throw error;
    }
  }

  /**
   * Check if entity exists by ID
   * @param {*} id - Entity ID
   * @returns {boolean} True if exists
   */
  async exists(id) {
    return this.executeOperation('exists', async () => {
      return await this.repository.existsById(id);
    }, { id });
  }

  /**
   * Get entity by ID with existence check
   * @param {*} id - Entity ID
   * @param {string} entityName - Entity name for error messages
   * @returns {Object} Entity data
   * @throws {NotFoundError} If entity doesn't exist
   */
  async getByIdOrFail(id, entityName = 'Entity') {
    return this.executeOperation('getByIdOrFail', async () => {
      const entity = await this.repository.findById(id);
      if (!entity) {
        const error = new Error(`${entityName} with ID ${id} not found`);
        error.name = 'NotFoundError';
        error.entityId = id;
        throw error;
      }
      return entity;
    }, { id, entityName });
  }

  /**
   * Create entity with validation
   * @param {Object} data - Entity data
   * @param {Function} validator - Validation function
   * @returns {Object} Created entity
   */
  async createWithValidation(data, validator) {
    return this.executeOperation('createWithValidation', async () => {
      this.validateInput(data, validator, 'create');
      return await this.repository.create(data);
    }, { hasData: !!data });
  }

  /**
   * Update entity with validation and existence check
   * @param {*} id - Entity ID
   * @param {Object} data - Update data
   * @param {Function} validator - Validation function
   * @param {string} entityName - Entity name for error messages
   * @returns {Object} Updated entity
   */
  async updateWithValidation(id, data, validator, entityName = 'Entity') {
    return this.executeOperation('updateWithValidation', async () => {
      // Check existence first
      await this.getByIdOrFail(id, entityName);
      
      // Validate input
      this.validateInput(data, validator, 'update');
      
      // Perform update
      const updated = await this.repository.updateById(id, data);
      if (!updated) {
        const error = new Error(`Failed to update ${entityName}`);
        error.name = 'UpdateError';
        throw error;
      }
      
      return updated;
    }, { id, hasData: !!data });
  }

  /**
   * Delete entity with existence check
   * @param {*} id - Entity ID
   * @param {string} entityName - Entity name for error messages
   * @returns {boolean} True if deleted
   */
  async deleteWithCheck(id, entityName = 'Entity') {
    return this.executeOperation('deleteWithCheck', async () => {
      // Check existence first
      await this.getByIdOrFail(id, entityName);
      
      // Perform delete
      const deleted = await this.repository.deleteById(id);
      if (!deleted) {
        const error = new Error(`Failed to delete ${entityName}`);
        error.name = 'DeleteError';
        throw error;
      }
      
      return true;
    }, { id });
  }

  /**
   * Get paginated results
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @param {Object} options - Additional query options
   * @returns {Object} Paginated results
   */
  async getPaginated(filters = {}, page = 1, limit = 20, options = {}) {
    return this.executeOperation('getPaginated', async () => {
      // Calculate offset
      const offset = (page - 1) * limit;
      
      // Get data and total count
      const [items, total] = await Promise.all([
        this.repository.findAll(filters, { ...options, limit, offset }),
        this.repository.count(filters)
      ]);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
      
      return {
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        }
      };
    }, { filters, page, limit });
  }

  /**
   * Bulk operation with transaction support
   * @param {Array} items - Items to process
   * @param {Function} operation - Operation to perform on each item
   * @param {Object} options - Options
   * @returns {Array} Results array
   */
  async bulkOperation(items, operation, options = {}) {
    return this.executeOperation('bulkOperation', async () => {
      const { useTransaction = true, concurrency = 1 } = options;
      
      if (useTransaction && this.repository.db && this.repository.db.transaction) {
        // Use transaction if available
        return await this.repository.db.transaction(async (client) => {
          const results = [];
          
          if (concurrency === 1) {
            // Sequential processing
            for (const item of items) {
              const result = await operation(item, client);
              results.push(result);
            }
          } else {
            // Concurrent processing (limited)
            const chunks = [];
            for (let i = 0; i < items.length; i += concurrency) {
              chunks.push(items.slice(i, i + concurrency));
            }
            
            for (const chunk of chunks) {
              const chunkResults = await Promise.all(
                chunk.map(item => operation(item, client))
              );
              results.push(...chunkResults);
            }
          }
          
          return results;
        });
      } else {
        // Without transaction
        if (concurrency === 1) {
          const results = [];
          for (const item of items) {
            const result = await operation(item);
            results.push(result);
          }
          return results;
        } else {
          return await Promise.all(items.map(operation));
        }
      }
    }, { itemCount: items.length, concurrency });
  }
}

export default BaseService;