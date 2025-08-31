/**
 * Base Repository Class
 * Provides common CRUD operations and database interaction patterns
 */

import { db, QueryBuilder, DatabaseError } from '../utils/database.js';
import { serviceLogger } from '../utils/logger.js';

export class BaseRepository {
  /**
   * @param {string} tableName - Name of the database table
   * @param {string} primaryKey - Primary key column name (default: 'id')
   */
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Find record by primary key
   * @param {*} id - Primary key value
   * @returns {Object|null} Record or null if not found
   */
  async findById(id) {
    try {
      serviceLogger.start(this.constructor.name, 'findById', { id });
      
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await db.queryOne(query, [id]);
      
      serviceLogger.success(this.constructor.name, 'findById', { found: !!result });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findById', error, { id });
      throw error;
    }
  }

  /**
   * Find all records with optional conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} options - Query options (orderBy, limit, offset)
   * @returns {Array} Array of records
   */
  async findAll(conditions = {}, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findAll', { conditions, options });
      
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      
      // Add WHERE conditions
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      // Add ORDER BY
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      }
      
      // Add LIMIT and OFFSET
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }
      
      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }
      
      const results = await db.queryAll(query, params);
      
      serviceLogger.success(this.constructor.name, 'findAll', { count: results.length });
      return results;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findAll', error, { conditions, options });
      throw error;
    }
  }

  /**
   * Find one record by conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {Object|null} Record or null if not found
   */
  async findOne(conditions) {
    try {
      serviceLogger.start(this.constructor.name, 'findOne', { conditions });
      
      const results = await this.findAll(conditions, { limit: 1 });
      const result = results.length > 0 ? results[0] : null;
      
      serviceLogger.success(this.constructor.name, 'findOne', { found: !!result });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findOne', error, { conditions });
      throw error;
    }
  }

  /**
   * Count records with optional conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {number} Count of records
   */
  async count(conditions = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'count', { conditions });
      
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      const result = await db.queryOne(query, params);
      const count = parseInt(result.count);
      
      serviceLogger.success(this.constructor.name, 'count', { count });
      return count;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'count', error, { conditions });
      throw error;
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Object} Created record
   */
  async create(data, returning = '*') {
    try {
      serviceLogger.start(this.constructor.name, 'create', { data });
      
      const queryObj = QueryBuilder.insert(this.tableName, data, returning);
      const result = await db.queryOne(queryObj.text, queryObj.values);
      
      serviceLogger.success(this.constructor.name, 'create', { id: result[this.primaryKey] });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'create', error, { data });
      throw error;
    }
  }

  /**
   * Update record by primary key
   * @param {*} id - Primary key value
   * @param {Object} data - Update data
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Object|null} Updated record or null if not found
   */
  async updateById(id, data, returning = '*') {
    try {
      serviceLogger.start(this.constructor.name, 'updateById', { id, data });
      
      const queryObj = QueryBuilder.update(
        this.tableName, 
        data, 
        { [this.primaryKey]: id }, 
        returning
      );
      const result = await db.queryOne(queryObj.text, queryObj.values);
      
      serviceLogger.success(this.constructor.name, 'updateById', { updated: !!result });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'updateById', error, { id, data });
      throw error;
    }
  }

  /**
   * Update records by conditions
   * @param {Object} conditions - WHERE conditions
   * @param {Object} data - Update data
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Array} Updated records
   */
  async updateWhere(conditions, data, returning = '*') {
    try {
      serviceLogger.start(this.constructor.name, 'updateWhere', { conditions, data });
      
      const queryObj = QueryBuilder.update(this.tableName, data, conditions, returning);
      const results = await db.queryAll(queryObj.text, queryObj.values);
      
      serviceLogger.success(this.constructor.name, 'updateWhere', { count: results.length });
      return results;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'updateWhere', error, { conditions, data });
      throw error;
    }
  }

  /**
   * Create or update record (upsert)
   * @param {Object} data - Record data
   * @param {string} conflictColumn - Column to check for conflicts
   * @param {string} returning - Columns to return (default: '*')
   * @returns {Object} Created or updated record
   */
  async upsert(data, conflictColumn, returning = '*') {
    try {
      serviceLogger.start(this.constructor.name, 'upsert', { data, conflictColumn });
      
      const queryObj = QueryBuilder.upsert(this.tableName, data, conflictColumn, returning);
      const result = await db.queryOne(queryObj.text, queryObj.values);
      
      serviceLogger.success(this.constructor.name, 'upsert', { id: result[this.primaryKey] });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'upsert', error, { data, conflictColumn });
      throw error;
    }
  }

  /**
   * Delete record by primary key
   * @param {*} id - Primary key value
   * @returns {boolean} True if deleted, false if not found
   */
  async deleteById(id) {
    try {
      serviceLogger.start(this.constructor.name, 'deleteById', { id });
      
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1 RETURNING ${this.primaryKey}`;
      const result = await db.queryOne(query, [id]);
      const deleted = !!result;
      
      serviceLogger.success(this.constructor.name, 'deleteById', { deleted });
      return deleted;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'deleteById', error, { id });
      throw error;
    }
  }

  /**
   * Delete records by conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {number} Number of deleted records
   */
  async deleteWhere(conditions) {
    try {
      serviceLogger.start(this.constructor.name, 'deleteWhere', { conditions });
      
      const whereKeys = Object.keys(conditions);
      const params = Object.values(conditions);
      const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
      
      const query = `DELETE FROM ${this.tableName} WHERE ${whereClause} RETURNING ${this.primaryKey}`;
      const results = await db.queryAll(query, params);
      const count = results.length;
      
      serviceLogger.success(this.constructor.name, 'deleteWhere', { count });
      return count;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'deleteWhere', error, { conditions });
      throw error;
    }
  }

  /**
   * Check if record exists by primary key
   * @param {*} id - Primary key value
   * @returns {boolean} True if exists
   */
  async existsById(id) {
    try {
      const count = await this.count({ [this.primaryKey]: id });
      return count > 0;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'existsById', error, { id });
      throw error;
    }
  }

  /**
   * Check if record exists by conditions
   * @param {Object} conditions - WHERE conditions
   * @returns {boolean} True if exists
   */
  async exists(conditions) {
    try {
      const count = await this.count(conditions);
      return count > 0;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'exists', error, { conditions });
      throw error;
    }
  }

  /**
   * Execute raw query (use with caution)
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  async rawQuery(query, params = []) {
    try {
      serviceLogger.start(this.constructor.name, 'rawQuery', { query: query.substring(0, 50) + '...' });
      
      const result = await db.query(query, params);
      
      serviceLogger.success(this.constructor.name, 'rawQuery', { rowCount: result.rowCount });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'rawQuery', error);
      throw error;
    }
  }
}

export default BaseRepository;