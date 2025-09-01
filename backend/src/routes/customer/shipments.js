/**
 * Customer Shipments Routes
 * Routes for customer portal shipment management
 */

import express from 'express';
import logger from '../../utils/logger.js';
import { authCustomer, authCustomerOptional } from '../../middleware/authCustomer.js';

const router = express.Router();

// GET /api/customer/shipments - List customer's shipments
router.get('/', authCustomer, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const customerId = req.customer.id;

    logger.info(`Fetching shipments for customer: ${customerId}`, {
      page, limit, status, search
    });

    // Build query filters
    const filters = { customerId };
    if (status) filters.status = status;
    if (search) {
      filters.$or = [
        { shipmentId: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { 'consignee.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // TODO: Replace with actual database query
    const mockShipments = [
      {
        id: 'SH001',
        shipmentId: 'SH001',
        customerId,
        status: 'in_transit',
        destination: 'China',
        exportDate: '2024-01-15',
        totalValue: 25000,
        itemCount: 5,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'SH002',
        shipmentId: 'SH002',
        customerId,
        status: 'delivered',
        destination: 'Singapore',
        exportDate: '2024-01-20',
        totalValue: 15000,
        itemCount: 3,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-22')
      }
    ];

    const totalShipments = mockShipments.length;

    res.json({
      success: true,
      data: {
        shipments: mockShipments.slice(skip, skip + parseInt(limit)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalShipments,
          pages: Math.ceil(totalShipments / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching customer shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipments'
    });
  }
});

// GET /api/customer/shipments/:id - Get specific shipment details
router.get('/:id', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;

    logger.info(`Fetching shipment details: ${id} for customer: ${customerId}`);

    // TODO: Replace with actual database query
    const mockShipment = {
      id,
      shipmentId: id,
      customerId,
      status: 'in_transit',
      destination: 'China',
      exportDate: '2024-01-15',
      mode: 'air',
      consignee: {
        name: 'Tech Solutions Ltd',
        address: 'Shanghai, China',
        registration: 'REG123456'
      },
      products: [
        {
          id: '1',
          description: 'Semiconductor Components',
          quantity: 100,
          unit: 'PCS',
          unitPrice: 250,
          totalValue: 25000,
          hsCode: '8542.32'
        }
      ],
      documents: [
        {
          id: 'doc1',
          name: 'Commercial Invoice',
          type: 'invoice',
          status: 'uploaded',
          uploadDate: '2024-01-10'
        },
        {
          id: 'doc2',
          name: 'Packing List',
          type: 'packing_list',
          status: 'uploaded',
          uploadDate: '2024-01-10'
        }
      ],
      tracking: [
        {
          date: '2024-01-10',
          status: 'order_created',
          location: 'Malaysia',
          description: 'Shipment order created'
        },
        {
          date: '2024-01-12',
          status: 'documentation_complete',
          location: 'Malaysia',
          description: 'All documents verified'
        },
        {
          date: '2024-01-15',
          status: 'in_transit',
          location: 'KLIA Cargo',
          description: 'Shipped via air freight'
        }
      ],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-15')
    };

    // Verify shipment belongs to customer
    if (mockShipment.customerId !== customerId) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    res.json({
      success: true,
      data: mockShipment
    });

  } catch (error) {
    logger.error('Error fetching shipment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment details'
    });
  }
});

// POST /api/customer/shipments - Create new shipment
router.post('/', authCustomer, async (req, res) => {
  try {
    const customerId = req.customer.id;
    const shipmentData = req.body;

    logger.info(`Creating new shipment for customer: ${customerId}`, shipmentData);

    // Validate required fields
    const required = ['exportDate', 'destination', 'mode', 'products'];
    const missing = required.filter(field => !shipmentData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    // Generate shipment ID
    const shipmentId = `SH${Date.now()}`;

    // TODO: Save to database
    const newShipment = {
      id: shipmentId,
      shipmentId,
      customerId,
      ...shipmentData,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info(`Shipment created successfully: ${shipmentId}`);

    res.status(201).json({
      success: true,
      data: newShipment,
      message: 'Shipment created successfully'
    });

  } catch (error) {
    logger.error('Error creating shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shipment'
    });
  }
});

// PUT /api/customer/shipments/:id - Update shipment
router.put('/:id', authCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer.id;
    const updateData = req.body;

    logger.info(`Updating shipment: ${id} for customer: ${customerId}`, updateData);

    // TODO: Verify shipment ownership and update in database

    res.json({
      success: true,
      data: { id, ...updateData, updatedAt: new Date() },
      message: 'Shipment updated successfully'
    });

  } catch (error) {
    logger.error('Error updating shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment'
    });
  }
});

// GET /api/customer/shipments/:id/tracking - Get shipment tracking
router.get('/:id/tracking', authCustomerOptional, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching tracking for shipment: ${id}`);

    // TODO: Fetch tracking data from database
    const trackingData = [
      {
        date: '2024-01-10',
        status: 'order_created',
        location: 'Malaysia',
        description: 'Shipment order created'
      },
      {
        date: '2024-01-12',
        status: 'documentation_complete',
        location: 'Malaysia',
        description: 'All documents verified'
      },
      {
        date: '2024-01-15',
        status: 'in_transit',
        location: 'KLIA Cargo',
        description: 'Shipped via air freight'
      }
    ];

    res.json({
      success: true,
      data: {
        shipmentId: id,
        tracking: trackingData,
        currentStatus: 'in_transit'
      }
    });

  } catch (error) {
    logger.error('Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking information'
    });
  }
});

export default router;