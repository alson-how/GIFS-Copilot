/**
 * File Repository
 * Data access layer for file management operations
 */

import { BaseRepository } from './BaseRepository.js';
import { serviceLogger } from '../utils/logger.js';

export class FileRepository extends BaseRepository {
  constructor() {
    super('shipment_files', 'id');
  }

  /**
   * Find files by shipment ID
   * @param {string} shipmentId - Shipment ID
   * @param {Object} options - Query options
   * @returns {Array} Files for the shipment
   */
  async findByShipmentId(shipmentId, options = {}) {
    const defaultOptions = {
      orderBy: 'uploaded_at',
      orderDirection: 'DESC',
      ...options
    };
    return this.findAll({ shipment_id: shipmentId }, defaultOptions);
  }

  /**
   * Find files by tag
   * @param {string} tag - File tag
   * @param {Object} options - Query options
   * @returns {Array} Files with matching tag
   */
  async findByTag(tag, options = {}) {
    return this.findAll({ tag }, options);
  }

  /**
   * Find files by shipment ID and tag
   * @param {string} shipmentId - Shipment ID
   * @param {string} tag - File tag
   * @param {Object} options - Query options
   * @returns {Array} Matching files
   */
  async findByShipmentAndTag(shipmentId, tag, options = {}) {
    return this.findAll({ shipment_id: shipmentId, tag }, options);
  }

  /**
   * Find files by MIME type
   * @param {string} mimeType - MIME type
   * @param {Object} options - Query options
   * @returns {Array} Files with matching MIME type
   */
  async findByMimeType(mimeType, options = {}) {
    return this.findAll({ mime_type: mimeType }, options);
  }

  /**
   * Find files larger than specified size
   * @param {number} minSize - Minimum file size in bytes
   * @param {Object} options - Query options
   * @returns {Array} Large files
   */
  async findLargeFiles(minSize, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findLargeFiles', { minSize });

      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE size_bytes > $1
      `;
      const params = [minSize];

      // Add ordering
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY size_bytes DESC';
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

      serviceLogger.success(this.constructor.name, 'findLargeFiles', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findLargeFiles', error, { minSize });
      throw error;
    }
  }

  /**
   * Get file storage statistics
   * @returns {Object} Storage statistics
   */
  async getStorageStats() {
    try {
      serviceLogger.start(this.constructor.name, 'getStorageStats');

      const query = `
        SELECT 
          COUNT(*) as total_files,
          SUM(size_bytes) as total_size_bytes,
          AVG(size_bytes) as avg_size_bytes,
          MIN(size_bytes) as min_size_bytes,
          MAX(size_bytes) as max_size_bytes,
          COUNT(DISTINCT shipment_id) as unique_shipments,
          COUNT(DISTINCT tag) as unique_tags,
          COUNT(DISTINCT mime_type) as unique_mime_types
        FROM ${this.tableName}
      `;

      const result = await this.rawQuery(query);
      const stats = result.rows[0];

      // Convert numeric fields
      const numericFields = ['total_files', 'total_size_bytes', 'avg_size_bytes', 'min_size_bytes', 'max_size_bytes', 'unique_shipments', 'unique_tags', 'unique_mime_types'];
      numericFields.forEach(field => {
        stats[field] = parseFloat(stats[field]) || 0;
      });

      serviceLogger.success(this.constructor.name, 'getStorageStats', stats);
      return stats;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getStorageStats', error);
      throw error;
    }
  }

  /**
   * Get files grouped by MIME type
   * @returns {Array} Files grouped by MIME type with counts
   */
  async getFilesByMimeType() {
    try {
      serviceLogger.start(this.constructor.name, 'getFilesByMimeType');

      const query = `
        SELECT 
          mime_type,
          COUNT(*) as file_count,
          SUM(size_bytes) as total_size
        FROM ${this.tableName}
        GROUP BY mime_type
        ORDER BY file_count DESC
      `;

      const result = await this.rawQuery(query);
      const groups = result.rows.map(row => ({
        ...row,
        file_count: parseInt(row.file_count),
        total_size: parseFloat(row.total_size) || 0
      }));

      serviceLogger.success(this.constructor.name, 'getFilesByMimeType', { groups: groups.length });
      return groups;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getFilesByMimeType', error);
      throw error;
    }
  }

  /**
   * Get files grouped by tag
   * @returns {Array} Files grouped by tag with counts
   */
  async getFilesByTag() {
    try {
      serviceLogger.start(this.constructor.name, 'getFilesByTag');

      const query = `
        SELECT 
          tag,
          COUNT(*) as file_count,
          SUM(size_bytes) as total_size
        FROM ${this.tableName}
        GROUP BY tag
        ORDER BY file_count DESC
      `;

      const result = await this.rawQuery(query);
      const groups = result.rows.map(row => ({
        ...row,
        file_count: parseInt(row.file_count),
        total_size: parseFloat(row.total_size) || 0
      }));

      serviceLogger.success(this.constructor.name, 'getFilesByTag', { groups: groups.length });
      return groups;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getFilesByTag', error);
      throw error;
    }
  }

  /**
   * Find recent files
   * @param {number} hours - Hours to look back (default: 24)
   * @param {Object} options - Query options
   * @returns {Array} Recently uploaded files
   */
  async findRecent(hours = 24, options = {}) {
    try {
      serviceLogger.start(this.constructor.name, 'findRecent', { hours });

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      let query = `
        SELECT * FROM ${this.tableName} 
        WHERE uploaded_at >= $1
      `;
      const params = [cutoffTime.toISOString()];

      // Add ordering
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
        if (options.orderDirection) {
          query += ` ${options.orderDirection}`;
        }
      } else {
        query += ' ORDER BY uploaded_at DESC';
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

      serviceLogger.success(this.constructor.name, 'findRecent', { count: results.rows.length });
      return results.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'findRecent', error, { hours });
      throw error;
    }
  }

  /**
   * Delete orphaned files (files without shipments)
   * @returns {number} Number of deleted files
   */
  async deleteOrphaned() {
    try {
      serviceLogger.start(this.constructor.name, 'deleteOrphaned');

      const query = `
        DELETE FROM ${this.tableName} 
        WHERE shipment_id NOT IN (SELECT id FROM shipments)
        RETURNING id
      `;

      const result = await this.rawQuery(query);
      const deletedCount = result.rowCount;

      serviceLogger.success(this.constructor.name, 'deleteOrphaned', { deletedCount });
      return deletedCount;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'deleteOrphaned', error);
      throw error;
    }
  }

  /**
   * Update file metadata
   * @param {number} fileId - File ID
   * @param {Object} metadata - New metadata
   * @returns {Object|null} Updated file record
   */
  async updateMetadata(fileId, metadata) {
    try {
      serviceLogger.start(this.constructor.name, 'updateMetadata', { fileId });

      const allowedFields = ['tag', 'original_name'];
      const updateData = {};
      
      // Only allow updating specific fields
      allowedFields.forEach(field => {
        if (metadata[field] !== undefined) {
          updateData[field] = metadata[field];
        }
      });

      if (Object.keys(updateData).length === 0) {
        return null;
      }

      updateData.updated_at = new Date().toISOString();
      const result = await this.updateById(fileId, updateData);

      serviceLogger.success(this.constructor.name, 'updateMetadata', { updated: !!result });
      return result;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'updateMetadata', error, { fileId });
      throw error;
    }
  }
}

// Export repository instance
export const fileRepository = new FileRepository();

export default FileRepository;