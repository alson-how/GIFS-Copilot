/**
 * Status Transition Service
 * Business logic for shipment status transitions
 */

import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import { StatusHistoryRepository } from '../repositories/StatusHistoryRepository.js';
import { serviceLogger } from '../utils/logger.js';

// Status transition rules
const STATUS_TRANSITIONS = {
  'DRAFT': ['PENDING_QUOTE', 'CANCELLED'],
  'PENDING_QUOTE': ['UNDER_REVIEW', 'CANCELLED'],
  'UNDER_REVIEW': ['QUOTED', 'CANCELLED'],
  'QUOTED': ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
  'CONFIRMED': ['PICKUP_SCHEDULED', 'CANCELLED'],
  'PICKUP_SCHEDULED': ['PICKED_UP', 'CANCELLED'],
  'PICKED_UP': ['AT_WAREHOUSE'],
  'AT_WAREHOUSE': ['CUSTOMS_EXPORT'],
  'CUSTOMS_EXPORT': ['IN_TRANSIT'],
  'IN_TRANSIT': ['ARRIVED_DESTINATION'],
  'ARRIVED_DESTINATION': ['CUSTOMS_IMPORT'],
  'CUSTOMS_IMPORT': ['OUT_FOR_DELIVERY'],
  'OUT_FOR_DELIVERY': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': [],
  'EXPIRED': []
};

// Role-based transition permissions
const ROLE_PERMISSIONS = {
  'CUSTOMER': ['DRAFT->PENDING_QUOTE', 'QUOTED->CONFIRMED'],
  'ADMIN': [
    'PENDING_QUOTE->UNDER_REVIEW', 
    'UNDER_REVIEW->QUOTED',
    'CONFIRMED->PICKUP_SCHEDULED',
    'PICKUP_SCHEDULED->PICKED_UP',
    'PICKED_UP->AT_WAREHOUSE',
    'AT_WAREHOUSE->CUSTOMS_EXPORT',
    'CUSTOMS_EXPORT->IN_TRANSIT',
    'IN_TRANSIT->ARRIVED_DESTINATION',
    'ARRIVED_DESTINATION->CUSTOMS_IMPORT',
    'CUSTOMS_IMPORT->OUT_FOR_DELIVERY',
    'OUT_FOR_DELIVERY->DELIVERED',
    // Cancellation permissions
    'DRAFT->CANCELLED',
    'PENDING_QUOTE->CANCELLED',
    'UNDER_REVIEW->CANCELLED',
    'QUOTED->CANCELLED',
    'CONFIRMED->CANCELLED'
  ],
  'CARRIER': [
    'PICKUP_SCHEDULED->PICKED_UP',
    'PICKED_UP->AT_WAREHOUSE',
    'CUSTOMS_EXPORT->IN_TRANSIT',
    'IN_TRANSIT->ARRIVED_DESTINATION',
    'CUSTOMS_IMPORT->OUT_FOR_DELIVERY',
    'OUT_FOR_DELIVERY->DELIVERED'
  ],
  'SYSTEM': [
    'PENDING_QUOTE->UNDER_REVIEW',
    'QUOTED->EXPIRED'
  ]
};

export class StatusTransitionService {
  constructor() {
    this.shipmentRepo = new ShipmentRepository();
    this.statusHistoryRepo = new StatusHistoryRepository();
  }

