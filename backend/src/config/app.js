/**
 * Application Configuration
 * Centralized configuration management for the entire application
 */

import 'dotenv/config';

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 8080,
    allowedOrigin: process.env.ALLOWED_ORIGIN || true,
    requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '2mb',
    uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    poolConfig: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT) || 2000,
    }
  },

  // External services
  services: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.1,
    },
    screening: {
      provider: process.env.SCREENING_PROVIDER || 'mock',
      apiUrl: process.env.SCREENING_API_URL,
      apiKey: process.env.SCREENING_API_KEY,
    }
  },

  // Application features
  features: {
    ragEnabled: !!(process.env.OPENAI_API_KEY && process.env.DATABASE_URL),
    batchProcessingEnabled: process.env.BATCH_PROCESSING_ENABLED !== 'false',
    documentGenerationEnabled: process.env.DOCUMENT_GENERATION_ENABLED !== 'false',
  },

  // File handling
  files: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    maxFiles: parseInt(process.env.MAX_FILES) || 10,
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/jpeg,image/png,text/plain').split(','),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  // Security
  security: {
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },

  // Business logic constants
  business: {
    defaultCountry: process.env.DEFAULT_COUNTRY || 'MY',
    maxRagResults: parseInt(process.env.MAX_RAG_RESULTS) || 5,
    strategicItemsKeywords: (process.env.STRATEGIC_ITEMS_KEYWORDS || 'defense,military,arms,missile,ai chip,semiconductor').split(','),
  }
};

/**
 * Validates required configuration values
 * @throws {Error} If required config is missing
 */
export function validateConfig() {
  const requiredConfig = [
    'database.url'
  ];

  const errors = [];

  for (const path of requiredConfig) {
    const value = getNestedValue(config, path);
    if (!value) {
      errors.push(`Missing required configuration: ${path}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Gets nested configuration value by path
 * @param {Object} obj - Configuration object
 * @param {string} path - Dot-separated path (e.g., 'database.url')
 * @returns {*} Configuration value
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj);
}

/**
 * Gets configuration value with fallback
 * @param {string} path - Dot-separated path
 * @param {*} defaultValue - Fallback value
 * @returns {*} Configuration value or default
 */
export function getConfig(path, defaultValue = null) {
  const value = getNestedValue(config, path);
  return value !== undefined ? value : defaultValue;
}

export default config;