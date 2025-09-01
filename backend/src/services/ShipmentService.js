/**
 * Shipment Service
 * Business logic for shipment operations
 */

import { BaseService } from './BaseService.js';
import ShipmentRepository from '../repositories/ShipmentRepository.js';
import { FileRepository } from '../repositories/FileRepository.js';
import { validator } from '../utils/validation.js';
import { NotFoundError, BusinessError } from '../utils/errors.js';

export class ShipmentService extends BaseService {
  constructor(shipmentRepository = null, fileRepository = null) {
    super(shipmentRepository || new ShipmentRepository(), 'ShipmentService');
    this.fileRepository = fileRepository || new FileRepository();
  }

  /**
   * Create a new shipment
   * @param {Object} shipmentData - Shipment data
   * @returns {Object} Created shipment
   */
  async createShipment(shipmentData) {
    return this.executeOperation('createShipment', async () => {
      // Validate input
      const validatedData = validator.validate('shipment.create', shipmentData);
      
      // Add timestamps
      const now = new Date().toISOString();
      validatedData.created_at = now;
      validatedData.updated_at = now;
      
      // Generate unique reference if not provided
      if (!validatedData.reference) {
        validatedData.reference = await this.generateReference();
      }
      
      // Create shipment
      const shipment = await this.repository.create(validatedData);
      
      this.logSuccess('createShipment', { id: shipment.id, reference: shipment.reference });
      return shipment;
    }, { reference: shipmentData.reference });
  }

  /**
   * Get shipment by ID with complete data
   * @param {string} id - Shipment ID
   * @returns {Object} Complete shipment data
   */
  async getShipmentById(id) {
    return this.executeOperation('getShipmentById', async () => {
      const shipment = await this.repository.findCompleteById(id);
      if (!shipment) {
        throw new NotFoundError('Shipment', id);
      }
      return shipment;
    }, { id });
  }

  /**
   * Update shipment
   * @param {string} id - Shipment ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated shipment
   */
  async updateShipment(id, updateData) {
    return this.executeOperation('updateShipment', async () => {
      // Validate input
      const validatedData = validator.validate('shipment.update', updateData);
      
      // Add update timestamp
      validatedData.updated_at = new Date().toISOString();
      
      // Update shipment
      const updated = await this.repository.updateById(id, validatedData);
      if (!updated) {
        throw new NotFoundError('Shipment', id);
      }
      
      this.logSuccess('updateShipment', { id, updatedFields: Object.keys(validatedData) });
      return updated;
    }, { id, hasData: !!updateData });
  }

  /**
   * Update shipment status
   * @param {string} id - Shipment ID
   * @param {string} status - New status
   * @param {string} reason - Status change reason
   * @returns {Object} Updated shipment
   */
  async updateStatus(id, status, reason = null) {
    return this.executeOperation('updateStatus', async () => {
      // Validate status transition
      const currentShipment = await this.getShipmentById(id);
      this.validateStatusTransition(currentShipment.status, status);
      
      // Update status
      const updated = await this.repository.updateStatus(id, status, reason);
      
      this.logSuccess('updateStatus', { id, from: currentShipment.status, to: status });
      return updated;
    }, { id, status });
  }

  /**
   * Search shipments
   * @param {Object} searchCriteria - Search parameters
   * @returns {Array} Matching shipments
   */
  async searchShipments(searchCriteria) {
    return this.executeOperation('searchShipments', async () => {
      // Validate search criteria
      const validatedCriteria = validator.validate('shipment.search', searchCriteria);
      
      // Perform search
      const shipments = await this.repository.search(validatedCriteria);
      
      this.logSuccess('searchShipments', { count: shipments.length });
      return shipments;
    }, { searchCriteria });
  }

