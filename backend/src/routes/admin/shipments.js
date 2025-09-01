/**
 * Admin Shipments Routes
 * Routes for admin portal shipment management
 */

import express from 'express';
import pkg from 'pg';
import logger from '../../utils/logger.js';
import { authAdmin } from '../../middleware/authAdmin.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const router = express.Router();

// GET /api/admin/shipments - List all shipments (admin access)
router.get('/', authAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, shipmentId, endUser } = req.query;
    const adminId = req.admin.id;

    logger.info(`Fetching shipments for admin: ${adminId}`, {
      page, limit, status, search, shipmentId, endUser
    });

    // Build WHERE clause for filtering
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

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

    // Fetch shipments with pagination - admin gets all fields
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
        description,
        estimated_delivery_date,
        actual_pickup_date,
        actual_delivery_date
      FROM shipments 
      ${whereClause}
      ORDER BY updated_at DESC 
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const shipmentsResult = await pool.query(shipmentsQuery, queryParams);
    
    // Format shipments for frontend - admin gets enhanced data
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
      estimated_delivery_date: row.estimated_delivery_date,
      actual_pickup_date: row.actual_pickup_date,
      actual_delivery_date: row.actual_delivery_date,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at
    }));

    logger.info(`Admin found ${shipments.length} shipments out of ${totalShipments} total`);

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
    logger.error('Error fetching admin shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipments'
    });
  }
});

// GET /api/admin/shipments/:id - Get specific shipment details (admin access)
router.get('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching shipment details: ${id}`, {
      paramType: typeof id,
      paramValue: id,
      paramLength: id?.length
    });

    // Validate the shipment ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Invalid shipment ID'
      });
    }

    // Query shipment details with related documents - admin gets full access
    const shipmentQuery = `
      SELECT 
        s.shipment_id,
        s.destination_country,
        s.commercial_value,
        s.currency,
        s.quantity,
        s.end_user_name,
        s.incoterms,
        s.hs_code,
        s.tech_origin,
        s.export_date,
        s.product_type,
        s.status,
        s.created_at,
        s.updated_at,
        s.customer_id,
        s.tracking_number,
        s.carrier_reference,
        s.description,
        s.estimated_delivery_date,
        s.actual_pickup_date,
        s.actual_delivery_date,
        d.original_filename,
        d.file_path,
        d.document_type,
        d.confidence_score,
        d.ocr_results,
        d.uploaded_at
      FROM shipments s
      LEFT JOIN uploaded_documents d ON s.shipment_id = d.shipment_id
      WHERE s.shipment_id = $1
    `;

    logger.info('Executing shipment query', { 
      shipmentId: id,
      queryLength: shipmentQuery.length,
      parameters: [id],
      queryPreview: shipmentQuery.substring(0, 200) + '...'
    });
    
    // Let's try to identify the issue at position 939
    const queryChars = shipmentQuery.length;
    logger.info('Query character analysis', {
      totalChars: queryChars,
      position939: queryChars >= 939 ? shipmentQuery.substring(930, 950) : 'position not in query'
    });
    
    const result = await pool.query(shipmentQuery, [id]);
    logger.info('Query executed successfully', { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    const row = result.rows[0];

    // Format the response with admin-specific data
    const shipment = {
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
      estimated_delivery_date: row.estimated_delivery_date,
      actual_pickup_date: row.actual_pickup_date,
      actual_delivery_date: row.actual_delivery_date,
      createdAt: row.created_at,
      created_at: row.created_at,
      updatedAt: row.updated_at,
      updated_at: row.updated_at,
      // Admin-specific data (customer lookup would require separate query due to schema mismatch)
      customer: null, // TODO: Fix customer_id schema mismatch (INTEGER vs UUID)
      document: row.original_filename ? {
        filename: row.original_filename,
        filePath: row.file_path,
        type: row.document_type,
        confidence: row.confidence_score,
        uploadedAt: row.uploaded_at
      } : null,
      extractedFields: row.ocr_results || null
    };

    res.json({
      success: true,
      data: shipment
    });

  } catch (error) {
    logger.error('Error fetching admin shipment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment details'
    });
  }
});

// PUT /api/admin/shipments/:id/status - Update shipment status (admin only)
router.put('/:id/status', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} updating shipment ${id} status to: ${status}`);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status enum
    const validStatuses = [
      'CREATED', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 'CONFIRMED',
      'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE', 'CUSTOMS_EXPORT',
      'IN_TRANSIT', 'ARRIVED_DESTINATION', 'CUSTOMS_IMPORT', 'OUT_FOR_DELIVERY',
      'DELIVERED', 'CANCELLED', 'EXPIRED'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update shipment status
    const updateQuery = `
      UPDATE shipments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE shipment_id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    const updatedShipment = result.rows[0];

    // TODO: Create status history entry
    logger.info(`Shipment ${id} status updated to ${status} by admin ${adminId}`);

    res.json({
      success: true,
      data: {
        shipment_id: updatedShipment.shipment_id,
        status: updatedShipment.status,
        updated_at: updatedShipment.updated_at
      },
      message: 'Shipment status updated successfully'
    });

  } catch (error) {
    logger.error('Error updating shipment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment status'
    });
  }
});

export default router;