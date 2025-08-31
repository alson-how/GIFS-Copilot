/**
 * Compliance Repository
 * Data access layer for compliance-related operations
 */

import { BaseRepository } from './BaseRepository.js';
import { serviceLogger } from '../utils/logger.js';

export class ComplianceRepository extends BaseRepository {
  constructor() {
    super('compliance_records', 'shipment_id');
  }

  /**
   * Find compliance record with AI chip and screening data
   * @param {string} shipmentId - Shipment ID
   * @returns {Object|null} Complete compliance data
   */
  async findCompleteByShipmentId(shipmentId) {
    try {
      serviceLogger.start(this.constructor.name, 'findCompleteByShipmentId', { shipmentId });

      const query = `
        SELECT 
          cr.*,
          ac.aica_done,
          ac.export_notice_30d,
          ac.reexport_license_needed,
          ac.reexport_license_number,
          ac.sta_permit_ai,
          ac.sta_permit_ai_number,
          eus.destination_country,
          eus.end_user_name,
          eus.screen_result,
          eus.evidence,
          d.hs_code as doc_hs_code,
          d.hs_validated,
          d.pco_number,
          d.k2_ready,
          d.permit_refs
        FROM compliance_records cr
        LEFT JOIN ai_chip_control ac ON cr.shipment_id = ac.shipment_id
        LEFT JOIN end_user_screening eus ON cr.shipment_id = eus.shipment_id
        LEFT JOIN documents d ON cr.shipment_id = d.shipment_id
        WHERE cr.shipment_id = $1
      `;

      const result = await this.rawQuery(query, [shipmentId]);
      const compliance = result.rows.length > 0 ? result.rows[0] : null;

      serviceLogger.success(this.constructor.name, 'findCompleteByShipmentId', { found: !!compliance });
      return compliance;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findCompleteByShipmentId', error, { shipmentId });
      throw error;
    }
  }

  /**
   * Find strategic items (flagged for strategic controls)
   * @param {Object} options - Query options
   * @returns {Array} Strategic compliance records
   */
  async findStrategicItems(options = {}) {
    return this.findAll({ is_strategic: true }, options);
  }

  /**
   * Find compliance records by HS code
   * @param {string} hsCode - HS code
   * @param {Object} options - Query options
   * @returns {Array} Compliance records with matching HS code
   */
  async findByHsCode(hsCode, options = {}) {
    return this.findAll({ hs_code: hsCode }, options);
  }

  /**
   * Find compliance records by product type
   * @param {string} productType - Product type
   * @param {Object} options - Query options
   * @returns {Array} Compliance records with matching product type
   */
  async findByProductType(productType, options = {}) {
    return this.findAll({ product_type: productType }, options);
  }

  /**
   * Get compliance statistics
   * @returns {Object} Compliance statistics
   */
  async getStatistics() {
    try {
      serviceLogger.start(this.constructor.name, 'getStatistics');

      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN is_strategic = true THEN 1 END) as strategic_count,
          COUNT(CASE WHEN is_strategic = false THEN 1 END) as non_strategic_count,
          COUNT(DISTINCT hs_code) as unique_hs_codes,
          COUNT(DISTINCT product_type) as unique_product_types,
          COUNT(DISTINCT tech_origin) as unique_origins
        FROM compliance_records
      `;

      const result = await this.rawQuery(query);
      const stats = result.rows[0];

      // Convert string counts to numbers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]) || 0;
      });

      serviceLogger.success(this.constructor.name, 'getStatistics', stats);
      return stats;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getStatistics', error);
      throw error;
    }
  }
}

/**
 * AI Chip Control Repository
 */
export class AiChipControlRepository extends BaseRepository {
  constructor() {
    super('ai_chip_control', 'shipment_id');
  }

  /**
   * Find records requiring AICA completion
   * @param {Object} options - Query options
   * @returns {Array} Records needing AICA
   */
  async findPendingAica(options = {}) {
    return this.findAll({ aica_done: false }, options);
  }

  /**
   * Find records with export notice requirements
   * @param {Object} options - Query options
   * @returns {Array} Records with export notice
   */
  async findWithExportNotice(options = {}) {
    return this.findAll({ export_notice_30d: true }, options);
  }
}

/**
 * End User Screening Repository
 */
export class EndUserScreeningRepository extends BaseRepository {
  constructor() {
    super('end_user_screening', 'shipment_id');
  }

  /**
   * Find screening results by result type
   * @param {string} screenResult - Screen result ('potential_hit', 'yes_clear', etc.)
   * @param {Object} options - Query options
   * @returns {Array} Screening records with matching result
   */
  async findByResult(screenResult, options = {}) {
    return this.findAll({ screen_result: screenResult }, options);
  }

  /**
   * Find potential hits requiring review
   * @param {Object} options - Query options
   * @returns {Array} Records with potential hits
   */
  async findPotentialHits(options = {}) {
    return this.findByResult('potential_hit', options);
  }

  /**
   * Find records by destination country
   * @param {string} country - Destination country
   * @param {Object} options - Query options
   * @returns {Array} Records for the specified country
   */
  async findByCountry(country, options = {}) {
    return this.findAll({ destination_country: country }, options);
  }

  /**
   * Search end users by name pattern
   * @param {string} namePattern - Name pattern to search
   * @param {Object} options - Query options
   * @returns {Array} Matching end user records
   */
  async searchByEndUser(namePattern, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'searchByEndUser', { namePattern });

      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE end_user_name ILIKE $1
      `;
      const params = [`%${namePattern}%`];

      // Add ordering
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY created_at DESC';
      }

      // Add pagination
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }

      const results = await this.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'searchByEndUser', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'searchByEndUser', error, { namePattern });
      throw error;
    }
  }
}

/**
 * Documents Repository
 */
export class DocumentsRepository extends BaseRepository {
  constructor() {
    super('documents', 'shipment_id');
  }

  /**
   * Find documents by validation status
   * @param {boolean} validated - Validation status
   * @param {Object} options - Query options
   * @returns {Array} Documents with matching validation status
   */
  async findByValidationStatus(validated, options = {}) {
    return this.findAll({ hs_validated: validated }, options);
  }

  /**
   * Find K2-ready documents
   * @param {Object} options - Query options
   * @returns {Array} K2-ready documents
   */
  async findK2Ready(options = {}) {
    return this.findAll({ k2_ready: true }, options);
  }

  /**
   * Find documents with permit references
   * @param {Object} options - Query options
   * @returns {Array} Documents with permits
   */
  async findWithPermits(options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findWithPermits');

      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE permit_refs IS NOT NULL AND array_length(permit_refs, 1) > 0
      `;
      const params = [];

      // Add ordering
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY updated_at DESC';
      }

      // Add pagination
      if (options.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(options.limit);
      }

      if (options.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(options.offset);
      }

      const results = await this.rawQuery(query, params);

      serviceLogger.success(this.constructor.name, 'findWithPermits', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findWithPermits', error);
      throw error;
    }
  }
}

// Export repository instances
export const complianceRepository = new ComplianceRepository();
export const aiChipControlRepository = new AiChipControlRepository();
export const endUserScreeningRepository = new EndUserScreeningRepository();
export const documentsRepository = new DocumentsRepository();

export default {
  ComplianceRepository,
  AiChipControlRepository,
  EndUserScreeningRepository,
  DocumentsRepository,
  complianceRepository,
  aiChipControlRepository,
  endUserScreeningRepository,
  documentsRepository
};