  /**
   * Get paginated shipments
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Object} Paginated shipments
   */
  async getShipments(filters = {}, page = 1, limit = 20) {
    return this.executeOperation('getShipments', async () => {
      // Get shipments with files
      const offset = (page - 1) * limit;
      const [shipments, total] = await Promise.all([
        this.repository.findWithFiles(filters, { limit, offset, orderBy: 'created_at', orderDirection: 'DESC' }),
        this.repository.count(filters)
      ]);
      
      // Calculate pagination
      const totalPages = Math.ceil(total / limit);
      
      const result = {
        items: shipments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
      
      this.logSuccess('getShipments', { count: shipments.length, total });
      return result;
    }, { filters, page, limit });
  }

  /**
   * Get active shipments
   * @param {Object} options - Query options
   * @returns {Array} Active shipments
   */
  async getActiveShipments(options = {}) {
    return this.executeOperation('getActiveShipments', async () => {
      const shipments = await this.repository.findActive(options);
      
      this.logSuccess('getActiveShipments', { count: shipments.length });
      return shipments;
    });
  }

  /**
   * Delete shipment
   * @param {string} id - Shipment ID
   * @returns {boolean} True if deleted
   */
  async deleteShipment(id) {
    return this.executeOperation('deleteShipment', async () => {
      // Check if shipment exists
      const shipment = await this.repository.findById(id);
      if (!shipment) {
        throw new NotFoundError('Shipment', id);
      }
      
      // Check if shipment can be deleted
      if (['completed', 'in_transit'].includes(shipment.status)) {
        throw new BusinessError(`Cannot delete shipment in '${shipment.status}' status`);
      }
      
      // Delete associated files first (optional - depends on business rules)
      // await this.fileRepository.deleteWhere({ shipment_id: id });
      
      // Delete shipment
      const deleted = await this.repository.deleteById(id);
      
      this.logSuccess('deleteShipment', { id, reference: shipment.reference });
      return deleted;
    }, { id });
  }

  /**
   * Get shipment statistics
   * @returns {Object} Shipment statistics
   */
  async getStatistics() {
    return this.executeOperation('getStatistics', async () => {
      const stats = await this.repository.rawQuery(`
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN step1_status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN step1_status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN current_step = 1 THEN 1 END) as step1_count,
          COUNT(CASE WHEN current_step = 2 THEN 1 END) as step2_count,
          COUNT(CASE WHEN current_step = 3 THEN 1 END) as step3_count,
          COUNT(CASE WHEN current_step = 4 THEN 1 END) as step4_count,
          COUNT(CASE WHEN current_step = 5 THEN 1 END) as step5_count,
          COUNT(CASE WHEN has_strategic_items = true THEN 1 END) as strategic_items_count,
          COUNT(CASE WHEN has_ai_chips = true THEN 1 END) as ai_chips_count,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_count
        FROM shipments
      `);
      
      const result = stats.rows[0];
      
      // Convert to numbers
      Object.keys(result).forEach(key => {
        result[key] = parseInt(result[key]) || 0;
      });
      
      this.logSuccess('getStatistics', result);
      return result;
    });
  }

  /**
   * Generate unique shipment reference
   * @returns {string} Unique reference
   */
  async generateReference() {
    const prefix = 'SHP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - New status
   * @throws {BusinessError} If transition is invalid
   */
  validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = {
      'pending': ['processing', 'cancelled'],
      'processing': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [], // Final state
      'cancelled': []  // Final state
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BusinessError(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }
  }

  /**
   * Bulk update shipments status
   * @param {Array} ids - Shipment IDs
   * @param {string} status - New status
   * @param {string} reason - Status change reason
   * @returns {Array} Updated shipments
   */
  async bulkUpdateStatus(ids, status, reason = null) {
    return this.executeOperation('bulkUpdateStatus', async () => {
      const results = await this.bulkOperation(
        ids,
        async (id) => {
          try {
            return await this.updateStatus(id, status, reason);
          } catch (error) {
            // Return error info instead of throwing
            return { id, error: error.message, success: false };
          }
        },
        { useTransaction: true }
      );
      
      const successful = results.filter(r => r.success !== false);
      const failed = results.filter(r => r.success === false);
      
      this.logSuccess('bulkUpdateStatus', { 
        total: ids.length, 
        successful: successful.length, 
        failed: failed.length 
      });
      
      return {
        successful,
        failed,
        summary: {
          total: ids.length,
          successful: successful.length,
          failed: failed.length
        }
      };
    }, { count: ids.length, status });
  }
}

// Export service instance
export const shipmentService = new ShipmentService();

export default ShipmentService;