/**
 * Shipment Controller
 * HTTP request handlers for shipment operations
 */

import { BaseController } from './BaseController.js';
import { shipmentService } from '../services/ShipmentService.js';
import { validator } from '../utils/validation.js';
import { ResponseHandler } from '../utils/response.js';

export class ShipmentController extends BaseController {
  constructor(service = shipmentService) {
    super(service, 'ShipmentController');
  }

  /**
   * Get entity name
   * @returns {string} Entity name
   */
  getEntityName() {
    return 'Shipment';
  }

  /**
   * Get allowed filter keys
   * @returns {Array} Allowed filter keys
   */
  getAllowedFilters() {
    return ['status', 'origin', 'destination', 'reference'];
  }

  /**
   * Get create validator
   * @returns {Function} Validator function
   */
  getCreateValidator() {
    return validator.getValidator('shipment.create');
  }

  /**
   * Get update validator
   * @returns {Function} Validator function
   */
  getUpdateValidator() {
    return validator.getValidator('shipment.update');
  }

  /**
   * Create CRUD route handlers
   * @returns {Object} Route handlers
   */
  getRoutes() {
    const crudRoutes = this.createCrudRoutes();
    
    return {
      ...crudRoutes,
      
      // Additional shipment-specific routes
      search: this.asyncRoute(this.searchShipments),
      updateStatus: this.asyncRoute(this.updateStatus),
      getActive: this.asyncRoute(this.getActiveShipments),
      getStatistics: this.asyncRoute(this.getStatistics),
      bulkUpdateStatus: this.asyncRoute(this.bulkUpdateStatus),
      getComplete: this.asyncRoute(this.getCompleteShipment)
    };
  }

  /**
   * Search shipments with advanced criteria
   * POST /api/shipments/search
   */
  async searchShipments(req, res) {
    const searchCriteria = req.validatedBody || req.body;
    
    await this.handleOperation(
      req, res,
      () => this.service.searchShipments(searchCriteria),
      'searchShipments',
      { dataKey: 'shipments' }
    );
  }

  /**
   * Update shipment status
   * PATCH /api/shipments/:id/status
   */
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!status) {
      return ResponseHandler.validationError(res, [{
        field: 'status',
        message: 'Status is required'
      }]);
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.updateStatus(id, status, reason),
      'updateStatus',
      { 
        message: 'Shipment status updated successfully',
        dataKey: 'shipment'
      }
    );
  }

  /**
   * Get active shipments
   * GET /api/shipments/active
   */
  async getActiveShipments(req, res) {
    const pagination = this.extractPagination(req);
    
    await this.handleOperation(
      req, res,
      () => this.service.getActiveShipments({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        orderBy: pagination.orderBy,
        orderDirection: pagination.orderDirection
      }),
      'getActiveShipments',
      { dataKey: 'shipments' }
    );
  }

  /**
   * Get shipment statistics
   * GET /api/shipments/statistics
   */
  async getStatistics(req, res) {
    await this.handleOperation(
      req, res,
      () => this.service.getStatistics(),
      'getStatistics',
      { dataKey: 'statistics' }
    );
  }

  /**
   * Bulk update shipment statuses
   * PATCH /api/shipments/bulk/status
   */
  async bulkUpdateStatus(req, res) {
    const { ids, status, reason } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return ResponseHandler.validationError(res, [{
        field: 'ids',
        message: 'Array of shipment IDs is required'
      }]);
    }
    
    if (!status) {
      return ResponseHandler.validationError(res, [{
        field: 'status',
        message: 'Status is required'
      }]);
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.bulkUpdateStatus(ids, status, reason),
      'bulkUpdateStatus',
      { 
        message: 'Bulk status update completed',
        dataKey: 'result'
      }
    );
  }

  /**
   * Get complete shipment data (including compliance, files, etc.)
   * GET /api/shipments/:id/complete
   */
  async getCompleteShipment(req, res) {
    const { id } = req.params;
    
    await this.handleOperation(
      req, res,
      () => this.service.getShipmentById(id),
      'getCompleteShipment',
      { dataKey: 'shipment' }
    );
  }
}

// Export controller instance
export const shipmentController = new ShipmentController();

export default ShipmentController;