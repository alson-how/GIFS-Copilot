/**
 * Strategic Items Repository
 * Handles database operations for strategic items detection and compliance
 */

import { BaseRepository } from './BaseRepository.js';

export class StrategicItemsRepository extends BaseRepository {
  constructor(database) {
    super('strategic_detection_results');
    this.database = database;
  }

  /**
   * Save detection results for a shipment
   * @param {string} shipmentId - Shipment ID
   * @param {Array} detectionResults - Detection results array
   * @returns {Promise<Array>} Saved detection results
   */
  async saveDetectionResults(shipmentId, detectionResults) {
    const client = await this.database.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete existing results for this shipment
      await client.query(
        'DELETE FROM strategic_detection_results WHERE shipment_id = $1',
        [shipmentId]
      );
      
      const savedResults = [];
      
      for (const result of detectionResults) {
        const query = `
          INSERT INTO strategic_detection_results (
            shipment_id, item_id, item_description, hs_code,
            strategic_codes, confidence_score, final_confidence_score,
            is_strategic, risk_level, export_blocked,
            required_permits, manual_review_required,
            detection_engine_version, detection_metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;
        
        const values = [
          shipmentId,
          result.item_id || null,
          result.item_description,
          result.hs_code || null,
          JSON.stringify(result.strategic_codes || []),
          result.confidence_score || 0,
          result.final_confidence_score || 0,
          result.is_strategic || false,
          result.risk_level || 'low',
          result.export_blocked || false,
          JSON.stringify(result.required_permits || []),
          result.manual_review_required || false,
          result.detection_engine_version || '2.0',
          JSON.stringify(result.detection_metadata || {})
        ];
        
        const saveResult = await client.query(query, values);
        savedResults.push(saveResult.rows[0]);
      }
      
      await client.query('COMMIT');
      return savedResults;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get detection results by shipment ID
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Array>} Detection results
   */
  async getByShipmentId(shipmentId) {
    const query = `
      SELECT 
        id, shipment_id, item_id, item_description, hs_code,
        strategic_codes, confidence_score, final_confidence_score,
        is_strategic, risk_level, export_blocked,
        required_permits, manual_review_required,
        detection_engine_version, detection_metadata,
        created_at, updated_at
      FROM strategic_detection_results
      WHERE shipment_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await this.database.query(query, [shipmentId]);
    
    return result.rows.map(row => ({
      ...row,
      strategic_codes: typeof row.strategic_codes === 'string' 
        ? JSON.parse(row.strategic_codes) 
        : row.strategic_codes,
      required_permits: typeof row.required_permits === 'string'
        ? JSON.parse(row.required_permits)
        : row.required_permits,
      detection_metadata: typeof row.detection_metadata === 'string'
        ? JSON.parse(row.detection_metadata)
        : row.detection_metadata
    }));
  }

  /**
   * Get strategic items summary for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} Strategic items summary
   */
  async getShipmentSummary(shipmentId) {
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_items,
        COUNT(CASE WHEN export_blocked = true THEN 1 END) as blocked_items,
        COUNT(CASE WHEN manual_review_required = true THEN 1 END) as items_requiring_review,
        MAX(CASE WHEN is_strategic = true THEN risk_level END) as highest_risk_level,
        AVG(final_confidence_score) as avg_confidence_score,
        ARRAY_AGG(DISTINCT strategic_codes) FILTER (WHERE strategic_codes IS NOT NULL) as all_strategic_codes,
        BOOL_OR(export_blocked) as any_export_blocked
      FROM strategic_detection_results
      WHERE shipment_id = $1
    `;
    
    const result = await this.database.query(query, [shipmentId]);
    const summary = result.rows[0];
    
    // Parse JSON fields
    if (summary.all_strategic_codes) {
      summary.all_strategic_codes = summary.all_strategic_codes
        .filter(codes => codes)
        .map(codes => typeof codes === 'string' ? JSON.parse(codes) : codes)
        .flat();
    }
    
    return summary;
  }

  /**
   * Get detection results by risk level
   * @param {string} riskLevel - Risk level ('low', 'medium', 'high', 'critical')
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Detection results
   */
  async getByRiskLevel(riskLevel, options = {}) {
    const { limit = 100, offset = 0, shipmentId } = options;
    
    let query = `
      SELECT 
        id, shipment_id, item_id, item_description, hs_code,
        strategic_codes, confidence_score, final_confidence_score,
        is_strategic, risk_level, export_blocked,
        required_permits, manual_review_required,
        created_at, updated_at
      FROM strategic_detection_results
      WHERE risk_level = $1
    `;
    
    const values = [riskLevel];
    
    if (shipmentId) {
      query += ' AND shipment_id = $2';
      values.push(shipmentId);
    }
    
    query += ` ORDER BY final_confidence_score DESC, created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    const result = await this.database.query(query, values);
    return result.rows;
  }

  /**
   * Update manual review status
   * @param {string} resultId - Detection result ID
   * @param {boolean} requiresReview - Whether manual review is required
   * @param {string} reason - Reason for review requirement change
   * @returns {Promise<Object>} Updated result
   */
  async updateManualReviewStatus(resultId, requiresReview, reason = null) {
    const query = `
      UPDATE strategic_detection_results
      SET 
        manual_review_required = $2,
        detection_metadata = jsonb_set(
          COALESCE(detection_metadata, '{}'),
          '{manual_review_reason}',
          $3::jsonb
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [resultId, requiresReview, JSON.stringify(reason)];
    const result = await this.database.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Strategic detection result with ID ${resultId} not found`);
    }
    
