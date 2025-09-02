/**
 * Validation Utilities
 * Centralized validation schemas and utilities using AJV
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ErrorFactory } from './errors.js';

// Create AJV instance with configuration
const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  removeAdditional: true, // Remove additional properties
  coerceTypes: true      // Coerce types when possible
});

// Add format validators (date, email, uri, etc.)
addFormats(ajv);

// Custom formats
ajv.addFormat('uuid-or-string', {
  type: 'string',
  validate: (data) => {
    // Allow any non-empty string (for flexibility)
    return typeof data === 'string' && data.length > 0;
  }
});

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Shipment ID validation
  shipmentId: {
    type: 'string',
    format: 'uuid-or-string',
    minLength: 1
  },

  // Pagination schema
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      orderBy: { type: 'string' },
      orderDirection: { type: 'string', enum: ['ASC', 'DESC', 'asc', 'desc'] }
    },
    additionalProperties: false
  },

  // File metadata
  fileMetadata: {
    type: 'object',
    properties: {
      originalName: { type: 'string', minLength: 1 },
      mimeType: { type: 'string', pattern: '^[a-z-]+/[a-z0-9][a-z0-9!#$&\\-\\^_]*$' },
      size: { type: 'integer', minimum: 0 },
      tag: { type: 'string' }
    }
  }
};

/**
 * Business domain schemas
 */
export const schemas = {
  // Shipment schemas
  shipment: {
    create: {
      type: 'object',
      required: ['reference', 'origin', 'destination', 'status'],
      properties: {
        reference: { type: 'string', minLength: 1, maxLength: 100 },
        origin: { type: 'string', minLength: 1, maxLength: 100 },
        destination: { type: 'string', minLength: 1, maxLength: 100 },
        status: { 
          type: 'string', 
          enum: [
            'CREATED', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 'CONFIRMED', 
            'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'CUSTOMS_EXPORT', 
            'IN_TRANSIT', 'ARRIVED_DESTINATION', 'CUSTOMS_IMPORT', 
            'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'EXPIRED'
          ] 
        },
        description: { type: 'string', maxLength: 1000 },
        metadata: { type: 'object' }
      },
      additionalProperties: false
    },
    
    update: {
      type: 'object',
      properties: {
        reference: { type: 'string', minLength: 1, maxLength: 100 },
        origin: { type: 'string', minLength: 1, maxLength: 100 },
        destination: { type: 'string', minLength: 1, maxLength: 100 },
        status: { 
          type: 'string', 
          enum: [
            'CREATED', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 'CONFIRMED', 
            'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'CUSTOMS_EXPORT', 
            'IN_TRANSIT', 'ARRIVED_DESTINATION', 'CUSTOMS_IMPORT', 
            'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'EXPIRED'
          ] 
        },
        description: { type: 'string', maxLength: 1000 },
        metadata: { type: 'object' }
      },
      minProperties: 1,
      additionalProperties: false
    },

    search: {
      type: 'object',
      properties: {
        reference: { type: 'string' },
        status: { type: 'string' },
        origin: { type: 'string' },
        destination: { type: 'string' },
        fromDate: { type: 'string', format: 'date-time' },
        toDate: { type: 'string', format: 'date-time' },
        ...commonSchemas.pagination.properties
      },
      additionalProperties: false
    }
  },

  // Compliance schemas
  compliance: {
    staScreening: {
      type: 'object',
      required: ['shipment_id', 'hs_code', 'product_type', 'tech_origin'],
      properties: {
        shipment_id: commonSchemas.shipmentId,
        hs_code: { type: 'string', pattern: '^[0-9]{4,10}$' },
        product_type: { type: 'string', minLength: 1, maxLength: 200 },
        tech_origin: { type: 'string', minLength: 1, maxLength: 100 },
        notes: { type: ['string', 'null'], maxLength: 1000 }
      },
      additionalProperties: false
    },

    aiChip: {
      type: 'object',
      required: ['shipment_id', 'aica_done', 'export_notice_30d', 'reexport_license_needed', 'sta_permit_ai'],
      properties: {
        shipment_id: commonSchemas.shipmentId,
        aica_done: { type: 'boolean' },
        export_notice_30d: { type: 'boolean' },
        reexport_license_needed: { type: 'string', enum: ['yes', 'no', 'unknown'] },
        reexport_license_number: { type: ['string', 'null'], maxLength: 100 },
        sta_permit_ai: { type: 'boolean' },
        sta_permit_ai_number: { type: ['string', 'null'], maxLength: 100 }
      },
      additionalProperties: false
    },

    screening: {
      type: 'object',
      required: ['shipment_id', 'destination_country', 'end_user_name'],
      properties: {
        shipment_id: commonSchemas.shipmentId,
        destination_country: { type: 'string', pattern: '^[A-Z]{2}$' },
        end_user_name: { type: 'string', minLength: 1, maxLength: 200 }
      },
      additionalProperties: false
    },

    documents: {
      type: 'object',
      required: ['shipment_id', 'hs_validated', 'k2_ready'],
      properties: {
        shipment_id: commonSchemas.shipmentId,
        hs_code: { type: ['string', 'null'], pattern: '^[0-9]{4,10}$' },
        hs_validated: { type: 'boolean' },
        pco_number: { type: ['string', 'null'], maxLength: 100 },
        k2_ready: { type: 'boolean' },
        permit_refs: { 
          type: 'array', 
          items: { type: 'string', maxLength: 100 },
          maxItems: 10
        }
      },
      additionalProperties: false
    }
  },

  // File upload schemas
  upload: {
    metadata: {
      type: 'object',
      required: ['shipment_id'],
      properties: {
        shipment_id: commonSchemas.shipmentId,
        tag: { type: 'string', maxLength: 50, default: 'other' }
      },
      additionalProperties: false
    }
  },

  // RAG/Query schemas
  query: {
    rag: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 1000 },
        country: { type: 'string', pattern: '^[A-Z]{2}$', default: 'MY' },
        includeContext: { type: 'boolean', default: true },
        maxResults: { type: 'integer', minimum: 1, maximum: 10, default: 3 }
      },
      additionalProperties: false
    }
  },

  // Common schemas
  pagination: commonSchemas.pagination
};

