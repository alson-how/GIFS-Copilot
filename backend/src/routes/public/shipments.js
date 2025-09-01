/**
 * Public Shipments Routes  
 * Public API endpoints for shipments (no authentication required)
 */

import express from 'express';
import pkg from 'pg';
import { logger } from '../../utils/logger.js';

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const router = express.Router();

// GET /api/shipments - List shipments (public access)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, shipmentId, endUser } = req.query;

    logger.info(`Fetching shipments (public access)`, {
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
        step1_status
      FROM shipments 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount-1} OFFSET $${paramCount}
    `;

    const shipmentsResult = await pool.query(shipmentsQuery, queryParams);
    
    // Format shipments for frontend
    const shipments = shipmentsResult.rows.map(row => ({
      id: row.shipment_id,
      shipmentId: row.shipment_id,
      status: row.step1_status || 'pending',
      destination: row.destination_country,
      exportDate: row.export_date,
      totalValue: row.commercial_value,
      currency: row.currency || 'USD',
      endUser: row.end_user_name,
      consignee: row.end_user_name,
      hsCode: row.hs_code,
      incoterms: row.incoterms,
      techOrigin: row.tech_origin,
      productType: row.product_type,
      quantity: row.quantity,
      createdAt: row.created_at,
      updatedAt: row.created_at
    }));

    logger.info(`Found ${shipments.length} shipments out of ${totalShipments} total`);

    res.json({
      ok: true, // Note: Frontend expects 'ok' field based on ShipmentOrdersList component
      success: true,
      shipments: shipments,
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
    logger.error('Error fetching public shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipments'
    });
  }
});

// GET /api/shipments/:id - Get specific shipment details (public access)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching shipment details: ${id} (public access)`);

    // Query shipment details with related documents
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
        s.step1_status,
        s.created_at,
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

    const result = await pool.query(shipmentQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    const row = result.rows[0];

    // Format the response
    const shipment = {
      id: row.shipment_id,
      shipmentId: row.shipment_id,
      status: row.step1_status || 'pending',
      destination: row.destination_country,
      exportDate: row.export_date,
      totalValue: row.commercial_value,
      currency: row.currency || 'USD',
      endUser: row.end_user_name,
      consignee: row.end_user_name,
      hsCode: row.hs_code,
      incoterms: row.incoterms,
      techOrigin: row.tech_origin,
      productType: row.product_type,
      quantity: row.quantity,
      createdAt: row.created_at,
      updatedAt: row.created_at,
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
    logger.error('Error fetching shipment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment details'
    });
  }
});

export default router;