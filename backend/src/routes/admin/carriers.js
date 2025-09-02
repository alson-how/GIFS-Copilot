/**
 * Admin Carrier Management Routes
 * Routes for managing carriers, services, and pricing
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

// GET /api/admin/carriers - List all carriers with services
router.get('/', authAdmin, async (req, res) => {
  try {
    const { includeInactive = 'false' } = req.query;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching carriers`, { includeInactive });

    const whereClause = includeInactive === 'true' ? '' : 'WHERE c.is_active = true';

    const carriersQuery = `
      SELECT 
        c.carrier_id,
        c.name,
        c.code,
        c.is_active,
        c.contact_email,
        c.contact_phone,
        c.website,
        c.description,
        c.default_margin_percentage,
        c.created_at,
        c.updated_at,
        COUNT(cs.service_id) as service_count,
        COUNT(CASE WHEN cs.is_active = true THEN 1 END) as active_service_count
      FROM carriers c
      LEFT JOIN carrier_services cs ON c.carrier_id = cs.carrier_id
      ${whereClause}
      GROUP BY c.carrier_id, c.name, c.code, c.is_active, c.contact_email, 
               c.contact_phone, c.website, c.description, c.default_margin_percentage,
               c.created_at, c.updated_at
      ORDER BY c.name ASC
    `;

    const result = await pool.query(carriersQuery);

    logger.info(`Found ${result.rows.length} carriers`);

    res.json({
      success: true,
      data: {
        carriers: result.rows.map(row => ({
          carrier_id: row.carrier_id,
          name: row.name,
          code: row.code,
          is_active: row.is_active,
          contact_email: row.contact_email,
          contact_phone: row.contact_phone,
          website: row.website,
          description: row.description,
          default_margin_percentage: parseFloat(row.default_margin_percentage),
          service_count: parseInt(row.service_count),
          active_service_count: parseInt(row.active_service_count),
          created_at: row.created_at,
          updated_at: row.updated_at
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching carriers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carriers'
    });
  }
});

// GET /api/admin/carriers/:id - Get specific carrier with services and pricing
router.get('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching carrier details: ${id}`);

    // Get carrier details
    const carrierQuery = `
      SELECT * FROM carriers WHERE carrier_id = $1
    `;
    const carrierResult = await pool.query(carrierQuery, [id]);

    if (carrierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Carrier not found'
      });
    }

    // Get carrier services
    const servicesQuery = `
      SELECT 
        cs.*,
        COUNT(cp.pricing_id) as pricing_count
      FROM carrier_services cs
      LEFT JOIN carrier_pricing cp ON cs.service_id = cp.service_id AND cp.is_active = true
      WHERE cs.carrier_id = $1
      GROUP BY cs.service_id, cs.carrier_id, cs.service_name, cs.service_code, 
               cs.service_type, cs.is_active, cs.min_weight_kg, cs.max_weight_kg,
               cs.min_dimensions_cm, cs.max_dimensions_cm, cs.transit_days_min,
               cs.transit_days_max, cs.description, cs.created_at, cs.updated_at
      ORDER BY cs.service_name ASC
    `;
    const servicesResult = await pool.query(servicesQuery, [id]);

    const carrier = {
      ...carrierResult.rows[0],
      default_margin_percentage: parseFloat(carrierResult.rows[0].default_margin_percentage),
      services: servicesResult.rows.map(service => ({
        ...service,
        min_weight_kg: parseFloat(service.min_weight_kg),
        max_weight_kg: parseFloat(service.max_weight_kg),
        pricing_count: parseInt(service.pricing_count)
      }))
    };

    res.json({
      success: true,
      data: carrier
    });

  } catch (error) {
    logger.error('Error fetching carrier details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carrier details'
    });
  }
});

// POST /api/admin/carriers - Create new carrier
router.post('/', authAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      contact_email,
      contact_phone,
      website,
      description,
      default_margin_percentage = 15.00,
      is_active = true
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} creating new carrier: ${name}`);

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Carrier name and code are required'
      });
    }

    const insertQuery = `
      INSERT INTO carriers (
        name, code, contact_email, contact_phone, website, 
        description, default_margin_percentage, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      name, code, contact_email, contact_phone, website,
      description, default_margin_percentage, is_active
    ]);

    logger.info(`Carrier created successfully: ${result.rows[0].carrier_id}`);

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        default_margin_percentage: parseFloat(result.rows[0].default_margin_percentage)
      },
      message: 'Carrier created successfully'
    });

  } catch (error) {
    logger.error('Error creating carrier:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Carrier name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create carrier'
    });
  }
});

// PUT /api/admin/carriers/:id - Update carrier
router.put('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      contact_email,
      contact_phone,
      website,
      description,
      default_margin_percentage,
      is_active
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} updating carrier: ${id}`);

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (code !== undefined) {
      updateFields.push(`code = $${paramCount++}`);
      values.push(code);
    }
    if (contact_email !== undefined) {
      updateFields.push(`contact_email = $${paramCount++}`);
      values.push(contact_email);
    }
    if (contact_phone !== undefined) {
      updateFields.push(`contact_phone = $${paramCount++}`);
      values.push(contact_phone);
    }
    if (website !== undefined) {
      updateFields.push(`website = $${paramCount++}`);
      values.push(website);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (default_margin_percentage !== undefined) {
      updateFields.push(`default_margin_percentage = $${paramCount++}`);
      values.push(default_margin_percentage);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id); // Add ID as last parameter
    const updateQuery = `
      UPDATE carriers 
      SET ${updateFields.join(', ')}
      WHERE carrier_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Carrier not found'
      });
    }

    logger.info(`Carrier updated successfully: ${id}`);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        default_margin_percentage: parseFloat(result.rows[0].default_margin_percentage)
      },
      message: 'Carrier updated successfully'
    });

  } catch (error) {
    logger.error('Error updating carrier:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Carrier name or code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update carrier'
    });
  }
});

// DELETE /api/admin/carriers/:id - Delete carrier (soft delete by setting inactive)
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} deleting carrier: ${id}`);

    const updateQuery = `
      UPDATE carriers 
      SET is_active = false
      WHERE carrier_id = $1
      RETURNING name
    `;

    const result = await pool.query(updateQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Carrier not found'
      });
    }

    logger.info(`Carrier deactivated successfully: ${id}`);

    res.json({
      success: true,
      message: `Carrier "${result.rows[0].name}" has been deactivated`
    });

  } catch (error) {
    logger.error('Error deleting carrier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete carrier'
    });
  }
});

// GET /api/admin/carriers/:id/services - Get carrier services
router.get('/:id/services', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching services for carrier: ${id}`);

    const servicesQuery = `
      SELECT 
        cs.*,
        COUNT(cp.pricing_id) as pricing_count
      FROM carrier_services cs
      LEFT JOIN carrier_pricing cp ON cs.service_id = cp.service_id AND cp.is_active = true
      WHERE cs.carrier_id = $1
      GROUP BY cs.service_id, cs.carrier_id, cs.service_name, cs.service_code, 
               cs.service_type, cs.is_active, cs.min_weight_kg, cs.max_weight_kg,
               cs.min_dimensions_cm, cs.max_dimensions_cm, cs.transit_days_min,
               cs.transit_days_max, cs.description, cs.created_at, cs.updated_at
      ORDER BY cs.service_name ASC
    `;

    const result = await pool.query(servicesQuery, [id]);

    res.json({
      success: true,
      data: {
        services: result.rows.map(service => ({
          ...service,
          min_weight_kg: parseFloat(service.min_weight_kg),
          max_weight_kg: parseFloat(service.max_weight_kg),
          pricing_count: parseInt(service.pricing_count)
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching carrier services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carrier services'
    });
  }
});

// GET /api/admin/carriers/:id/pricing - Get carrier pricing for all services
router.get('/:id/pricing', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { origin_country, destination_country } = req.query;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching pricing for carrier: ${id}`, {
      origin_country, destination_country
    });

    let whereClause = 'WHERE cs.carrier_id = $1 AND cp.is_active = true';
    const params = [id];
    let paramCount = 2;

    if (origin_country) {
      whereClause += ` AND cp.origin_country = $${paramCount}`;
      params.push(origin_country);
      paramCount++;
    }

    if (destination_country) {
      whereClause += ` AND cp.destination_country = $${paramCount}`;
      params.push(destination_country);
      paramCount++;
    }

    const pricingQuery = `
      SELECT 
        cp.*,
        cs.service_name,
        cs.service_code,
        cs.service_type,
        c.name as carrier_name
      FROM carrier_pricing cp
      JOIN carrier_services cs ON cp.service_id = cs.service_id
      JOIN carriers c ON cs.carrier_id = c.carrier_id
      ${whereClause}
      ORDER BY cp.origin_country, cp.destination_country, cs.service_name
    `;

    const result = await pool.query(pricingQuery, params);

    res.json({
      success: true,
      data: {
        pricing: result.rows.map(row => ({
          ...row,
          rate_per_kg: parseFloat(row.rate_per_kg),
          minimum_charge: parseFloat(row.minimum_charge),
          fuel_surcharge_percentage: parseFloat(row.fuel_surcharge_percentage),
          handling_fee: parseFloat(row.handling_fee),
          weight_from_kg: parseFloat(row.weight_from_kg),
          weight_to_kg: parseFloat(row.weight_to_kg)
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching carrier pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carrier pricing'
    });
  }
});

// GET /api/admin/carriers/calculate-rates - Calculate shipping rates for quote
router.post('/calculate-rates', authAdmin, async (req, res) => {
  try {
    const {
      origin_country = 'Malaysia',
      destination_country,
      weight_kg,
      selected_carriers = []
    } = req.body;

    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} calculating rates`, {
      origin_country, destination_country, weight_kg, selected_carriers
    });

    if (!destination_country || !weight_kg) {
      return res.status(400).json({
        success: false,
        error: 'Destination country and weight are required'
      });
    }

    let carrierFilter = '';
    const params = [origin_country, destination_country, weight_kg, weight_kg];

    if (selected_carriers.length > 0) {
      const placeholders = selected_carriers.map((_, index) => `$${5 + index}`).join(',');
      carrierFilter = `AND c.code IN (${placeholders})`;
      params.push(...selected_carriers);
    }

    const ratesQuery = `
      SELECT 
        c.name as carrier_name,
        c.code as carrier_code,
        c.default_margin_percentage,
        cs.service_name,
        cs.service_code,
        cs.service_type,
        cs.transit_days_min,
        cs.transit_days_max,
        cp.rate_per_kg,
        cp.minimum_charge,
        cp.fuel_surcharge_percentage,
        cp.handling_fee,
        cp.currency,
        ($3 * cp.rate_per_kg) as weight_cost,
        GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) as base_cost,
        (GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) * cp.fuel_surcharge_percentage / 100) as fuel_surcharge,
        cp.handling_fee as handling_cost,
        (
          GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) +
          (GREATEST($4 * cp.rate_per_kg, cp.minimum_charge) * cp.fuel_surcharge_percentage / 100) +
          cp.handling_fee
        ) as total_cost_before_margin
      FROM carriers c
      JOIN carrier_services cs ON c.carrier_id = cs.carrier_id
      JOIN carrier_pricing cp ON cs.service_id = cp.service_id
      WHERE cp.origin_country = $1 
        AND cp.destination_country = $2
        AND cp.weight_from_kg <= $3 
        AND cp.weight_to_kg >= $4
        AND cp.is_active = true
        AND cs.is_active = true
        AND c.is_active = true
        ${carrierFilter}
      ORDER BY total_cost_before_margin ASC
    `;

    const result = await pool.query(ratesQuery, params);

    const rates = result.rows.map(row => {
      const totalCostBeforeMargin = parseFloat(row.total_cost_before_margin);
      const marginPercentage = parseFloat(row.default_margin_percentage);
      const totalCostWithMargin = totalCostBeforeMargin * (1 + marginPercentage / 100);

      return {
        carrier_name: row.carrier_name,
        carrier_code: row.carrier_code,
        service_name: row.service_name,
        service_code: row.service_code,
        service_type: row.service_type,
        transit_days_min: row.transit_days_min,
        transit_days_max: row.transit_days_max,
        rate_per_kg: parseFloat(row.rate_per_kg),
        minimum_charge: parseFloat(row.minimum_charge),
        weight_cost: parseFloat(row.weight_cost),
        base_cost: parseFloat(row.base_cost),
        fuel_surcharge_percentage: parseFloat(row.fuel_surcharge_percentage),
        fuel_surcharge: parseFloat(row.fuel_surcharge),
        handling_fee: parseFloat(row.handling_fee),
        total_cost_before_margin: totalCostBeforeMargin,
        margin_percentage: marginPercentage,
        total_cost: Math.round(totalCostWithMargin * 100) / 100,
        currency: row.currency,
        origin: origin_country,
        destination: destination_country,
        weight_kg: parseFloat(weight_kg)
      };
    });

    logger.info(`Found ${rates.length} rate options`);

    res.json({
      success: true,
      data: {
        rates,
        summary: {
          origin_country,
          destination_country,
          weight_kg: parseFloat(weight_kg),
          rate_count: rates.length,
          cheapest_rate: rates.length > 0 ? rates[0].total_cost : null,
          fastest_transit: rates.length > 0 ? Math.min(...rates.map(r => r.transit_days_min)) : null
        }
      }
    });

  } catch (error) {
    logger.error('Error calculating shipping rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate shipping rates'
    });
  }
});

export default router;