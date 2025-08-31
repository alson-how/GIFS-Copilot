/**
 * Compliance Controller
 * HTTP request handlers for compliance operations
 */

import { BaseController } from './BaseController.js';
import { complianceService } from '../services/ComplianceService.js';
import { validator } from '../utils/validation.js';
import { ResponseHandler } from '../utils/response.js';

export class ComplianceController extends BaseController {
  constructor(service = complianceService) {
    super(service, 'ComplianceController');
  }

  /**
   * Get route handlers
   * @returns {Object} Route handlers
   */
  getRoutes() {
    return {
      // STA Screening
      performStaScreening: this.asyncRoute(this.performStaScreening),
      
      // AI Chip Control
      processAiChipControl: this.asyncRoute(this.processAiChipControl),
      
      // End User Screening
      performEndUserScreening: this.asyncRoute(this.performEndUserScreening),
      
      // Documents Processing
      processDocuments: this.asyncRoute(this.processDocuments),
      
      // Data Retrieval
      getComplianceData: this.asyncRoute(this.getComplianceData),
      getStatistics: this.asyncRoute(this.getStatistics)
    };
  }

  /**
   * Perform STA (Strategic Trade Authorization) screening
   * POST /api/compliance/sta-screening
   */
  async performStaScreening(req, res) {
    const screeningData = req.validatedBody || req.body;
    
    // Validate against schema
    try {
      validator.validate('compliance.staScreening', screeningData);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return ResponseHandler.validationError(res, error.details);
      }
      throw error;
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.performStaScreening(screeningData),
      'performStaScreening',
      { 
        message: 'STA screening completed successfully',
        dataKey: 'record'
      }
    );
  }

  /**
   * Process AI chip control requirements
   * POST /api/compliance/ai-chip
   */
  async processAiChipControl(req, res) {
    const aiChipData = req.validatedBody || req.body;
    
    // Validate against schema
    try {
      validator.validate('compliance.aiChip', aiChipData);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return ResponseHandler.validationError(res, error.details);
      }
      throw error;
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.processAiChipControl(aiChipData),
      'processAiChipControl',
      { 
        message: 'AI chip control processed successfully',
        dataKey: 'record'
      }
    );
  }

  /**
   * Perform end user screening
   * POST /api/compliance/screening
   */
  async performEndUserScreening(req, res) {
    const screeningData = req.validatedBody || req.body;
    
    // Validate against schema
    try {
      validator.validate('compliance.screening', screeningData);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return ResponseHandler.validationError(res, error.details);
      }
      throw error;
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.performEndUserScreening(screeningData),
      'performEndUserScreening',
      { 
        message: 'End user screening completed successfully',
        dataKey: 'record'
      }
    );
  }

  /**
   * Process documents and classification
   * POST /api/compliance/docs
   */
  async processDocuments(req, res) {
    const documentsData = req.validatedBody || req.body;
    
    // Validate against schema
    try {
      validator.validate('compliance.documents', documentsData);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return ResponseHandler.validationError(res, error.details);
      }
      throw error;
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.processDocuments(documentsData),
      'processDocuments',
      { 
        message: 'Documents processed successfully',
        dataKey: 'record'
      }
    );
  }

  /**
   * Get complete compliance data for shipment
   * GET /api/compliance/:shipmentId
   */
  async getComplianceData(req, res) {
    const { shipmentId } = req.params;
    
    if (!shipmentId) {
      return ResponseHandler.validationError(res, [{
        field: 'shipmentId',
        message: 'Shipment ID is required'
      }]);
    }
    
    await this.handleOperation(
      req, res,
      () => this.service.getComplianceData(shipmentId),
      'getComplianceData',
      { dataKey: 'compliance' }
    );
  }

  /**
   * Get compliance statistics
   * GET /api/compliance/statistics
   */
  async getStatistics(req, res) {
    await this.handleOperation(
      req, res,
      () => this.service.getStatistics(),
      'getStatistics',
      { dataKey: 'statistics' }
    );
  }
}

// Export controller instance
export const complianceController = new ComplianceController();

export default ComplianceController;