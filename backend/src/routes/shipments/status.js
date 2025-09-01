/**
 * Shipment Status Routes
 * API routes for shipment status management and transitions
 */

import express from 'express';
import StatusTransitionService from '../services/StatusTransitionService.js';
import { StatusHistoryRepository } from '../repositories/StatusHistoryRepository.js';
import { authenticateToken } from '../middleware/authAdmin.js';
import { serviceLogger } from '../utils/logger.js';

const router = express.Router();
const statusTransitionService = new StatusTransitionService();
const statusHistoryRepo = new StatusHistoryRepository();

// Apply authentication middleware
router.use(authenticateToken);

/**
 * POST /api/shipments/:id/status
 * Update shipment status with validation
 */
router.post('/:id/status', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const { status: newStatus, notes, metadata } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role || 'CUSTOMER';

    serviceLogger.start('ShipmentStatusAPI', 'updateStatus', {
      shipmentId,
      newStatus,
      userId,
      userRole
    });

    // Validate required fields
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Update status with validation
    const updatedShipment = await statusTransitionService.transitionStatus(
      shipmentId,
      newStatus,
      userId,
      userRole,
      notes,
      metadata
    );

    serviceLogger.success('ShipmentStatusAPI', 'updateStatus', {
      shipmentId,
      newStatus,
      success: true
    });

    res.json({
      success: true,
      data: updatedShipment,
      message: `Shipment status updated to ${newStatus}`
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'updateStatus', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

/**
 * GET /api/shipments/:id/status-history
 * Get status change history for a shipment
 */
router.get('/:id/status-history', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    serviceLogger.start('ShipmentStatusAPI', 'getStatusHistory', { shipmentId });

    const history = await statusHistoryRepo.getShipmentHistory(shipmentId);

    serviceLogger.success('ShipmentStatusAPI', 'getStatusHistory', {
      shipmentId,
      historyCount: history.length
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'getStatusHistory', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status history',
      error: error.message
    });
  }
});

/**
 * GET /api/shipments/:id/status-timeline
 * Get complete status timeline for a shipment
 */
router.get('/:id/status-timeline', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    
    serviceLogger.start('ShipmentStatusAPI', 'getStatusTimeline', { shipmentId });

    const timeline = await statusTransitionService.getStatusTimeline(shipmentId);

    serviceLogger.success('ShipmentStatusAPI', 'getStatusTimeline', {
      shipmentId,
      timelineLength: timeline.length
    });

    res.json({
      success: true,
      data: timeline
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'getStatusTimeline', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status timeline',
      error: error.message
    });
  }
});

/**
 * GET /api/shipments/:id/valid-statuses
 * Get valid next statuses for current user role
 */
router.get('/:id/valid-statuses', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const userRole = req.user.role || 'CUSTOMER';
    
    serviceLogger.start('ShipmentStatusAPI', 'getValidStatuses', { 
      shipmentId, 
      userRole 
    });

    // Get current shipment to determine current status
    const shipment = await statusTransitionService.shipmentRepo.findById(shipmentId);
    
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    const validStatuses = statusTransitionService.getValidNextStatuses(
      shipment.status, 
      userRole
    );

    serviceLogger.success('ShipmentStatusAPI', 'getValidStatuses', {
      shipmentId,
      currentStatus: shipment.status,
      validStatuses: validStatuses.length
    });

    res.json({
      success: true,
      data: {
        currentStatus: shipment.status,
        validNextStatuses: validStatuses,
        userRole
      }
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'getValidStatuses', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch valid statuses',
      error: error.message
    });
  }
});

/**
 * POST /api/shipments/bulk-status
 * Bulk update status for multiple shipments
 */
router.post('/bulk-status', async (req, res) => {
  try {
    const { shipmentIds, status: newStatus, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role || 'ADMIN';

    serviceLogger.start('ShipmentStatusAPI', 'bulkUpdateStatus', {
      shipmentCount: shipmentIds?.length,
      newStatus,
      userId
    });

    // Validate required fields
    if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Shipment IDs array is required'
      });
    }

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Perform bulk update
    const results = await statusTransitionService.bulkTransitionStatus(
      shipmentIds,
      newStatus,
      userId,
      userRole,
      notes
    );

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    serviceLogger.success('ShipmentStatusAPI', 'bulkUpdateStatus', {
      successCount,
      errorCount,
      totalProcessed: results.length
    });

    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount
      },
      message: `Updated ${successCount} of ${results.length} shipments`
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'bulkUpdateStatus', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk status update',
      error: error.message
    });
  }
});

/**
 * GET /api/shipments/status-analytics
 * Get status analytics and insights
 */
router.get('/status-analytics', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const to = toDate ? new Date(toDate) : new Date();

    serviceLogger.start('ShipmentStatusAPI', 'getStatusAnalytics', { from, to });

    const analytics = await statusHistoryRepo.getStatusAnalytics(from, to);

    serviceLogger.success('ShipmentStatusAPI', 'getStatusAnalytics', {
      analyticsCount: analytics.length
    });

    res.json({
      success: true,
      data: analytics,
      period: { from, to }
    });

  } catch (error) {
    serviceLogger.error('ShipmentStatusAPI', 'getStatusAnalytics', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status analytics',
      error: error.message
    });
  }
});

export default router;