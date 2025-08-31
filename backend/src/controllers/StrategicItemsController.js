/**
 * Strategic Items Controller
 * Handles HTTP requests for strategic items detection and compliance
 */

import { BaseController } from './BaseController.js';

export class StrategicItemsController extends BaseController {
  constructor(service, logger) {
    super(service, 'StrategicItemsController');
    this.logger = logger;
  }

  /**
   * Create route handlers
   */
  getRoutes() {
    return {
      // POST /api/v2/strategic/detect - Detect strategic items in product list
      detect: this.asyncRoute(async (req, res) => {
        const { shipment_id, product_items, options = {} } = req.body;

        // Validation
        if (!shipment_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing shipment_id',
            details: 'shipment_id is required in request body'
          });
        }

        if (!product_items || !Array.isArray(product_items)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid product_items',
            details: 'product_items must be a non-empty array'
          });
        }

        if (product_items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Empty product_items',
            details: 'At least one product item is required'
          });
        }

        await this.handleOperation(
          req, res,
          () => this.service.detectStrategicItems(shipment_id, product_items, options),
          'detect',
          { 
            statusCode: 200,
            message: 'Strategic items detection completed successfully',
            dataKey: 'detection_results'
          }
        );
      }),

      // GET /api/v2/strategic/shipment/:shipmentId - Get strategic status for shipment
      getShipmentStatus: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;

        await this.handleOperation(
          req, res,
          () => this.service.getShipmentStatus(shipmentId),
          'getShipmentStatus',
          { 
            dataKey: 'strategic_status'
          }
        );
      }),

      // GET /api/v2/strategic/validation/:shipmentId - Validate export permissions
      validateExport: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;

        await this.handleOperation(
          req, res,
          () => this.service.validateExportPermissions(shipmentId),
          'validateExport',
          { 
            message: 'Export validation completed',
            dataKey: 'validation_result'
          }
        );
      }),

      // GET /api/v2/strategic/review - Get items requiring manual review
      getReviewItems: this.asyncRoute(async (req, res) => {
        const { page, limit, shipmentId } = req.query;
        
        const options = {
          page: page ? parseInt(page) : 1,
          limit: limit ? Math.min(100, parseInt(limit)) : 20,
          shipmentId: shipmentId || null
        };

        await this.handleOperation(
          req, res,
          () => this.service.getItemsRequiringReview(options),
          'getReviewItems',
          { 
            dataKey: null // Return pagination object directly
          }
        );
      }),

      // PATCH /api/v2/strategic/review/:resultId - Update manual review status
      updateReviewStatus: this.asyncRoute(async (req, res) => {
        const { resultId } = req.params;
        const { requires_review, reason } = req.body;

        if (requires_review === undefined) {
          return res.status(400).json({
            success: false,
            error: 'Missing requires_review',
            details: 'requires_review boolean field is required'
          });
        }

        await this.handleOperation(
          req, res,
          () => this.service.updateManualReviewStatus(resultId, requires_review, reason),
          'updateReviewStatus',
          { 
            message: 'Manual review status updated successfully',
            dataKey: 'detection_result'
          }
        );
      }),

      // GET /api/v2/strategic/statistics - Get compliance statistics
      getStatistics: this.asyncRoute(async (req, res) => {
        const { start_date, end_date, shipment_id } = req.query;
        
        const filters = {};
        if (start_date) filters.startDate = start_date;
        if (end_date) filters.endDate = end_date;
        if (shipment_id) filters.shipmentId = shipment_id;

        await this.handleOperation(
          req, res,
          () => this.service.getComplianceStatistics(filters),
          'getStatistics',
          { 
            message: 'Compliance statistics retrieved successfully',
            dataKey: 'statistics'
          }
        );
      }),

      // POST /api/v2/strategic/search - Search detection results with complex criteria
      searchResults: this.asyncRoute(async (req, res) => {
        const criteria = req.body;
        const { page, limit } = req.query;
        
        const options = {
          page: page ? parseInt(page) : 1,
          limit: limit ? Math.min(100, parseInt(limit)) : 20
        };

        await this.handleOperation(
          req, res,
          () => this.service.searchDetectionResults(criteria, options),
          'searchResults',
          { 
            dataKey: null // Return pagination object directly
          }
        );
      }),

      // POST /api/v2/strategic/reprocess/:shipmentId - Reprocess strategic detection
      reprocessShipment: this.asyncRoute(async (req, res) => {
        const { shipmentId } = req.params;

        await this.handleOperation(
          req, res,
          () => this.service.reprocessShipment(shipmentId),
          'reprocessShipment',
          { 
            message: 'Shipment reprocessed successfully',
            dataKey: 'reprocess_result'
          }
        );
      }),

      // GET /api/v2/strategic/categories - Get strategic item categories and patterns
      getCategories: this.asyncRoute(async (req, res) => {
        const categories = {
          semiconductors: {
            description: 'Semiconductor and integrated circuit technologies',
            risk_level: 'high',
            sample_keywords: ['semiconductor', 'microprocessor', 'integrated circuit', 'IC', 'chip'],
            strategic_codes: ['3A001', '3A002', '3A003']
          },
          ai_technology: {
            description: 'Artificial intelligence and machine learning technologies',
            risk_level: 'critical',
            sample_keywords: ['artificial intelligence', 'AI chip', 'machine learning', 'neural network'],
            strategic_codes: ['3A001.a.12', '4A003.c', '4A003.b']
          },
          quantum_technology: {
            description: 'Quantum computing and quantum technologies',
            risk_level: 'critical',
            sample_keywords: ['quantum', 'quantum computing', 'quantum processor', 'quantum chip'],
            strategic_codes: ['3A002.g', '5A002.a']
          },
          cybersecurity: {
            description: 'Cybersecurity and encryption technologies',
            risk_level: 'high',
            sample_keywords: ['encryption', 'cryptographic', 'security processor', 'HSM'],
            strategic_codes: ['5A002', '5A004', '5D002']
          },
          telecommunications: {
            description: 'Telecommunications and radio frequency equipment',
            risk_level: 'medium',
            sample_keywords: ['telecommunications', 'telecom', 'radio frequency', 'RF'],
            strategic_codes: ['5A001.b', '5A001.f']
          },
          sensors: {
            description: 'Advanced sensors and measurement equipment',
            risk_level: 'medium',
            sample_keywords: ['sensor', 'accelerometer', 'gyroscope', 'magnetometer'],
            strategic_codes: ['6A002', '6A003', '6A004']
          }
        };

        res.json({
          success: true,
          message: 'Strategic item categories retrieved successfully',
          data: {
            categories: categories,
            total_categories: Object.keys(categories).length,
            detection_engine_version: '2.0'
          }
        });
      }),

      // GET /api/v2/strategic/hs-codes - Get strategic HS codes mapping
      getHsCodes: this.asyncRoute(async (req, res) => {
        const hsCodes = {
          '85423110': {
            category: 'semiconductors',
            risk_level: 'high',
            description: 'Electronic integrated circuits',
            requires_permits: true
          },
          '85423200': {
            category: 'semiconductors',
            risk_level: 'high',
            description: 'Processors and controllers',
            requires_permits: true
          },
          '85423300': {
            category: 'semiconductors',
            risk_level: 'medium',
            description: 'Amplifiers',
            requires_permits: false
          },
          '84717000': {
            category: 'processors',
            risk_level: 'high',
            description: 'Computer processing units',
            requires_permits: true
          },
          '85176200': {
            category: 'telecommunications',
            risk_level: 'medium',
            description: 'Telecom equipment',
            requires_permits: false
          },
          '90318000': {
            category: 'sensors',
            risk_level: 'medium',
            description: 'Measuring instruments',
            requires_permits: false
          }
        };

        res.json({
          success: true,
          message: 'Strategic HS codes retrieved successfully',
          data: {
            hs_codes: hsCodes,
            total_codes: Object.keys(hsCodes).length
          }
        });
      }),

      // GET /api/v2/strategic/health - Health check for strategic detection system
      healthCheck: this.asyncRoute(async (req, res) => {
        const healthStatus = {
          status: 'healthy',
          detection_engine_version: '2.0',
          features: {
            semiconductor_detection: true,
            ai_technology_detection: true,
            quantum_technology_detection: true,
            cybersecurity_detection: true,
            telecommunications_detection: true,
            sensors_detection: true
          },
          confidence_thresholds: {
            low: 0.3,
            medium: 0.6,
            high: 0.8,
            critical: 0.9
          },
          supported_risk_levels: ['low', 'medium', 'high', 'critical'],
          timestamp: new Date().toISOString()
        };

        res.json({
          success: true,
          message: 'Strategic detection system is healthy',
          data: healthStatus
        });
      })
    };
  }

  /**
   * Get entity name for error messages
   */
  getEntityName() {
    return 'Strategic Item';
  }

  /**
   * Get allowed filter keys for search operations
   */
  getAllowedFilters() {
    return [
      'shipment_id', 'is_strategic', 'risk_level', 'export_blocked',
      'manual_review_required', 'hs_code', 'item_description',
      'min_confidence', 'strategic_codes'
    ];
  }
}

export default StrategicItemsController;