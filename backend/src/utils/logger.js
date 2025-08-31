/**
 * Centralized Logging Utility
 * Consistent logging across the entire application
 */

import { config } from '../config/app.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS[config.logging.level] ?? LOG_LEVELS.info;
  }

  /**
   * Formats log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} Formatted log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  log(level, message, meta = {}) {
    const levelNum = LOG_LEVELS[level];
    if (levelNum > this.level) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    if (config.logging.enableConsole) {
      // Use appropriate console method
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'debug':
          console.debug(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }

    // TODO: Add file logging if needed
    // if (config.logging.enableFile) {
    //   this.writeToFile(formattedMessage);
    // }
  }

  /**
   * Log error messages
   * @param {string} message - Error message
   * @param {Object} meta - Additional context
   */
  error(message, meta = {}) {
    // If meta contains an error object, extract relevant info
    if (meta.error && meta.error instanceof Error) {
      meta.errorMessage = meta.error.message;
      meta.errorStack = meta.error.stack;
      delete meta.error; // Remove the error object to avoid circular refs
    }
    this.log('error', message, meta);
  }

  /**
   * Log warning messages
   * @param {string} message - Warning message
   * @param {Object} meta - Additional context
   */
  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  /**
   * Log info messages
   * @param {string} message - Info message
   * @param {Object} meta - Additional context
   */
  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  /**
   * Log debug messages
   * @param {string} message - Debug message
   * @param {Object} meta - Additional context
   */
  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  /**
   * Log database operations
   * @param {string} operation - DB operation (INSERT, UPDATE, etc.)
   * @param {string} table - Table name
   * @param {Object} meta - Additional context
   */
  database(operation, table, meta = {}) {
    this.debug(`DB ${operation} on ${table}`, meta);
  }

  /**
   * Log API requests
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} meta - Additional context
   */
  request(method, path, meta = {}) {
    this.info(`${method} ${path}`, meta);
  }

  /**
   * Log service operations
   * @param {string} service - Service name
   * @param {string} operation - Operation name
   * @param {Object} meta - Additional context
   */
  service(service, operation, meta = {}) {
    this.info(`${service}.${operation}`, meta);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export specific loggers for different domains
export const apiLogger = {
  request: (req, res, next) => {
    const startTime = Date.now();
    logger.request(req.method, req.path, { 
      ip: req.ip, 
      userAgent: req.get('User-Agent') 
    });
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`${req.method} ${req.path} - ${res.statusCode}`, { 
        duration: `${duration}ms`,
        statusCode: res.statusCode 
      });
    });
    
    next();
  }
};

export const dbLogger = {
  query: (query, params = []) => {
    logger.database('QUERY', 'database', { 
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      paramCount: params.length 
    });
  },
  
  error: (error, query) => {
    logger.error('Database query failed', { 
      error,
      query: query?.substring(0, 100) + (query?.length > 100 ? '...' : '') 
    });
  }
};

export const serviceLogger = {
  start: (service, operation, meta = {}) => {
    logger.service(service, `${operation} started`, meta);
  },
  
  success: (service, operation, meta = {}) => {
    logger.service(service, `${operation} completed`, meta);
  },
  
  error: (service, operation, error, meta = {}) => {
    logger.error(`${service}.${operation} failed`, { error, ...meta });
  }
};

export default logger;