/**
 * Validation utility class
 */
export class Validator {
  constructor() {
    this.validators = new Map();
    this.compileAll();
  }

  /**
   * Compile all schemas into validators
   */
  compileAll() {
    this.compileSchemaObject(schemas, '');
  }

  /**
   * Recursively compile schema objects
   * @param {Object} schemaObj - Schema object
   * @param {string} prefix - Key prefix
   */
  compileSchemaObject(schemaObj, prefix) {
    for (const [key, value] of Object.entries(schemaObj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value.type) {
        // This is a schema, compile it
        this.validators.set(fullKey, ajv.compile(value));
      } else if (typeof value === 'object') {
        // This is a nested object, recurse
        this.compileSchemaObject(value, fullKey);
      }
    }
  }

  /**
   * Get compiled validator by key
   * @param {string} key - Validator key (e.g., 'shipment.create')
   * @returns {Function} Compiled validator function
   */
  getValidator(key) {
    const validator = this.validators.get(key);
    if (!validator) {
      throw new Error(`Validator '${key}' not found. Available validators: ${Array.from(this.validators.keys()).join(', ')}`);
    }
    return validator;
  }

  /**
   * Validate data against schema
   * @param {string} key - Schema key
   * @param {*} data - Data to validate
   * @returns {*} Validated data (with defaults applied and additional properties removed)
   * @throws {ValidationError} If validation fails
   */
  validate(key, data) {
    const validator = this.getValidator(key);
    const isValid = validator(data);
    
    if (!isValid) {
      throw ErrorFactory.fromAjvErrors(validator.errors);
    }
    
    return data; // AJV modifies the data object with defaults and removes additional properties
  }

  /**
   * Check if data is valid without throwing
   * @param {string} key - Schema key
   * @param {*} data - Data to validate
   * @returns {Object} Validation result { valid: boolean, errors?: Array }
   */
  isValid(key, data) {
    try {
      this.validate(key, data);
      return { valid: true };
    } catch (error) {
      if (error.name === 'ValidationError') {
        return { valid: false, errors: error.details };
      }
      throw error; // Re-throw non-validation errors
    }
  }

  /**
   * Get all available validator keys
   * @returns {Array} Array of validator keys
   */
  getValidatorKeys() {
    return Array.from(this.validators.keys());
  }
}

// Create singleton validator instance
export const validator = new Validator();

/**
 * Validation middleware factory
 * @param {string} schemaKey - Schema key to validate against
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export function validateRequest(schemaKey, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      req[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] = validator.validate(schemaKey, data);
      next();
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: error.message,
          errors: error.details
        });
      }
      next(error);
    }
  };
}

/**
 * Sanitization utilities
 */
export const sanitizer = {
  /**
   * Sanitize string for SQL LIKE operations
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sqlLike(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[%_\\]/g, '\\$&');
  },

  /**
   * Sanitize filename
   * @param {string} filename - Original filename
   * @returns {string} Safe filename
   */
  filename(filename) {
    if (typeof filename !== 'string') return 'unnamed';
    return filename.replace(/[^\w.\-]/g, '_').substring(0, 255);
  },

  /**
   * Sanitize user input for display
   * @param {string} input - User input
   * @returns {string} Sanitized input
   */
  userInput(input) {
    if (typeof input !== 'string') return input;
    // Remove control characters and normalize whitespace
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  }
};

export default {
  schemas,
  commonSchemas,
  validator,
  validateRequest,
  sanitizer,
  Validator
};