    return result.rows[0];
  }

  /**
   * Get items requiring manual review
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async getItemsRequiringReview(options = {}) {
    const { page = 1, limit = 20, shipmentId } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE manual_review_required = true';
    const values = [];
    
    if (shipmentId) {
      whereClause += ' AND shipment_id = $1';
      values.push(shipmentId);
    }
    
    // Count query
    const countQuery = `SELECT COUNT(*) FROM strategic_detection_results ${whereClause}`;
    const countResult = await this.database.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    
    // Data query
    const dataQuery = `
      SELECT 
        id, shipment_id, item_id, item_description, hs_code,
        strategic_codes, confidence_score, final_confidence_score,
        is_strategic, risk_level, export_blocked,
        required_permits, manual_review_required,
        detection_metadata, created_at, updated_at
      FROM strategic_detection_results
      ${whereClause}
      ORDER BY 
        CASE WHEN risk_level = 'critical' THEN 1
             WHEN risk_level = 'high' THEN 2
             WHEN risk_level = 'medium' THEN 3
             ELSE 4 END,
        created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    
    values.push(limit, offset);
    const dataResult = await this.database.query(dataQuery, values);
    
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get compliance statistics
   * @param {Object} filters - Date and other filters
   * @returns {Promise<Object>} Statistics
   */
  async getComplianceStatistics(filters = {}) {
    const { startDate, endDate, shipmentId } = filters;
    
    let whereClause = 'WHERE 1=1';
    const values = [];
    
    if (startDate) {
      whereClause += ' AND created_at >= $' + (values.length + 1);
      values.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND created_at <= $' + (values.length + 1);
      values.push(endDate);
    }
    
    if (shipmentId) {
      whereClause += ' AND shipment_id = $' + (values.length + 1);
      values.push(shipmentId);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_items,
        COUNT(CASE WHEN export_blocked = true THEN 1 END) as blocked_items,
        COUNT(CASE WHEN manual_review_required = true THEN 1 END) as items_requiring_review,
        
        -- Risk level breakdown
        COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_items,
        COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_items,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_items,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_risk_items,
        
        -- Confidence statistics
        AVG(final_confidence_score) as avg_confidence_score,
        MIN(final_confidence_score) as min_confidence_score,
        MAX(final_confidence_score) as max_confidence_score,
        
        -- Time statistics
        MIN(created_at) as earliest_detection,
        MAX(created_at) as latest_detection,
        
        -- Unique shipments
        COUNT(DISTINCT shipment_id) as unique_shipments
      FROM strategic_detection_results
      ${whereClause}
    `;
    
    const result = await this.database.query(query, values);
    return result.rows[0];
  }

  /**
   * Create audit trail entry
   * @param {string} shipmentId - Shipment ID
   * @param {string} actionType - Action type
   * @param {Object} actionDetails - Action details
   * @returns {Promise<Object>} Created audit entry
   */
  async createAuditTrail(shipmentId, actionType, actionDetails) {
    const query = `
      INSERT INTO strategic_audit_trail (
        shipment_id, action_type, action_details, created_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [shipmentId, actionType, JSON.stringify(actionDetails)];
    const result = await this.database.query(query, values);
    
    return result.rows[0];
  }

  /**
   * Delete detection results for a shipment
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<number>} Number of deleted records
   */
  async deleteByShipmentId(shipmentId) {
    const query = 'DELETE FROM strategic_detection_results WHERE shipment_id = $1';
    const result = await this.database.query(query, [shipmentId]);
    
    return result.rowCount;
  }

  /**
   * Search detection results with complex criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async searchDetectionResults(criteria = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    
    const conditions = [];
    const values = [];
    let paramCount = 0;
    
    // Build WHERE conditions
    if (criteria.shipment_id) {
      paramCount++;
      conditions.push(`shipment_id = $${paramCount}`);
      values.push(criteria.shipment_id);
    }
    
    if (criteria.is_strategic !== undefined) {
      paramCount++;
      conditions.push(`is_strategic = $${paramCount}`);
      values.push(criteria.is_strategic);
    }
    
    if (criteria.risk_level) {
      paramCount++;
      conditions.push(`risk_level = $${paramCount}`);
      values.push(criteria.risk_level);
    }
    
    if (criteria.export_blocked !== undefined) {
      paramCount++;
      conditions.push(`export_blocked = $${paramCount}`);
      values.push(criteria.export_blocked);
    }
    
    if (criteria.manual_review_required !== undefined) {
      paramCount++;
      conditions.push(`manual_review_required = $${paramCount}`);
      values.push(criteria.manual_review_required);
    }
    
    if (criteria.hs_code) {
      paramCount++;
      conditions.push(`hs_code LIKE $${paramCount}`);
      values.push(`%${criteria.hs_code}%`);
    }
    
    if (criteria.item_description) {
      paramCount++;
      conditions.push(`item_description ILIKE $${paramCount}`);
      values.push(`%${criteria.item_description}%`);
    }
    
    if (criteria.min_confidence) {
      paramCount++;
      conditions.push(`final_confidence_score >= $${paramCount}`);
      values.push(criteria.min_confidence);
    }
    
    if (criteria.strategic_codes && Array.isArray(criteria.strategic_codes)) {
      paramCount++;
      conditions.push(`strategic_codes ?| $${paramCount}`);
      values.push(criteria.strategic_codes);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Count query
    const countQuery = `SELECT COUNT(*) FROM strategic_detection_results ${whereClause}`;
    const countResult = await this.database.query(countQuery, values.slice(0, paramCount));
    const total = parseInt(countResult.rows[0].count);
    
    // Data query
    const dataQuery = `
      SELECT 
        id, shipment_id, item_id, item_description, hs_code,
        strategic_codes, confidence_score, final_confidence_score,
        is_strategic, risk_level, export_blocked,
        required_permits, manual_review_required,
        detection_engine_version, detection_metadata,
        created_at, updated_at
      FROM strategic_detection_results
      ${whereClause}
      ORDER BY final_confidence_score DESC, created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    values.push(limit, offset);
    const dataResult = await this.database.query(dataQuery, values);
    
    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }
}

export default StrategicItemsRepository;