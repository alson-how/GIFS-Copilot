/**
 * Shipment Repository
 * Data access layer for shipment-related operations
 */

import { BaseRepository } from './BaseRepository.js';
import { serviceLogger } from '../utils/logger.js';

export class ShipmentRepository extends BaseRepository {
  constructor() {
    super('shipments', 'shipment_id');
  }

  /**
   * Find shipments with their files
   * @param {Object} conditions - WHERE conditions
   * @param {Object} options - Query options
   * @returns {Array} Shipments with file information
   */
  async findWithFiles(conditions = {}, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findWithFiles', { conditions });

      let query = `
        SELECT 
          s.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sf.id,
                'tag', sf.tag,
                'original_name', sf.original_name,
                'mime_type', sf.mime_type,
                'file_path', sf.file_path,
                'size_bytes', sf.size_bytes,
                'uploaded_at', sf.uploaded_at
              ) ORDER BY sf.uploaded_at DESC
            ) FILTER (WHERE sf.id IS NOT NULL),
            '[]'::json
          ) as files
        FROM shipments s
        LEFT JOIN shipment_files sf ON s.shipment_id = sf.shipment_id
      `;

      const params = [];

      // Add WHERE conditions
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `s.${key} = $${index + 1}`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }

      query += ' GROUP BY s.shipment_id';

      // Add ORDER BY
      if (options.orderBy) {
        query += ` ORDER BY s.${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY s.created_at DESC';
      }

      // Add LIMIT and OFFSET
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }

      const results = await this.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'findWithFiles', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findWithFiles', error, { conditions });
      throw error;
    }
  }

  /**
   * Find shipment by ID with all related data
   * @param {string} id - Shipment ID
   * @returns {Object|null} Complete shipment data
   */
  async findCompleteById(id) {
    try {
      serviceLogger.start(this.constructor.name, 'findCompleteById', { id });

      const query = `
        SELECT 
          s.*,
          -- Compliance records
          cr.hs_code as compliance_hs_code,
          cr.product_type as compliance_product_type,
          cr.tech_origin as compliance_tech_origin,
          cr.is_strategic,
          cr.extraction_json,
          -- AI chip control data
          ac.aica_done,
          ac.export_notice_30d,
          ac.reexport_license_needed,
          ac.reexport_license_number,
          ac.sta_permit_ai,
          ac.sta_permit_ai_number,
          -- End user screening
          eus.destination_country,
          eus.end_user_name,
          eus.screen_result,
          eus.evidence,
          -- Documents
          d.hs_code as doc_hs_code,
          d.hs_validated,
          d.pco_number,
          d.k2_ready,
          d.permit_refs,
          -- Files
          COALESCE(
            json_agg(
              json_build_object(
                'id', sf.id,
                'tag', sf.tag,
                'original_name', sf.original_name,
                'mime_type', sf.mime_type,
                'file_path', sf.file_path,
                'size_bytes', sf.size_bytes,
                'uploaded_at', sf.uploaded_at
              ) ORDER BY sf.uploaded_at DESC
            ) FILTER (WHERE sf.id IS NOT NULL),
            '[]'::json
          ) as files
        FROM shipments s
        LEFT JOIN compliance_records cr ON s.shipment_id = cr.shipment_id
        LEFT JOIN ai_chip_control ac ON s.shipment_id = ac.shipment_id
        LEFT JOIN end_user_screening eus ON s.shipment_id = eus.shipment_id
        LEFT JOIN documents d ON s.shipment_id = d.shipment_id
        LEFT JOIN shipment_files sf ON s.shipment_id = sf.shipment_id
        WHERE s.shipment_id = $1
        GROUP BY s.shipment_id, cr.shipment_id, ac.shipment_id, eus.shipment_id, d.shipment_id
      `;

      const result = await this.rawQuery(query, [id]);
      const shipment = result.rows.length > 0 ? result.rows[0] : null;

      serviceLogger.success(this.constructor.name, 'findCompleteById', { found: !!shipment });
      return shipment;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findCompleteById', error, { id });
      throw error;
    }
  }

  /**
   * Find shipments by status
   * @param {string} status - Shipment status
   * @param {Object} options - Query options
   * @returns {Array} Shipments with matching status
   */
  async findByStatus(status, options = {}) {
    return this.findAll({ status }, options);
  }

  /**
   * Find active shipments (not completed or cancelled)
   * @param {Object} options - Query options
   * @returns {Array} Active shipments
   */
  async findActive(options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findActive');

      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE status NOT IN ('completed', 'cancelled')
      `;
      const params = [];

      // Add ORDER BY
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY created_at DESC';
      }

      // Add LIMIT and OFFSET
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }

      const results = await this.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'findActive', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findActive', error);
      throw error;
    }
  }

  /**
   * Search shipments by multiple criteria
   * @param {Object} searchCriteria - Search parameters
   * @returns {Array} Matching shipments
   */
  async search(searchCriteria) {
    try {
      serviceLogger.start(this.constructor.name, 'search', { searchCriteria });

      const { 
        reference,
        status,
        origin,
        destination,
        fromDate,
        toDate,
        limit = 50,
        offset = 0
      } = searchCriteria;

      let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (reference) {
        query += ` AND (reference ILIKE $${paramIndex} OR id::text = $${paramIndex})`;
        params.push(`%${reference}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (origin) {
        query += ` AND origin ILIKE $${paramIndex}`;
        params.push(`%${origin}%`);
        paramIndex++;
      }

      if (destination) {
        query += ` AND destination ILIKE $${paramIndex}`;
        params.push(`%${destination}%`);
        paramIndex++;
      }

      if (fromDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const results = await this.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'search', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'search', error, { searchCriteria });
      throw error;
    }
  }

  /**
   * Update shipment status
   * @param {string} id - Shipment ID
   * @param {string} status - New status
   * @param {string} statusReason - Reason for status change
   * @returns {Object|null} Updated shipment
   */
  async updateStatus(id, status, statusReason = null) {
    try {
      serviceLogger.start(this.constructor.name, 'updateStatus', { id, status });

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (statusReason) {
        updateData.status_reason = statusReason;
      }

      const result = await this.updateById(id, updateData);

      serviceLogger.success(this.constructor.name, 'updateStatus', { updated: !!result });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'updateStatus', error, { id, status });
      throw error;
    }
  }
}

export default ShipmentRepository;