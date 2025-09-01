/**
 * Status History Repository
 * Data access layer for shipment status history operations
 */

import { BaseRepository } from './BaseRepository.js';
import { serviceLogger } from '../utils/logger.js';

export class StatusHistoryRepository extends BaseRepository {
  constructor() {
    super('shipment_status_history', 'id');
  }

  /**
   * Create status history entry
   * @param {number} shipmentId - Shipment ID
   * @param {string} previousStatus - Previous status
   * @param {string} newStatus - New status
   * @param {number} changedBy - User ID who made the change
   * @param {string} changedByRole - Role of the user
   * @param {string} notes - Optional notes
   * @param {Object} metadata - Optional metadata
   * @returns {Object} Created history entry
   */
  async createStatusHistory(shipmentId, previousStatus, newStatus, changedBy, changedByRole, notes = null, metadata = null) {
    try {
      serviceLogger.start(this.constructor.name, 'createStatusHistory', { 
        shipmentId, 
        previousStatus, 
        newStatus, 
        changedBy,
        changedByRole 
      });

      const historyEntry = await this.create({
        shipment_id: shipmentId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by: changedBy,
        changed_by_role: changedByRole,
        notes,
        metadata,
        created_at: new Date().toISOString()
      });

      serviceLogger.success(this.constructor.name, 'createStatusHistory', { id: historyEntry.id });
      return historyEntry;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'createStatusHistory', error);
      throw error;
    }
  }

  /**
   * Get status history for a shipment
   * @param {number} shipmentId - Shipment ID
   * @returns {Array} Status history entries
   */
  async getShipmentHistory(shipmentId) {
    try {
      serviceLogger.start(this.constructor.name, 'getShipmentHistory', { shipmentId });

      const query = `
        SELECT sh.*, 
               u.first_name || ' ' || u.last_name as changed_by_name,
               u.email as changed_by_email
        FROM shipment_status_history sh
        LEFT JOIN users u ON sh.changed_by = u.id
        WHERE sh.shipment_id = $1
        ORDER BY sh.created_at ASC
      `;

      const result = await this.rawQuery(query, [shipmentId]);

      serviceLogger.success(this.constructor.name, 'getShipmentHistory', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getShipmentHistory', error);
      throw error;
    }
  }

  /**
   * Get recent status changes for admin dashboard
   * @param {number} limit - Number of entries to return
   * @returns {Array} Recent status changes
   */
  async getRecentStatusChanges(limit = 20) {
    try {
      serviceLogger.start(this.constructor.name, 'getRecentStatusChanges', { limit });

      const query = `
        SELECT sh.*, 
               s.reference as shipment_reference,
               u.first_name || ' ' || u.last_name as changed_by_name,
               u.email as changed_by_email
        FROM shipment_status_history sh
        JOIN shipments s ON sh.shipment_id = s.shipment_id
        LEFT JOIN users u ON sh.changed_by = u.id
        ORDER BY sh.created_at DESC
        LIMIT $1
      `;

      const result = await this.rawQuery(query, [limit]);

      serviceLogger.success(this.constructor.name, 'getRecentStatusChanges', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getRecentStatusChanges', error);
      throw error;
    }
  }

  /**
   * Get status analytics for a date range
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Array} Status analytics
   */
  async getStatusAnalytics(fromDate, toDate) {
    try {
      serviceLogger.start(this.constructor.name, 'getStatusAnalytics', { fromDate, toDate });

      const query = `
        SELECT 
          new_status,
          COUNT(*) as transition_count,
          AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY shipment_id ORDER BY created_at)))/3600) as avg_hours_in_previous_status
        FROM shipment_status_history
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY new_status
        ORDER BY transition_count DESC
      `;

      const result = await this.rawQuery(query, [fromDate, toDate]);

      serviceLogger.success(this.constructor.name, 'getStatusAnalytics', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getStatusAnalytics', error);
      throw error;
    }
  }

  /**
   * Get shipments stuck in a status for too long
   * @param {string} status - Status to check
   * @param {number} hoursThreshold - Hours threshold
   * @returns {Array} Stuck shipments
   */
  async getStuckShipments(status, hoursThreshold = 48) {
    try {
      serviceLogger.start(this.constructor.name, 'getStuckShipments', { status, hoursThreshold });

      const query = `
        SELECT DISTINCT
          sh.shipment_id,
          s.reference,
          sh.new_status,
          sh.created_at as status_changed_at,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - sh.created_at))/3600 as hours_in_status,
          u.first_name || ' ' || u.last_name as customer_name
        FROM shipment_status_history sh
        JOIN shipments s ON sh.shipment_id = s.shipment_id
        LEFT JOIN users u ON s.customer_id = u.id
        WHERE sh.new_status = $1
        AND sh.created_at < CURRENT_TIMESTAMP - INTERVAL '$2 hours'
        AND NOT EXISTS (
          SELECT 1 FROM shipment_status_history sh2 
          WHERE sh2.shipment_id = sh.shipment_id 
          AND sh2.created_at > sh.created_at
        )
        ORDER BY sh.created_at ASC
      `;

      const result = await this.rawQuery(query, [status, hoursThreshold]);

      serviceLogger.success(this.constructor.name, 'getStuckShipments', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'getStuckShipments', error);
      throw error;
    }
  }
}

export default StatusHistoryRepository;