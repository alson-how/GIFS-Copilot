// backend/src/routes/shipments.js
import express from 'express';
const router = express.Router();

/**
 * POST /api/shipments/basics
 * body: { shipment_id?, export_date, mode, product_type, hs_code?, description?, tech_origin, destination_country, end_user_name, commercial_value, currency, quantity, quantity_unit, incoterms, end_use_purpose?, insurance_required, consignee_registration?, shipment_priority }
 * If hs_code not provided, keep null; your Step 5 will validate later.
 */
router.post('/basics', async (req, res) => {
  const {
    shipment_id,
    export_date,
    mode,
    product_type,
    hs_code = null,
    tech_origin,
    destination_country,
    end_user_name,
    // New critical fields
    commercial_value,
    currency = 'USD',
    quantity,
    quantity_unit = 'PCS',
    incoterms = 'FOB',
    end_use_purpose = null,
    insurance_required = true,
    consignee_registration = null,
    shipment_priority = 'Standard'
  } = req.body || {};

  // Basic validation - include new required fields
  if (!export_date || !mode || !product_type || !tech_origin || !destination_country || !end_user_name || 
      !commercial_value || !quantity || !incoterms) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate commercial value and quantity are positive
  if (parseFloat(commercial_value) <= 0 || parseFloat(quantity) <= 0) {
    return res.status(400).json({ error: 'Commercial value and quantity must be greater than 0' });
  }

  // Ensure a shipment row exists with all fields
  const ensureSql = `INSERT INTO shipments (
                       shipment_id, export_date, mode, product_type, hs_code, tech_origin, 
                       destination_country, end_user_name, commercial_value, currency, 
                       quantity, quantity_unit, incoterms, end_use_purpose, 
                       insurance_required, consignee_registration, shipment_priority
                     )
                     VALUES (COALESCE($1, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
                     ON CONFLICT (shipment_id) DO UPDATE SET
                       export_date=EXCLUDED.export_date,
                       mode=EXCLUDED.mode,
                       product_type=EXCLUDED.product_type,
                       hs_code=EXCLUDED.hs_code,
                       tech_origin=EXCLUDED.tech_origin,
                       destination_country=EXCLUDED.destination_country,
                       end_user_name=EXCLUDED.end_user_name,
                       commercial_value=EXCLUDED.commercial_value,
                       currency=EXCLUDED.currency,
                       quantity=EXCLUDED.quantity,
                       quantity_unit=EXCLUDED.quantity_unit,
                       incoterms=EXCLUDED.incoterms,
                       end_use_purpose=EXCLUDED.end_use_purpose,
                       insurance_required=EXCLUDED.insurance_required,
                       consignee_registration=EXCLUDED.consignee_registration,
                       shipment_priority=EXCLUDED.shipment_priority
                     RETURNING shipment_id`;
  const params = [
    shipment_id || null,
    export_date, mode, product_type, hs_code, tech_origin, destination_country, end_user_name,
    commercial_value, currency, quantity, quantity_unit, incoterms, end_use_purpose,
    insurance_required, consignee_registration, shipment_priority
  ];

  try {
    const r = await req.db.query(ensureSql, params);
    return res.json({ ok: true, shipment_id: r.rows[0].shipment_id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/shipments/:shipment_id
 * Retrieve shipment basic information
 */
router.get('/:shipment_id', async (req, res) => {
  const { shipment_id } = req.params;

  if (!shipment_id) {
    return res.status(400).json({ error: 'Shipment ID required' });
  }

  try {
    const result = await req.db.query(
      'SELECT * FROM shipments WHERE shipment_id = $1',
      [shipment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    return res.json({ ok: true, shipment: result.rows[0] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/shipments
 * List all shipments with pagination and filtering
 * Query params: page, limit, shipmentId, status, endUser
 */
router.get('/', async (req, res) => {
  const { 
    page = 1, 
    limit = 50, 
    shipmentId = '', 
    status = '', 
    endUser = '' 
  } = req.query;

  try {
    // Calculate offset from page number
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause based on filters
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (shipmentId && shipmentId.trim()) {
      paramCount++;
      conditions.push(`shipment_id::text ILIKE $${paramCount}`);
      params.push(`%${shipmentId.trim()}%`);
    }

    if (status && status.trim()) {
      paramCount++;
      conditions.push(`step1_status = $${paramCount}`);
      params.push(status.trim());
    }

    if (endUser && endUser.trim()) {
      paramCount++;
      conditions.push(`end_user_name ILIKE $${paramCount}`);
      params.push(`%${endUser.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query for shipments with filters
    const queryText = `
      SELECT * FROM shipments 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    params.push(limitNum, offset);

    const result = await req.db.query(queryText, params);

    // Count total matching records
    const countQueryText = `SELECT COUNT(*) FROM shipments ${whereClause}`;
    const countParams = params.slice(0, paramCount); // Remove LIMIT and OFFSET params
    const countResult = await req.db.query(countQueryText, countParams);
    const total = parseInt(countResult.rows[0].count);

    return res.json({ 
      ok: true, 
      shipments: result.rows,
      pagination: {
        total,
        limit: limitNum,
        offset: offset,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (e) {
    console.error('Error fetching shipments:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/shipments/:id
 * Get a single shipment by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Shipment ID is required' });
  }

  try {
    const query = 'SELECT * FROM shipments WHERE shipment_id = $1';
    const result = await req.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Shipment not found' });
    }
    
    return res.json(result.rows[0]);
  } catch (e) {
    console.error('Error fetching shipment:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
