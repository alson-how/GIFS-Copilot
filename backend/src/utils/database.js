/**
 * Database Connection and Query Utilities
 * Centralized database management with connection pooling and error handling
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config/app.js';
import { dbLogger } from './logger.js';

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   * @returns {Pool} PostgreSQL connection pool
   */
  async connect() {
    if (this.pool && this.isConnected) {
      return this.pool;
    }

    try {
      this.pool = new Pool({
        connectionString: config.database.url,
        ...config.database.poolConfig
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      this.isConnected = true;
      dbLogger.query('Database connected successfully');
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        dbLogger.error('Database pool error', { error: err });
        this.isConnected = false;
      });

      return this.pool;
    } catch (error) {
      dbLogger.error('Failed to connect to database', { error });
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Get database pool (connect if not already connected)
   * @returns {Pool} Database connection pool
   */
  async getPool() {
    if (!this.pool || !this.isConnected) {
      await this.connect();
    }
    return this.pool;
  }

  /**
   * Execute a database query with logging and error handling
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object} Query result
   */
  async query(query, params = []) {
    const pool = await this.getPool();
    
    try {
      dbLogger.query(query, params);
      const startTime = Date.now();
      const result = await pool.query(query, params);
      const duration = Date.now() - startTime;
      
      dbLogger.query(`Query completed in ${duration}ms, returned ${result.rowCount} rows`);
      return result;
    } catch (error) {
      dbLogger.error('Query execution failed', { error, query });
      throw new DatabaseError(error.message, query, params);
    }
  }

  /**
   * Execute query and return first row
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Object|null} First row or null
   */
  async queryOne(query, params = []) {
    const result = await this.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Execute query and return all rows
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} All rows
   */
  async queryAll(query, params = []) {
    const result = await this.query(query, params);
    return result.rows;
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function containing queries to execute
   * @returns {*} Result of the callback function
   */
  async transaction(callback) {
    const pool = await this.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      dbLogger.query('Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      dbLogger.query('Transaction committed');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      dbLogger.error('Transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check database health
   * @returns {Object} Health check result
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as ok');
      return {
        status: 'healthy',
        connected: this.isConnected,
        result: result.rows[0]
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      dbLogger.query('Database connection pool closed');
    }
  }
}

/**
 * Custom Database Error class
 */
class DatabaseError extends Error {
  constructor(message, query = null, params = []) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
    this.params = params;
  }
}

// Export singleton instance
export const db = new DatabaseManager();

/**
 * Express middleware to attach database instance to requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function attachDatabase(req, res, next) {
  req.db = db;
  next();
}

/**
 * Database query builder helpers
 */
export const QueryBuilder = {
  /**
   * Build INSERT query with RETURNING clause
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @param {string} returning - Columns to return
   * @returns {Object} Query object with text and values
   */
  insert(table, data, returning = '*') {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    return {
      text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`,
      values
    };
  },

  /**
   * Build UPDATE query with WHERE clause
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} where - WHERE conditions
   * @param {string} returning - Columns to return
   * @returns {Object} Query object with text and values
   */
  update(table, data, where, returning = '*') {
    const dataKeys = Object.keys(data);
    const whereKeys = Object.keys(where);
    const allValues = [...Object.values(data), ...Object.values(where)];
    
    const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const whereClause = whereKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`).join(' AND ');
    
    return {
      text: `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`,
      values: allValues
    };
  },

  /**
   * Build UPSERT query (INSERT ... ON CONFLICT DO UPDATE)
   * @param {string} table - Table name
   * @param {Object} data - Data to insert/update
   * @param {string} conflictColumn - Conflict column name
   * @param {string} returning - Columns to return
   * @returns {Object} Query object with text and values
   */
  upsert(table, data, conflictColumn, returning = '*') {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const updateClause = keys
      .filter(key => key !== conflictColumn)
      .map(key => `${key} = EXCLUDED.${key}`)
      .join(', ');
    
    return {
      text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) 
             ON CONFLICT (${conflictColumn}) DO UPDATE SET ${updateClause} 
             RETURNING ${returning}`,
      values
    };
  }
};

export { DatabaseError };
export default db;