  /**
   * Transition shipment status with validation
   * @param {number} shipmentId - Shipment ID
   * @param {string} newStatus - New status
   * @param {number} userId - User making the change
   * @param {string} userRole - Role of the user
   * @param {string} notes - Optional notes
   * @param {Object} metadata - Optional metadata
   * @returns {Object} Updated shipment
   */
  async transitionStatus(shipmentId, newStatus, userId, userRole, notes = null, metadata = null) {
    try {
      serviceLogger.start(this.constructor.name, 'transitionStatus', {
        shipmentId,
        newStatus,
        userId,
        userRole
      });

      // Get current shipment
      const shipment = await this.shipmentRepo.findById(shipmentId);
      if (!shipment) {
        throw new Error(`Shipment ${shipmentId} not found`);
      }

      const currentStatus = shipment.status;

      // Validate transition
      await this.validateTransition(currentStatus, newStatus, userRole);

      // Update shipment status
      const updatedShipment = await this.shipmentRepo.updateById(shipmentId, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });

      // Create status history entry
      await this.statusHistoryRepo.createStatusHistory(
        shipmentId,
        currentStatus,
        newStatus,
        userId,
        userRole,
        notes,
        metadata
      );

      // Trigger status-specific actions
      await this.handleStatusSpecificActions(shipmentId, newStatus, updatedShipment);

      serviceLogger.success(this.constructor.name, 'transitionStatus', {
        shipmentId,
        from: currentStatus,
        to: newStatus
      });

      return updatedShipment;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'transitionStatus', error);
      throw error;
    }
  }

  /**
   * Validate if transition is allowed
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - New status
   * @param {string} userRole - User role
   */
  async validateTransition(fromStatus, toStatus, userRole) {
    // Check if transition is valid
    const allowedTransitions = STATUS_TRANSITIONS[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      throw new Error(`Invalid transition from ${fromStatus} to ${toStatus}`);
    }

    // Check role permissions
    const transitionKey = `${fromStatus}->${toStatus}`;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    if (!userPermissions.includes(transitionKey)) {
      throw new Error(`User role ${userRole} not authorized for transition ${transitionKey}`);
    }
  }

  /**
   * Get valid next statuses for a shipment
   * @param {string} currentStatus - Current status
   * @param {string} userRole - User role
   * @returns {Array} Valid next statuses
   */
  getValidNextStatuses(currentStatus, userRole) {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    return allowedTransitions.filter(status => {
      const transitionKey = `${currentStatus}->${status}`;
      return userPermissions.includes(transitionKey);
    });
  }

  /**
   * Handle status-specific actions
   * @param {number} shipmentId - Shipment ID
   * @param {string} status - New status
   * @param {Object} shipment - Updated shipment data
   */
  async handleStatusSpecificActions(shipmentId, status, shipment) {
    switch (status) {
      case 'PENDING_QUOTE':
        // Could trigger admin notification
        break;
        
      case 'QUOTED':
        // Set quote expiry timer
        await this.scheduleQuoteExpiry(shipmentId);
        break;
        
      case 'PICKUP_SCHEDULED':
        // Create pickup activity
        await this.createPickupActivity(shipmentId, shipment);
        break;
        
      case 'DELIVERED':
        // Record delivery timestamp
        await this.shipmentRepo.updateById(shipmentId, {
          actual_delivery_date: new Date().toISOString()
        });
        break;
        
      default:
        // No specific action needed
        break;
    }
  }

  /**
   * Schedule quote expiry (placeholder for future implementation)
   * @param {number} shipmentId - Shipment ID
   */
  async scheduleQuoteExpiry(shipmentId) {
    // In a real implementation, this would set up a job/timer
    // to automatically expire quotes after the validity period
    serviceLogger.info(this.constructor.name, 'scheduleQuoteExpiry', { shipmentId });
  }

  /**
   * Create pickup activity (placeholder for future implementation)
   * @param {number} shipmentId - Shipment ID
   * @param {Object} shipment - Shipment data
   */
  async createPickupActivity(shipmentId, shipment) {
    // This would create an entry in admin_activities table
    serviceLogger.info(this.constructor.name, 'createPickupActivity', { shipmentId });
  }

  /**
   * Bulk status transition for multiple shipments
   * @param {Array} shipmentIds - Array of shipment IDs
   * @param {string} newStatus - New status
   * @param {number} userId - User making the change
   * @param {string} userRole - User role
   * @param {string} notes - Optional notes
   * @returns {Array} Results for each shipment
   */
  async bulkTransitionStatus(shipmentIds, newStatus, userId, userRole, notes = null) {
    const results = [];
    
    for (const shipmentId of shipmentIds) {
      try {
        const result = await this.transitionStatus(shipmentId, newStatus, userId, userRole, notes);
        results.push({ shipmentId, success: true, result });
      } catch (error) {
        results.push({ shipmentId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Get shipment status timeline
   * @param {number} shipmentId - Shipment ID
   * @returns {Array} Status timeline with completion info
   */
  async getStatusTimeline(shipmentId) {
    const history = await this.statusHistoryRepo.getShipmentHistory(shipmentId);
    const currentShipment = await this.shipmentRepo.findById(shipmentId);
    
    if (!currentShipment) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    // All possible statuses in order
    const allStatuses = [
      'DRAFT', 'PENDING_QUOTE', 'UNDER_REVIEW', 'QUOTED', 
      'CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'AT_WAREHOUSE',
      'CUSTOMS_EXPORT', 'IN_TRANSIT', 'ARRIVED_DESTINATION',
      'CUSTOMS_IMPORT', 'OUT_FOR_DELIVERY', 'DELIVERED'
    ];

    const timeline = allStatuses.map(status => {
      const historyEntry = history.find(h => h.new_status === status);
      const isCurrentStatus = currentShipment.status === status;
      
      return {
        status,
        completed: !!historyEntry,
        current: isCurrentStatus,
        timestamp: historyEntry?.created_at,
        changedBy: historyEntry?.changed_by_name,
        notes: historyEntry?.notes
      };
    });

    return timeline;
  }

  /**
   * Auto-expire quotes that have passed their validity period
   * @returns {number} Number of shipments updated
   */
  async autoExpireQuotes() {
    try {
      serviceLogger.start(this.constructor.name, 'autoExpireQuotes');

      const expiredShipments = await this.shipmentRepo.rawQuery(`
        SELECT DISTINCT s.shipment_id, s.status
        FROM shipments s
        JOIN quotes q ON s.shipment_id = q.shipment_id
        WHERE s.status = 'QUOTED'
        AND q.status = 'ACTIVE'
        AND q.valid_until < CURRENT_TIMESTAMP
      `);

      let updatedCount = 0;
      for (const shipment of expiredShipments.rows) {
        try {
          await this.transitionStatus(
            shipment.shipment_id,
            'EXPIRED',
            null, // system user
            'SYSTEM',
            'Quote expired automatically'
          );
          updatedCount++;
        } catch (error) {
          serviceLogger.error(this.constructor.name, 'autoExpireQuotes', error, {
            shipmentId: shipment.shipment_id
          });
        }
      }

      serviceLogger.success(this.constructor.name, 'autoExpireQuotes', { updatedCount });
      return updatedCount;
    } catch (error) {
      serviceLogger.error(this.constructor.name, 'autoExpireQuotes', error);
      throw error;
    }
  }
}

export default StatusTransitionService;