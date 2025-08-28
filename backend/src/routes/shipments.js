// backend/src/routes/shipments.js
import express from 'express';
const router = express.Router();

/**
 * POST /api/shipments/basics
 * body: { shipment_id?, export_date, mode, product_type, hs_code?, description?, tech_origin, destination_country, end_user_name }
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
    end_user_name
  } = req.body || {};

  // Basic validation
  if (!export_date || !mode || !product_type || !tech_origin || !destination_country || !end_user_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Ensure a shipment row exists
  const ensureSql = `INSERT INTO shipments (shipment_id, export_date, mode, product_type, hs_code, tech_origin, destination_country, end_user_name)
                     VALUES (COALESCE($1, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8)
                     ON CONFLICT (shipment_id) DO UPDATE SET
                       export_date=EXCLUDED.export_date,
                       mode=EXCLUDED.mode,
                       product_type=EXCLUDED.product_type,
                       hs_code=EXCLUDED.hs_code,
                       tech_origin=EXCLUDED.tech_origin,
                       destination_country=EXCLUDED.destination_country,
                       end_user_name=EXCLUDED.end_user_name
                     RETURNING shipment_id`;
  const params = [
    shipment_id || null,
    export_date, mode, product_type, hs_code, tech_origin, destination_country, end_user_name
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
 * List all shipments with pagination
 */
router.get('/', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    const result = await req.db.query(
      'SELECT * FROM shipments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );

    const countResult = await req.db.query('SELECT COUNT(*) FROM shipments');
    const total = parseInt(countResult.rows[0].count);

    return res.json({ 
      ok: true, 
      shipments: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
