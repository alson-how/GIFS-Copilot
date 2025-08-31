/**
 * Dependency Injection Container
 * Centralized dependency management and resolution
 */

import { logger } from '../utils/logger.js';

export class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {*} instance - Service instance or factory function
   * @param {Array} dependencies - Dependency names
   */
  singleton(name, instance, dependencies = []) {
    if (typeof instance === 'function') {
      this.factories.set(name, { factory: instance, dependencies, type: 'singleton' });
    } else {
      this.singletons.set(name, instance);
    }
    logger.debug(`Registered singleton: ${name}`, { dependencies });
  }

  /**
   * Register a transient service (new instance each time)
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Array} dependencies - Dependency names
   */
  transient(name, factory, dependencies = []) {
    this.factories.set(name, { factory, dependencies, type: 'transient' });
    logger.debug(`Registered transient: ${name}`, { dependencies });
  }

  /**
   * Register an existing instance
   * @param {string} name - Service name
   * @param {*} instance - Service instance
   */
  instance(name, instance) {
    this.singletons.set(name, instance);
    logger.debug(`Registered instance: ${name}`);
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  async resolve(name) {
    // Check if it's already a singleton instance
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check if it's a factory
    if (this.factories.has(name)) {
      const { factory, dependencies, type } = this.factories.get(name);
      
      // Resolve dependencies
      const resolvedDependencies = await Promise.all(dependencies.map(dep => this.resolve(dep)));
      
      // Create instance
      const instance = await factory(...resolvedDependencies);
      
      // Cache if singleton
      if (type === 'singleton') {
        this.singletons.set(name, instance);
      }
      
      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if registered
   */
  has(name) {
    return this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Get all registered service names
   * @returns {Array} Service names
   */
  getServiceNames() {
    return [
      ...this.singletons.keys(),
      ...this.factories.keys()
    ];
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    logger.debug('Container cleared');
  }

  /**
   * Create a child container that inherits from this one
   * @returns {Container} Child container
   */
  createChild() {
    const child = new Container();
    
    // Copy all registrations to child
    for (const [name, instance] of this.singletons) {
      child.singletons.set(name, instance);
    }
    
    for (const [name, factory] of this.factories) {
      child.factories.set(name, factory);
    }
    
    return child;
  }

  /**
   * Execute a function with resolved dependencies
   * @param {Function} fn - Function to execute
   * @param {Array} dependencies - Dependency names to inject
   * @returns {*} Function result
   */
  call(fn, dependencies = []) {
    const resolvedDependencies = dependencies.map(dep => this.resolve(dep));
    return fn(...resolvedDependencies);
  }

  /**
   * Create a factory function that resolves dependencies
   * @param {Function} fn - Function to wrap
   * @param {Array} dependencies - Dependency names
   * @returns {Function} Factory function
   */
  createFactory(fn, dependencies = []) {
    return (...args) => {
      const resolvedDependencies = dependencies.map(dep => this.resolve(dep));
      return fn(...resolvedDependencies, ...args);
    };
  }
}

// Create global container instance
export const container = new Container();

/**
 * Express middleware to attach container to requests
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
export function attachContainer(req, res, next) {
  req.container = container;
  next();
}

/**
 * Decorator for automatic dependency injection
 * @param {Array} dependencies - Dependency names
 * @returns {Function} Class decorator
 */
export function inject(dependencies = []) {
  return function(target) {
    const originalConstructor = target;
    
    function WrappedConstructor(...args) {
      const resolvedDependencies = dependencies.map(dep => container.resolve(dep));
      return new originalConstructor(...resolvedDependencies, ...args);
    }
    
    WrappedConstructor.prototype = originalConstructor.prototype;
    WrappedConstructor._dependencies = dependencies;
    
    return WrappedConstructor;
  };
}

/**
 * Bootstrap function to register all application services
 */
export function bootstrap() {
  logger.info('Bootstrapping dependency injection container');
  
  // Register core utilities
  container.instance('logger', logger);
  
  // Register database connection
  container.singleton('database', async () => {
    const db = await import('../utils/database.js');
    // Ensure database is connected
    await db.default.connect();
    return db.default;
  });

  // Register repositories
  container.singleton('shipmentRepository', async () => {
    const { default: ShipmentRepository } = await import('../repositories/ShipmentRepository.js');
    return new ShipmentRepository();
  });

  container.singleton('complianceRepository', async () => {
    const { ComplianceRepository } = await import('../repositories/ComplianceRepository.js');
    return new ComplianceRepository();
  });

  container.singleton('aiChipRepository', async () => {
    const { AiChipControlRepository } = await import('../repositories/ComplianceRepository.js');
    return new AiChipControlRepository();
  });

  container.singleton('screeningRepository', async () => {
    const { EndUserScreeningRepository } = await import('../repositories/ComplianceRepository.js');
    return new EndUserScreeningRepository();
  });

  container.singleton('documentsRepository', async () => {
    const { DocumentsRepository } = await import('../repositories/ComplianceRepository.js');
    return new DocumentsRepository();
  });

  container.singleton('fileRepository', async () => {
    const { default: FileRepository } = await import('../repositories/FileRepository.js');
    return new FileRepository();
  });

  container.singleton('fileUploadRepository', async () => {
    const { default: FileUploadRepository } = await import('../repositories/FileUploadRepository.js');
    const database = await container.resolve('database');
    return new FileUploadRepository(database);
  }, ['database']);

  container.singleton('strategicItemsRepository', async () => {
    const { default: StrategicItemsRepository } = await import('../repositories/StrategicItemsRepository.js');
    const database = await container.resolve('database');
    return new StrategicItemsRepository(database);
  }, ['database']);

  // Register services with dependency injection
  container.singleton('shipmentService', async () => {
    const { default: ShipmentService } = await import('../services/ShipmentService.js');
    const shipmentRepo = await container.resolve('shipmentRepository');
    const fileRepo = await container.resolve('fileRepository');
    return new ShipmentService(shipmentRepo, fileRepo);
  }, ['shipmentRepository', 'fileRepository']);

  container.singleton('complianceService', async () => {
    const { default: ComplianceService } = await import('../services/ComplianceService.js');
    const complianceRepo = await container.resolve('complianceRepository');
    const aiChipRepo = await container.resolve('aiChipRepository');
    const screeningRepo = await container.resolve('screeningRepository');
    const documentsRepo = await container.resolve('documentsRepository');
    return new ComplianceService(complianceRepo, aiChipRepo, screeningRepo, documentsRepo);
  }, ['complianceRepository', 'aiChipRepository', 'screeningRepository', 'documentsRepository']);

  container.singleton('fileUploadService', async () => {
    const { default: FileUploadService } = await import('../services/FileUploadService.js');
    const fileUploadRepo = await container.resolve('fileUploadRepository');
    const database = await container.resolve('database');
    const logger = await container.resolve('logger');
    return new FileUploadService(fileUploadRepo, database, logger);
  }, ['fileUploadRepository', 'database', 'logger']);

  container.singleton('strategicItemsService', async () => {
    const { default: StrategicItemsService } = await import('../services/StrategicItemsService.js');
    const strategicItemsRepo = await container.resolve('strategicItemsRepository');
    const database = await container.resolve('database');
    const logger = await container.resolve('logger');
    return new StrategicItemsService(strategicItemsRepo, database, logger);
  }, ['strategicItemsRepository', 'database', 'logger']);

  // Register controllers
  container.singleton('shipmentController', async () => {
    const { default: ShipmentController } = await import('../controllers/ShipmentController.js');
    const shipmentService = await container.resolve('shipmentService');
    return new ShipmentController(shipmentService);
  }, ['shipmentService']);

  container.singleton('complianceController', async () => {
    const { default: ComplianceController } = await import('../controllers/ComplianceController.js');
    const complianceService = await container.resolve('complianceService');
    return new ComplianceController(complianceService);
  }, ['complianceService']);

  container.singleton('fileUploadController', async () => {
    const { default: FileUploadController } = await import('../controllers/FileUploadController.js');
    const fileUploadService = await container.resolve('fileUploadService');
    const logger = await container.resolve('logger');
    return new FileUploadController(fileUploadService, logger);
  }, ['fileUploadService', 'logger']);

  container.singleton('strategicItemsController', async () => {
    const { default: StrategicItemsController } = await import('../controllers/StrategicItemsController.js');
    const strategicItemsService = await container.resolve('strategicItemsService');
    const logger = await container.resolve('logger');
    return new StrategicItemsController(strategicItemsService, logger);
  }, ['strategicItemsService', 'logger']);

  logger.info('Dependency injection container bootstrapped', { 
    services: container.getServiceNames().length 
  });
}

export default container;