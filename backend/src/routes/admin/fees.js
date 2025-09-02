/**
 * Admin Additional Fees Management Routes
 * Routes for managing additional fees, zones, and weight breaks
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

// ==================== ADDITIONAL FEES ROUTES ====================

// GET /api/admin/fees - List all additional fees
router.get('/', authAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching additional fees`, { category });

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereClause += ` AND category = $${paramCount}`;
      params.push(category);
    }

    const feesQuery = `
      SELECT * FROM additional_fees 
      ${whereClause}
      ORDER BY category, fee_name ASC
    `;

    const result = await pool.query(feesQuery, params);

    // Group fees by category
    const feesByCategory = result.rows.reduce((acc, fee) => {
      if (!acc[fee.category]) {
        acc[fee.category] = [];
      }
      acc[fee.category].push({
        ...fee,
        base_amount: fee.base_amount ? parseFloat(fee.base_amount) : null,
        percentage_rate: fee.percentage_rate ? parseFloat(fee.percentage_rate) : null
      });
      return acc;
    }, {});

    logger.info(`Found ${result.rows.length} additional fees`);

    res.json({
      success: true,
      data: {
        fees: result.rows.map(fee => ({
          ...fee,
          base_amount: fee.base_amount ? parseFloat(fee.base_amount) : null,
          percentage_rate: fee.percentage_rate ? parseFloat(fee.percentage_rate) : null
        })),
        feesByCategory
      }
    });

  } catch (error) {
    logger.error('Error fetching additional fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch additional fees'
    });
  }
});

// POST /api/admin/fees - Create new additional fee
router.post('/', authAdmin, async (req, res) => {
  try {
    const {
      category,
      fee_code,
      fee_name,
      fee_type,
      base_amount,
      percentage_rate,
      calculation_base,
      unit_type,
      description,
      is_required = false,
      applies_to_services = []
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} creating additional fee: ${fee_name}`);

    if (!category || !fee_code || !fee_name || !fee_type) {
      return res.status(400).json({
        success: false,
        error: 'Category, fee code, fee name, and fee type are required'
      });
    }

    const insertQuery = `
      INSERT INTO additional_fees (
        category, fee_code, fee_name, fee_type, base_amount, percentage_rate,
        calculation_base, unit_type, description, is_required, applies_to_services
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      category, fee_code, fee_name, fee_type, base_amount, percentage_rate,
      calculation_base, unit_type, description, is_required, applies_to_services
    ]);

    logger.info(`Additional fee created: ${result.rows[0].fee_id}`);

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        base_amount: result.rows[0].base_amount ? parseFloat(result.rows[0].base_amount) : null,
        percentage_rate: result.rows[0].percentage_rate ? parseFloat(result.rows[0].percentage_rate) : null
      },
      message: 'Additional fee created successfully'
    });

  } catch (error) {
    logger.error('Error creating additional fee:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Fee code already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create additional fee'
    });
  }
});

// PUT /api/admin/fees/:id - Update additional fee
router.put('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} updating additional fee: ${id}`);

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'fee_id') {
        updateFields.push(`${key} = $${paramCount++}`);
        values.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(id);
    const updateQuery = `
      UPDATE additional_fees 
      SET ${updateFields.join(', ')}
      WHERE fee_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Additional fee not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        base_amount: result.rows[0].base_amount ? parseFloat(result.rows[0].base_amount) : null,
        percentage_rate: result.rows[0].percentage_rate ? parseFloat(result.rows[0].percentage_rate) : null
      },
      message: 'Additional fee updated successfully'
    });

  } catch (error) {
    logger.error('Error updating additional fee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update additional fee'
    });
  }
});

// DELETE /api/admin/fees/:id - Delete additional fee
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} deleting additional fee: ${id}`);

    const deleteQuery = `
      UPDATE additional_fees 
      SET is_active = false
      WHERE fee_id = $1
      RETURNING fee_name
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Additional fee not found'
      });
    }

    res.json({
      success: true,
      message: `Additional fee "${result.rows[0].fee_name}" has been deactivated`
    });

  } catch (error) {
    logger.error('Error deleting additional fee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete additional fee'
    });
  }
});

// ==================== SHIPPING ZONES ROUTES ====================

// GET /api/admin/fees/zones - List all shipping zones
router.get('/zones', authAdmin, async (req, res) => {
  try {
    const adminId = req.admin.id;
    logger.info(`Admin ${adminId} fetching shipping zones`);

    const zonesQuery = `
      SELECT * FROM shipping_zones 
      WHERE is_active = true
      ORDER BY zone_number, origin_country, destination_country ASC
    `;

    const result = await pool.query(zonesQuery);

    res.json({
      success: true,
      data: {
        zones: result.rows.map(zone => ({
          ...zone,
          rate_multiplier: parseFloat(zone.rate_multiplier),
          fuel_surcharge_rate: parseFloat(zone.fuel_surcharge_rate)
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching shipping zones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipping zones'
    });
  }
});

// POST /api/admin/fees/zones - Create new shipping zone
router.post('/zones', authAdmin, async (req, res) => {
  try {
    const {
      zone_code,
      zone_name,
      origin_country,
      destination_country,
      zone_number,
      distance_km,
      transit_days_min,
      transit_days_max,
      rate_multiplier,
      fuel_surcharge_rate
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} creating shipping zone: ${zone_name}`);

    const insertQuery = `
      INSERT INTO shipping_zones (
        zone_code, zone_name, origin_country, destination_country, 
        zone_number, distance_km, transit_days_min, transit_days_max,
        rate_multiplier, fuel_surcharge_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      zone_code, zone_name, origin_country, destination_country,
      zone_number, distance_km, transit_days_min, transit_days_max,
      rate_multiplier, fuel_surcharge_rate
    ]);

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        rate_multiplier: parseFloat(result.rows[0].rate_multiplier),
        fuel_surcharge_rate: parseFloat(result.rows[0].fuel_surcharge_rate)
      },
      message: 'Shipping zone created successfully'
    });

  } catch (error) {
    logger.error('Error creating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create shipping zone'
    });
  }
});

// PUT /api/admin/fees/zones/:id - Update shipping zone
router.put('/zones/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} updating shipping zone: ${id}`);

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'zone_id') {
        updateFields.push(`${key} = $${paramCount++}`);
        values.push(updateData[key]);
      }
    });

    values.push(id);
    const updateQuery = `
      UPDATE shipping_zones 
      SET ${updateFields.join(', ')}
      WHERE zone_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipping zone not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        rate_multiplier: parseFloat(result.rows[0].rate_multiplier),
        fuel_surcharge_rate: parseFloat(result.rows[0].fuel_surcharge_rate)
      },
      message: 'Shipping zone updated successfully'
    });

  } catch (error) {
    logger.error('Error updating shipping zone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipping zone'
    });
  }
});

// DELETE /api/admin/fees/zones/:id - Delete shipping zone
router.delete('/zones/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} deleting shipping zone: ${id}`);

    const deleteQuery = `
      UPDATE shipping_zones 
      SET is_active = false
      WHERE zone_id = $1
      RETURNING zone_name
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Shipping zone not found'
      });
    }

    res.json({
      success: true,
      message: `Shipping zone "${result.rows[0].zone_name}" has been deactivated`
    });

  } catch (error) {
    logger.error('Error deleting shipping zone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete shipping zone'
    });
  }
});

// ==================== WEIGHT BREAKS ROUTES ====================

// GET /api/admin/fees/weight-breaks - List all weight breaks
router.get('/weight-breaks', authAdmin, async (req, res) => {
  try {
    const { service_type } = req.query;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} fetching weight breaks`, { service_type });

    let whereClause = 'WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    if (service_type) {
      paramCount++;
      whereClause += ` AND service_type = $${paramCount}`;
      params.push(service_type);
    }

    const weightsQuery = `
      SELECT * FROM weight_breaks 
      ${whereClause}
      ORDER BY service_type, weight_min_kg ASC
    `;

    const result = await pool.query(weightsQuery, params);

    // Group by service type
    const weightsByService = result.rows.reduce((acc, wb) => {
      const serviceType = wb.service_type || 'general';
      if (!acc[serviceType]) {
        acc[serviceType] = [];
      }
      acc[serviceType].push({
        ...wb,
        weight_min_kg: parseFloat(wb.weight_min_kg),
        weight_max_kg: parseFloat(wb.weight_max_kg),
        rate_per_kg: parseFloat(wb.rate_per_kg),
        minimum_charge: wb.minimum_charge ? parseFloat(wb.minimum_charge) : null
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        weightBreaks: result.rows.map(wb => ({
          ...wb,
          weight_min_kg: parseFloat(wb.weight_min_kg),
          weight_max_kg: parseFloat(wb.weight_max_kg),
          rate_per_kg: parseFloat(wb.rate_per_kg),
          minimum_charge: wb.minimum_charge ? parseFloat(wb.minimum_charge) : null
        })),
        weightsByService
      }
    });

  } catch (error) {
    logger.error('Error fetching weight breaks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weight breaks'
    });
  }
});

// POST /api/admin/fees/weight-breaks - Create new weight break
router.post('/weight-breaks', authAdmin, async (req, res) => {
  try {
    const {
      break_name,
      service_type,
      origin_country,
      destination_country,
      weight_min_kg,
      weight_max_kg,
      rate_per_kg,
      minimum_charge
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} creating weight break: ${break_name}`);

    const insertQuery = `
      INSERT INTO weight_breaks (
        break_name, service_type, origin_country, destination_country,
        weight_min_kg, weight_max_kg, rate_per_kg, minimum_charge
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      break_name, service_type, origin_country, destination_country,
      weight_min_kg, weight_max_kg, rate_per_kg, minimum_charge
    ]);

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        weight_min_kg: parseFloat(result.rows[0].weight_min_kg),
        weight_max_kg: parseFloat(result.rows[0].weight_max_kg),
        rate_per_kg: parseFloat(result.rows[0].rate_per_kg),
        minimum_charge: result.rows[0].minimum_charge ? parseFloat(result.rows[0].minimum_charge) : null
      },
      message: 'Weight break created successfully'
    });

  } catch (error) {
    logger.error('Error creating weight break:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create weight break'
    });
  }
});

// PUT /api/admin/fees/weight-breaks/:id - Update weight break
router.put('/weight-breaks/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} updating weight break: ${id}`);

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && key !== 'break_id') {
        updateFields.push(`${key} = $${paramCount++}`);
        values.push(updateData[key]);
      }
    });

    values.push(id);
    const updateQuery = `
      UPDATE weight_breaks 
      SET ${updateFields.join(', ')}
      WHERE break_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Weight break not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        weight_min_kg: parseFloat(result.rows[0].weight_min_kg),
        weight_max_kg: parseFloat(result.rows[0].weight_max_kg),
        rate_per_kg: parseFloat(result.rows[0].rate_per_kg),
        minimum_charge: result.rows[0].minimum_charge ? parseFloat(result.rows[0].minimum_charge) : null
      },
      message: 'Weight break updated successfully'
    });

  } catch (error) {
    logger.error('Error updating weight break:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update weight break'
    });
  }
});

// DELETE /api/admin/fees/weight-breaks/:id - Delete weight break
router.delete('/weight-breaks/:id', authAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} deleting weight break: ${id}`);

    const deleteQuery = `
      UPDATE weight_breaks 
      SET is_active = false
      WHERE break_id = $1
      RETURNING break_name
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Weight break not found'
      });
    }

    res.json({
      success: true,
      message: `Weight break "${result.rows[0].break_name}" has been deactivated`
    });

  } catch (error) {
    logger.error('Error deleting weight break:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete weight break'
    });
  }
});

// ==================== CALCULATION ROUTES ====================

// POST /api/admin/fees/calculate - Calculate total fees for a shipment
router.post('/calculate', authAdmin, async (req, res) => {
  try {
    const {
      commodity_value,
      base_rate,
      weight_kg,
      service_type,
      origin_country = 'Malaysia',
      destination_country,
      selected_fees = []
    } = req.body;
    const adminId = req.admin.id;

    logger.info(`Admin ${adminId} calculating fees`, {
      commodity_value, base_rate, weight_kg, service_type, origin_country, destination_country
    });

    if (!commodity_value || !base_rate || !weight_kg || !destination_country) {
      return res.status(400).json({
        success: false,
        error: 'Commodity value, base rate, weight, and destination country are required'
      });
    }

    // Get applicable fees
    let feesQuery = `
      SELECT * FROM additional_fees 
      WHERE is_active = true
      AND (is_required = true OR fee_code = ANY($1))
    `;
    
    const feesResult = await pool.query(feesQuery, [selected_fees]);
    
    // Calculate each fee
    const calculatedFees = [];
    let totalAdditionalFees = 0;

    for (const fee of feesResult.rows) {
      let amount = 0;

      switch (fee.fee_type) {
        case 'fixed':
          amount = parseFloat(fee.base_amount);
          break;
        case 'percentage':
          const rate = parseFloat(fee.percentage_rate) / 100;
          if (fee.calculation_base === 'commodity_value') {
            amount = commodity_value * rate;
          } else if (fee.calculation_base === 'base_rate') {
            amount = base_rate * rate;
          }
          break;
        case 'per_unit':
          amount = parseFloat(fee.base_amount) * weight_kg;
          break;
      }

      amount = Math.round(amount * 100) / 100; // Round to 2 decimal places
      totalAdditionalFees += amount;

      calculatedFees.push({
        fee_code: fee.fee_code,
        fee_name: fee.fee_name,
        fee_type: fee.fee_type,
        amount,
        is_required: fee.is_required,
        description: fee.description
      });
    }

    // Get zone multiplier
    const zoneQuery = `
      SELECT rate_multiplier, fuel_surcharge_rate FROM shipping_zones 
      WHERE origin_country = $1 AND destination_country = $2 AND is_active = true
    `;
    const zoneResult = await pool.query(zoneQuery, [origin_country, destination_country]);
    
    const zoneMultiplier = zoneResult.rows.length > 0 ? parseFloat(zoneResult.rows[0].rate_multiplier) : 1.0;
    const zoneFuelSurcharge = zoneResult.rows.length > 0 ? parseFloat(zoneResult.rows[0].fuel_surcharge_rate) : 0.0;

    // Get weight break rate
    const weightQuery = `
      SELECT rate_per_kg, minimum_charge FROM weight_breaks 
      WHERE (service_type = $1 OR service_type IS NULL)
      AND weight_min_kg <= $2 AND weight_max_kg >= $3
      AND is_active = true
      ORDER BY weight_min_kg DESC
      LIMIT 1
    `;
    const weightResult = await pool.query(weightQuery, [service_type, weight_kg, weight_kg]);
    
    let weightBreakRate = null;
    if (weightResult.rows.length > 0) {
      weightBreakRate = {
        rate_per_kg: parseFloat(weightResult.rows[0].rate_per_kg),
        minimum_charge: weightResult.rows[0].minimum_charge ? parseFloat(weightResult.rows[0].minimum_charge) : null
      };
    }

    const totalCost = base_rate + totalAdditionalFees;

    res.json({
      success: true,
      data: {
        calculation: {
          base_rate: parseFloat(base_rate),
          zone_multiplier: zoneMultiplier,
          fuel_surcharge_rate: zoneFuelSurcharge,
          weight_break_rate: weightBreakRate,
          additional_fees: calculatedFees,
          total_additional_fees: Math.round(totalAdditionalFees * 100) / 100,
          total_cost: Math.round(totalCost * 100) / 100,
          parameters: {
            commodity_value: parseFloat(commodity_value),
            weight_kg: parseFloat(weight_kg),
            service_type,
            origin_country,
            destination_country
          }
        }
      }
    });

  } catch (error) {
    logger.error('Error calculating fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees'
    });
  }
});

export default router;