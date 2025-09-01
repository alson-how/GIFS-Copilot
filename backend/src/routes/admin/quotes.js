/**
 * Admin Quotes Management Routes
 * Routes for admin portal quote processing and management
 */

import express from 'express';
import QuoteService from '../../services/QuoteService.js';
import StatusTransitionService from '../../services/StatusTransitionService.js';
import { ShipmentRepository } from '../../repositories/ShipmentRepository.js';
import { authAdmin, requireRole } from '../../middleware/authAdmin.js';
import { serviceLogger } from '../../utils/logger.js';

const router = express.Router();
const quoteService = new QuoteService();
const statusTransitionService = new StatusTransitionService();
const shipmentRepo = new ShipmentRepository();

// Apply authentication middleware
router.use(authAdmin);
router.use(requireRole(['admin', 'manager']));

/**
 * GET /api/admin/quotes - Get pending quotes and shipments requiring quotes
 */
router.get('/', async (req, res) => {
  try {
    serviceLogger.start('AdminQuotesAPI', 'getPendingQuotes', { query: req.query });

    // Get shipments that need quotes (PENDING_QUOTE, UNDER_REVIEW)
    const pendingShipments = await shipmentRepo.rawQuery(`
      SELECT s.*, 
             u.first_name || ' ' || u.last_name as customer_name,
             u.email as customer_email,
             COUNT(sf.id) as document_count,
             ARRAY_AGG(sf.original_name ORDER BY sf.uploaded_at) FILTER (WHERE sf.original_name IS NOT NULL) as documents
      FROM shipments s
      LEFT JOIN users u ON s.customer_id = u.id
      LEFT JOIN shipment_files sf ON s.shipment_id = sf.shipment_id
      WHERE s.status IN ('PENDING_QUOTE', 'UNDER_REVIEW')
      GROUP BY s.shipment_id, u.id
      ORDER BY s.created_at DESC
    `);

    // Get existing quotes
    const filters = {
      status: req.query.status || 'ACTIVE',
      validOnly: true,
      limit: 50
    };
    
    const quotes = await quoteService.getQuotesForDashboard(filters);

    serviceLogger.success('AdminQuotesAPI', 'getPendingQuotes', { 
      shipments: pendingShipments.rows.length,
      quotes: quotes.length 
    });

    res.json({
      success: true,
      data: {
        pendingShipments: pendingShipments.rows,
        activeQuotes: quotes,
        summary: {
          pendingQuotes: pendingShipments.rows.filter(s => s.status === 'PENDING_QUOTE').length,
          underReview: pendingShipments.rows.filter(s => s.status === 'UNDER_REVIEW').length,
          activeQuotes: quotes.length
        }
      }
    });

  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'getPendingQuotes', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quotes data',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/quotes/generate
 * Generate quote for a shipment
 */
router.post('/generate', async (req, res) => {
  try {
    const { shipmentId, options = {} } = req.body;
    const adminId = req.admin.id;
    
    serviceLogger.start('AdminQuotesAPI', 'generateQuote', { shipmentId, adminId });

    if (!shipmentId) {
      return res.status(400).json({
        success: false,
        message: 'Shipment ID is required'
      });
    }

    // First, transition shipment to UNDER_REVIEW if it's PENDING_QUOTE
    const shipment = await shipmentRepo.findById(shipmentId);
    if (shipment.status === 'PENDING_QUOTE') {
      await statusTransitionService.transitionStatus(
        shipmentId, 
        'UNDER_REVIEW', 
        adminId, 
        'ADMIN',
        'Admin reviewing for quote generation'
      );
    }

    const quote = await quoteService.generateQuote(shipmentId, adminId, options);
    
    serviceLogger.success('AdminQuotesAPI', 'generateQuote', { 
      quoteId: quote.id, 
      quoteNumber: quote.quote_number 
    });
    
    res.status(201).json({
      success: true,
      data: quote,
      message: `Quote ${quote.quote_number} generated successfully`
    });
  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'generateQuote', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quote',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/quotes/shipment/:shipmentId
 * Get shipment details for quote generation
 */
router.get('/shipment/:shipmentId', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId);
    serviceLogger.start('AdminQuotesAPI', 'getShipmentForQuote', { shipmentId });

    const shipment = await shipmentRepo.findCompleteById(shipmentId);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Get existing quotes for this shipment
    const quotes = await quoteService.quoteRepo.findByShipmentId(shipmentId);

    // Calculate sample carrier rates
    const carrierRates = await quoteService.calculateCarrierRates(shipment);

    serviceLogger.success('AdminQuotesAPI', 'getShipmentForQuote', { shipmentId });
    
    res.json({
      success: true,
      data: {
        shipment,
        existingQuotes: quotes,
        suggestedRates: carrierRates
      }
    });
  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'getShipmentForQuote', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipment details',
      error: error.message
    });
  }
});

// GET /api/admin/quotes/:id - Get specific quote details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Admin fetching quote details: ${id} by ${req.admin.email}`);

    // TODO: Replace with actual database query
    const mockQuote = {
      id,
      quoteId: id,
      customerId: 'CUST001',
      customer: {
        id: 'CUST001',
        name: 'Tech Corp Ltd',
        email: 'admin@techcorp.com',
        phone: '+60123456789',
        address: 'Kuala Lumpur, Malaysia',
        registrationNumber: 'REG123456',
        taxId: 'TAX789012'
      },
      status: 'pending',
      priority: 'high',
      title: 'Electronics Shipment to China',
      description: 'High-value AI components requiring strategic assessment',
      destination: {
        country: 'China',
        city: 'Shanghai',
        address: 'Industrial District, Shanghai',
        postalCode: '200000'
      },
      shipmentDetails: {
        mode: 'air',
        estimatedWeight: 50,
        estimatedDimensions: '100x80x60 cm',
        specialHandling: ['Temperature controlled', 'Anti-static']
      },
      products: [
        {
          id: 'PROD001',
          description: 'AI Accelerator GPU Components',
          hsCode: '8542.32',
          quantity: 25,
          unit: 'PCS',
          unitPrice: 1500,
          totalValue: 37500,
          isStrategic: true,
          isAIChip: true,
          manufacturer: 'TechCorp Manufacturing',
          model: 'AI-ACC-2024'
        },
        {
          id: 'PROD002',
          description: 'Neural Processing Units',
          hsCode: '8542.33',
          quantity: 25,
          unit: 'PCS',
          unitPrice: 1500,
          totalValue: 37500,
          isStrategic: true,
          isAIChip: true,
          manufacturer: 'TechCorp Manufacturing',
          model: 'NPU-2024'
        }
      ],
      totalEstimatedValue: 75000,
      requirements: [
        'Strategic items assessment required',
        'Export license verification needed',
        'High-value insurance coverage',
        'Temperature-controlled shipping',
        'Anti-static packaging'
      ],
      complianceAssessment: {
        strategicItemsDetected: true,
        aiChipsDetected: true,
        exportLicenseRequired: true,
        additionalDocuments: [
          'Strategic Items Export License',
          'End User Certificate',
          'Technology Transfer Agreement'
        ],
        riskLevel: 'high',
        processingTime: '10-15 business days'
      },
      timeline: {
        submittedAt: new Date('2024-01-10'),
        dueDate: new Date('2024-01-13'),
        estimatedCompletion: new Date('2024-01-25')
      },
      assignedTo: null,
      internalNotes: [
        {
          id: 'NOTE001',
          author: 'admin@company.com',
          content: 'High priority customer - expedite processing',
          timestamp: new Date('2024-01-10'),
          type: 'priority'
        }
      ],
      customerNotes: 'Urgent requirement for production line. Need quote by Jan 13.',
      attachments: [
        {
          id: 'ATT001',
          name: 'Product_Specifications.pdf',
          type: 'pdf',
          size: '2.3MB',
          uploadDate: new Date('2024-01-10')
        }
      ]
    };

    res.json({
      success: true,
      data: mockQuote
    });

  } catch (error) {
    logger.error('Error fetching quote details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quote details'
    });
  }
});

