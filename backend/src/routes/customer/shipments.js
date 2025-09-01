/**
 * Customer Shipments Routes
 * Routes for customer portal shipment management
 */

import express from 'express';
import pkg from 'pg';
import logger from '../../utils/logger.js';
import { authCustomer, authCustomerOptional } from '../../middleware/authCustomer.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const router = express.Router();

// Test route without auth
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Customer shipments route is working', timestamp: new Date() });
});

// GET /api/customer/shipments - List customer's shipments
router.get('/', authCustomerOptional, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, shipmentId, endUser } = req.query;
    const customerId = req.customer?.id;

    logger.info(`Fetching shipments${customerId ? ` for customer: ${customerId}` : ' (public access)'}`, {
      page, limit, status, search, shipmentId, endUser, hasAuth: !!customerId
    });

    // Build WHERE clause for filtering
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Filter by customer if authenticated
    if (customerId) {
      paramCount++;
      whereConditions.push(`customer_id = $${paramCount}`);
      queryParams.push(customerId);
    }

    if (shipmentId) {
      paramCount++;
      whereConditions.push(`shipment_id::text ILIKE $${paramCount}`);
      queryParams.push(`%${shipmentId}%`);
    }

    if (endUser) {
      paramCount++;
      whereConditions.push(`end_user_name ILIKE $${paramCount}`);
      queryParams.push(`%${endUser}%`);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        shipment_id::text ILIKE $${paramCount} OR 
        destination_country ILIKE $${paramCount} OR 
        end_user_name ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) FROM shipments ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalShipments = parseInt(countResult.rows[0].count);

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    queryParams.push(parseInt(limit));
    paramCount++;
    queryParams.push(offset);

    // Fetch shipments with pagination
    const shipmentsQuery = `
      SELECT 
        shipment_id,
        destination_country,
        commercial_value,
        currency,
        quantity,
        end_user_name,
        incoterms,
        hs_code,
        tech_origin,
        export_date,
        product_type,
        created_at,
        updated_at,
        status,
        customer_id,
        tracking_number,
        carrier_reference,
        description
      FROM shipments 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const shipmentsResult = await pool.query(shipmentsQuery, queryParams);
    
    // Format shipments for frontend  
    const shipments = shipmentsResult.rows.map(row => ({
      shipment_id: row.shipment_id,
      id: row.shipment_id,
      shipmentId: row.shipment_id,
      status: row.status || 'CREATED',
      destination: row.destination_country,
      destination_country: row.destination_country,
      exportDate: row.export_date,
      export_date: row.export_date,
      totalValue: row.commercial_value,
      commercial_value: row.commercial_value,
      currency: row.currency || 'USD',
      endUser: row.end_user_name,
      end_user_name: row.end_user_name,
      consignee: row.end_user_name,
      hsCode: row.hs_code,
      hs_code: row.hs_code,
      incoterms: row.incoterms,
      techOrigin: row.tech_origin,
      tech_origin: row.tech_origin,
      productType: row.product_type,
      product_type: row.product_type,
      quantity: row.quantity,
      description: row.description,
      customer_id: row.customer_id,
      tracking_number: row.tracking_number,
      carrier_reference: row.carrier_reference,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at
    }));

    logger.info(`Found ${shipments.length} shipments out of ${totalShipments} total`);

    res.json({
      success: true,
      data: {
        shipments: shipments,
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