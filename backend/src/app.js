/**
 * Refactored Application Entry Point
 * Clean, maintainable application setup using the new architecture
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Import refactored utilities and configuration
import { config, validateConfig } from './config/app.js';
import { logger, apiLogger } from './utils/logger.js';
import { attachDatabase } from './utils/database.js';
import { globalErrorHandler } from './utils/response.js';
import { bootstrap, attachContainer } from './container/Container.js';

// Import refactored routes
import refactoredShipmentsRouter from './routes/refactored/shipments.js';
import refactoredComplianceRouter from './routes/refactored/compliance.js';
import refactoredUploadsRouter from './routes/refactored/uploads.js';
import refactoredStrategicRouter from './routes/refactored/strategic.js';

// Import legacy routes (to be migrated)
import policyRouter from './routes/policy.js';
import uploadsRouter from './routes/upload.js';
import opsRouter from './routes/ops.js';
import k2Router from './routes/form_k2.js';
import documentsRouter from './routes/documents.js';
import { batchProcessingRouter } from './routes/batchProcessing.js';
import { stepRoutingRouter } from './routes/stepRouting.js';
import comprehensiveScreeningRouter from './routes/comprehensiveScreening.js';
import strategicItemsRouter from './routes/strategicItems.js';
import permitUploadsRouter from './routes/permitUploads.js';
import processInvoiceDetectionRouter from './routes/processInvoiceDetection.js';
import permitDocumentsRouter from './routes/permitDocuments.js';
import documentGenerationRouter from './routes/documentGeneration.js';

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
function createApp() {
  const app = express();

  // Validate configuration first
  try {
    validateConfig();
    logger.info('Configuration validated successfully');
  } catch (error) {
    logger.error('Configuration validation failed', { error });
    process.exit(1);
  }

  // Bootstrap dependency injection
  try {
    bootstrap();
    logger.info('Dependency injection bootstrapped successfully');
  } catch (error) {
    logger.error('Failed to bootstrap dependency injection', { error });
    process.exit(1);
  }

  // Basic middleware
  app.use(express.json({ limit: config.server.requestSizeLimit }));
  app.use(cors({ origin: config.server.allowedOrigin }));

  // Attach utilities to requests
  app.use(attachDatabase);
  app.use(attachContainer);

  // Request logging middleware
  app.use(apiLogger.request);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const healthCheck = await req.db.healthCheck();
      const response = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: healthCheck,
        features: {
          ragEnabled: config.features.ragEnabled,
          batchProcessingEnabled: config.features.batchProcessingEnabled,
          documentGenerationEnabled: config.features.documentGenerationEnabled
        }
      };
      res.json(response);
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // API Routes - Refactored (using new architecture)
  app.use('/api/v2/shipments', refactoredShipmentsRouter);
  app.use('/api/v2/compliance', refactoredComplianceRouter);
  app.use('/api/v2/uploads', refactoredUploadsRouter);
  app.use('/api/v2/strategic', refactoredStrategicRouter);

  // API Routes - Legacy (to be migrated)
  app.use('/api/policy', policyRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/ops', opsRouter);
  app.use('/api/k2', k2Router);
  app.use('/api/documents', documentsRouter);
  app.use('/api/batch-processing', batchProcessingRouter);
  app.use('/api/step-routing', stepRoutingRouter);
  app.use('/api/comprehensive-screening', comprehensiveScreeningRouter);
  app.use('/api/strategic', strategicItemsRouter);
  app.use('/api/uploads', permitUploadsRouter);
  app.use('/api/invoice-detection', processInvoiceDetectionRouter);
  app.use('/api/permit-documents', permitDocumentsRouter);
  app.use('/api/document-generation', documentGenerationRouter);

  // Static file serving for uploaded files
  app.use('/files', express.static(path.join(process.cwd(), config.server.uploadsDir)));

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  });

  // Global error handling middleware
  app.use(globalErrorHandler);

  return app;
}

/**
 * Start the application server
 * @param {Express} app - Express application
 * @returns {Promise<Server>} HTTP server instance
 */
async function startServer(app) {
  const port = config.server.port;
  
  return new Promise((resolve, reject) => {
    const server = app.listen(port, (error) => {
      if (error) {
        logger.error('Failed to start server', { error, port });
        reject(error);
      } else {
        logger.info(`🚀 GIFS backend running on http://localhost:${port}`, {
          port,
          nodeEnv: process.env.NODE_ENV || 'development',
          features: config.features
        });
        resolve(server);
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error', { error });
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          const db = require('./utils/database.js').db;
          await db.close();
          logger.info('Database connections closed');
        } catch (error) {
          logger.error('Error closing database connections', { error });
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  });
}

/**
 * Main application bootstrap function
 */
async function main() {
  try {
    logger.info('Starting GIFS Logistics Copilot Backend');
    logger.info('Environment configuration', {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: config.server.port,
      logLevel: config.logging.level
    });

    // Create and start the application
    const app = createApp();
    await startServer(app);

  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Export for testing
export { createApp, startServer };

// Start the application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}