// PUT /api/admin/quotes/:id/assign - Assign quote to admin
router.put('/:id/assign', authAdmin, requireRole(['admin', 'manager', 'sales']), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const adminId = req.admin.id;

    logger.info(`Assigning quote ${id} to ${assignedTo} by admin: ${req.admin.email}`);

    // TODO: Update quote assignment in database

    res.json({
      success: true,
      data: {
        quoteId: id,
        assignedTo,
        assignedBy: adminId,
        assignedAt: new Date()
      },
      message: 'Quote assigned successfully'
    });

  } catch (error) {
    logger.error('Error assigning quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign quote'
    });
  }
});

// PUT /api/admin/quotes/:id/status - Update quote status
router.put('/:id/status', authAdmin, requireRole(['admin', 'manager', 'sales']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, quoteDetails } = req.body;
    const adminId = req.admin.id;

    logger.info(`Updating quote ${id} status to ${status} by admin: ${req.admin.email}`);

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'quoted', 'approved', 'rejected', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // TODO: Update quote status in database

    res.json({
      success: true,
      data: {
        quoteId: id,
        status,
        updatedBy: adminId,
        updatedAt: new Date(),
        notes
      },
      message: 'Quote status updated successfully'
    });

  } catch (error) {
    logger.error('Error updating quote status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quote status'
    });
  }
});

