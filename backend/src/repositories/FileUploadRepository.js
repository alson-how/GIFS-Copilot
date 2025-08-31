/**
 * File Upload Repository
 * Handles database operations for file uploads
 */

import { BaseRepository } from './BaseRepository.js';

export class FileUploadRepository extends BaseRepository {
  constructor(database) {
    super(database, 'shipment_files');
  }

  /**
   * Create multiple file records in a transaction
   * @param {Array} files - Array of file data objects
   * @returns {Promise<Array>} Created file records
   */
  async createMultiple(files) {
    const client = await this.database.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const fileData of files) {
        const query = `
          INSERT INTO shipment_files (
            shipment_id, tag, original_name, mime_type, 
            file_path, size_bytes, upload_metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, shipment_id, tag, original_name, mime_type, 
                   file_path, size_bytes, upload_metadata, uploaded_at
        `;
        
        const values = [
          fileData.shipment_id,
          fileData.tag || 'other',
          fileData.original_name,
          fileData.mime_type,
          fileData.file_path,
          fileData.size_bytes,
          JSON.stringify(fileData.metadata || {})
        ];
        
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get files by shipment ID with optional tag filter
   * @param {string} shipmentId - Shipment ID
   * @param {string|null} tag - Optional tag filter
   * @param {Object} options - Query options
   * @returns {Promise<Array>} File records
   */
  async getByShipmentId(shipmentId, tag = null, options = {}) {
    const {
      limit = 100,
      offset = 0,
      orderBy = 'uploaded_at',
      orderDirection = 'DESC'
    } = options;

    let query = `
      SELECT id, shipment_id, tag, original_name, mime_type,
             file_path, size_bytes, upload_metadata, uploaded_at
      FROM shipment_files 
      WHERE shipment_id = $1
    `;
    
    const values = [shipmentId];
    
    if (tag) {
      query += ' AND tag = $2';
      values.push(tag);
    }
    
    query += ` ORDER BY ${orderBy} ${orderDirection} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);
    
    const result = await this.database.query(query, values);
    return result.rows;
  }

  /**
   * Get file statistics by shipment ID
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object>} File statistics
   */
  async getStatsByShipmentId(shipmentId) {
    const query = `
      SELECT 
        tag,
        COUNT(*) as file_count,
        SUM(size_bytes) as total_size,
        MIN(uploaded_at) as first_upload,
        MAX(uploaded_at) as last_upload
      FROM shipment_files 
      WHERE shipment_id = $1
      GROUP BY tag
      ORDER BY file_count DESC
    `;
    
    const result = await this.database.query(query, [shipmentId]);
    return result.rows;
  }

  /**
   * Delete files by shipment ID and optional tag
   * @param {string} shipmentId - Shipment ID
   * @param {string|null} tag - Optional tag filter
   * @returns {Promise<Array>} Deleted file records
   */
  async deleteByShipmentId(shipmentId, tag = null) {
    let query = `
      DELETE FROM shipment_files 
      WHERE shipment_id = $1
    `;
    
    const values = [shipmentId];
    
    if (tag) {
      query += ' AND tag = $2';
      values.push(tag);
    }
    
    query += `
      RETURNING id, shipment_id, tag, original_name, file_path
    `;
    
    const result = await this.database.query(query, values);
    return result.rows;
  }

  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {Object} metadata - New metadata
   * @returns {Promise<Object>} Updated file record
   */
  async updateMetadata(fileId, metadata) {
    const query = `
      UPDATE shipment_files 
      SET upload_metadata = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, shipment_id, tag, original_name, mime_type,
               file_path, size_bytes, upload_metadata, uploaded_at, updated_at
    `;
    
    const values = [fileId, JSON.stringify(metadata)];
    const result = await this.database.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    return result.rows[0];
  }

  /**
   * Get file by ID and shipment ID (for security)
   * @param {string} fileId - File ID
   * @param {string} shipmentId - Shipment ID
   * @returns {Promise<Object|null>} File record or null
   */
  async getByIdAndShipmentId(fileId, shipmentId) {
    const query = `
      SELECT id, shipment_id, tag, original_name, mime_type,
             file_path, size_bytes, upload_metadata, uploaded_at
      FROM shipment_files 
      WHERE id = $1 AND shipment_id = $2
    `;
    
    const result = await this.database.query(query, [fileId, shipmentId]);
    return result.rows[0] || null;
  }

  /**
   * Search files across multiple shipments (admin function)
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(criteria = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      orderBy = 'uploaded_at',
      orderDirection = 'DESC'
    } = options;

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

    if (criteria.tag) {
      paramCount++;
      conditions.push(`tag = $${paramCount}`);
      values.push(criteria.tag);
    }

    if (criteria.mime_type) {
      paramCount++;
      conditions.push(`mime_type ILIKE $${paramCount}`);
      values.push(`%${criteria.mime_type}%`);
    }

    if (criteria.original_name) {
      paramCount++;
      conditions.push(`original_name ILIKE $${paramCount}`);
      values.push(`%${criteria.original_name}%`);
    }

    if (criteria.min_size) {
      paramCount++;
      conditions.push(`size_bytes >= $${paramCount}`);
      values.push(criteria.min_size);
    }

    if (criteria.max_size) {
      paramCount++;
      conditions.push(`size_bytes <= $${paramCount}`);
      values.push(criteria.max_size);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*) FROM shipment_files ${whereClause}`;
    const countResult = await this.database.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT id, shipment_id, tag, original_name, mime_type,
             file_path, size_bytes, upload_metadata, uploaded_at
      FROM shipment_files 
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
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

export default FileUploadRepository;