// POST /api/admin/quotes/:id/response - Submit quote response
router.post('/:id/response', authAdmin, requireRole(['admin', 'manager', 'sales']), async (req, res) => {
  try {
    const { id } = req.params;
    const quoteResponse = req.body;
    const adminId = req.admin.id;

    logger.info(`Submitting quote response for ${id} by admin: ${req.admin.email}`);

    // Validate required fields
    const required = ['totalCost', 'breakdown', 'validUntil', 'terms'];
    const missing = required.filter(field => !quoteResponse[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // TODO: Save quote response to database and notify customer

    res.json({
      success: true,
      data: {
        quoteId: id,
        ...quoteResponse,
        respondedBy: adminId,
        respondedAt: new Date()
      },
      message: 'Quote response submitted successfully'
    });

  } catch (error) {
    logger.error('Error submitting quote response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit quote response'
    });
  }
});

// GET /api/admin/quotes/analytics/summary - Get quote analytics
router.get('/analytics/summary', authAdmin, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    logger.info(`Fetching quote analytics for admin: ${req.admin.email}`, { timeframe });

    // TODO: Replace with actual analytics query
    const mockAnalytics = {
      timeframe,
      summary: {
        totalQuotes: 156,
        pendingQuotes: 23,
        averageResponseTime: '2.5 days',
        approvalRate: 78.5,
        averageQuoteValue: 35000
      },
      trends: {
        quotesThisMonth: 45,
        quotesLastMonth: 38,
        growthRate: 18.4
      },
      breakdown: {
        byStatus: {
          pending: 23,
          inProgress: 15,
          quoted: 8,
          approved: 89,
          rejected: 21
        },
        byPriority: {
          low: 45,
          medium: 67,
          high: 32,
          urgent: 12
        },
        byValue: {
          under25k: 89,
          '25k-50k': 34,
          '50k-100k': 21,
          over100k: 12
        }
      }
    };

    res.json({
      success: true,
      data: mockAnalytics,
      generatedAt: new Date()
    });

  } catch (error) {
    logger.error('Error fetching quote analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quote analytics'
    });
  }
});

/**
 * POST /api/admin/quotes/:id/send
 * Send quote to customer
 */
router.post('/:id/send', async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    serviceLogger.start('AdminQuotesAPI', 'sendQuote', { quoteId });

    const result = await quoteService.sendQuoteToCustomer(quoteId);
    
    serviceLogger.success('AdminQuotesAPI', 'sendQuote', { quoteId });
    res.json({
      success: true,
      data: result,
      message: 'Quote sent to customer successfully'
    });
  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'sendQuote', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send quote',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/quotes/carriers/rates
 * Get carrier rates for shipment comparison
 */
router.get('/carriers/rates', async (req, res) => {
  try {
    const { origin, destination, weight } = req.query;
    serviceLogger.start('AdminQuotesAPI', 'getCarrierRates', { origin, destination, weight });

    if (!origin || !destination || !weight) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and weight are required'
      });
    }

    // Mock carrier rates - replace with actual carrier API integration
    const mockRates = [
      {
        carrier_name: 'DHL Express',
        service_type: 'Express Worldwide',
        transit_days: 3,
        rate_per_kg: 45.50,
        total_cost: parseFloat((45.50 * parseFloat(weight)).toFixed(2))
      },
      {
        carrier_name: 'FedEx International',
        service_type: 'Priority',
        transit_days: 4,
        rate_per_kg: 42.80,
        total_cost: parseFloat((42.80 * parseFloat(weight)).toFixed(2))
      },
      {
        carrier_name: 'UPS Worldwide',
        service_type: 'Express',
        transit_days: 5,
        rate_per_kg: 38.90,
        total_cost: parseFloat((38.90 * parseFloat(weight)).toFixed(2))
      },
      {
        carrier_name: 'Singapore Post',
        service_type: 'EMS',
        transit_days: 7,
        rate_per_kg: 28.50,
        total_cost: parseFloat((28.50 * parseFloat(weight)).toFixed(2))
      }
    ];

    serviceLogger.success('AdminQuotesAPI', 'getCarrierRates', { 
      carriers: mockRates.length 
    });

    res.json({
      success: true,
      data: mockRates,
      query: { origin, destination, weight: parseFloat(weight) },
      timestamp: new Date()
    });

  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'getCarrierRates', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carrier rates',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/quotes/stats
 * Get quote dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    serviceLogger.start('AdminQuotesAPI', 'getStats');

    const stats = await quoteService.getQuoteStatistics();
    
    serviceLogger.success('AdminQuotesAPI', 'getStats', { stats });
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    serviceLogger.error('AdminQuotesAPI', 'getStats', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

export default router;