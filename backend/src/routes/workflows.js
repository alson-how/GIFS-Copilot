/**
 * Customer Workflows API Routes
 * Handles workflow operations for authenticated customers
 */

import express from 'express';
import { authCustomer } from '../middleware/authCustomer.js';
import { generalRateLimit } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply customer authentication and rate limiting to all workflow routes
router.use(authCustomer);
router.use(generalRateLimit);

/**
 * GET /api/workflows
 * Get customer's workflows
 */
router.get('/', async (req, res) => {
  try {
    const customerId = req.customer.id;
    
    logger.info(`Fetching workflows for customer: ${customerId}`);
    
    // Mock workflow data for now
    // In real implementation, this would fetch from database
    const mockWorkflows = [
      {
        id: 'wf-001',
        shipment_id: 'SHIP-2024-001',
        status: 'in_progress',
        origin: 'Singapore',
        destination: 'Los Angeles',
        items: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_id: customerId
      },
      {
        id: 'wf-002',
        shipment_id: 'SHIP-2024-002',
        status: 'pending_review',
        origin: 'Hong Kong',
        destination: 'New York',
        items: 300,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_id: customerId
      },
      {
        id: 'wf-003',
        shipment_id: 'SHIP-2024-003',
        status: 'completed',
        origin: 'Shanghai',
        destination: 'London',
        items: 75,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer_id: customerId
      }
    ];
    
    res.json({
      success: true,
      data: mockWorkflows,
      count: mockWorkflows.length,
      message: 'Workflows retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflows'
    });
  }
});

/**
 * GET /api/workflows/:id
 * Get specific workflow details
 */
router.get('/:id', async (req, res) => {
  try {
    const customerId = req.customer.id;
    const workflowId = req.params.id;
    
    logger.info(`Fetching workflow ${workflowId} for customer: ${customerId}`);
    
    // Mock workflow detail data
    const mockWorkflowDetail = {
      id: workflowId,
      shipment_id: `SHIP-2024-${workflowId.split('-')[1]}`,
      status: 'in_progress',
      origin: 'Singapore',
      destination: 'Los Angeles',
      items: 150,
      commercial_value: 25000,
      currency: 'USD',
      steps: [
        {
          id: 'step-1',
          name: 'Documentation Review',
          status: 'completed',
          completed_at: new Date().toISOString()
        },
        {
          id: 'step-2',
          name: 'Compliance Check',
          status: 'in_progress',
          started_at: new Date().toISOString()
        },
        {
          id: 'step-3',
          name: 'Shipping Arrangement',
          status: 'pending',
          estimated_start: new Date(Date.now() + 86400000).toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer_id: customerId
    };
    
    res.json({
      success: true,
      data: mockWorkflowDetail,
      message: 'Workflow details retrieved successfully'
    });

  } catch (error) {
    logger.error(`Error fetching workflow ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflow details'
    });
  }
});

/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/', async (req, res) => {
  try {
    const customerId = req.customer.id;
    const {
      origin,
      destination,
      items,
      commercial_value,
      currency = 'USD',
      description
    } = req.body;
    
    // Validate required fields
    if (!origin || !destination || !items || !commercial_value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: origin, destination, items, commercial_value'
      });
    }
    
    logger.info(`Creating new workflow for customer: ${customerId}`);
    
    // Mock workflow creation
    const newWorkflow = {
      id: `wf-${Date.now()}`,
      shipment_id: `SHIP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      status: 'pending',
      origin,
      destination,
      items,
      commercial_value,
      currency,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer_id: customerId
    };
    
    res.status(201).json({
      success: true,
      data: newWorkflow,
      message: 'Workflow created successfully'
    });

  } catch (error) {
    logger.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

/**
 * PUT /api/workflows/:id
 * Update workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const customerId = req.customer.id;
    const workflowId = req.params.id;
    const updateData = req.body;
    
    logger.info(`Updating workflow ${workflowId} for customer: ${customerId}`);
    
    // Mock workflow update
    const updatedWorkflow = {
      id: workflowId,
      ...updateData,
      updated_at: new Date().toISOString(),
      customer_id: customerId
    };
    
    res.json({
      success: true,
      data: updatedWorkflow,
      message: 'Workflow updated successfully'
    });

  } catch (error) {
    logger.error(`Error updating workflow ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workflow'
    });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    const customerId = req.customer.id;
    const workflowId = req.params.id;
    
    logger.info(`Deleting workflow ${workflowId} for customer: ${customerId}`);
    
    // Mock workflow deletion
    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });

  } catch (error) {
    logger.error(`Error deleting workflow ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workflow'
    });
  }
});

/**
 * GET /api/workflows/stats/overview
 * Get workflow statistics for dashboard
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const customerId = req.customer.id;
    
    logger.info(`Fetching workflow stats for customer: ${customerId}`);
    
    // Mock statistics
    const stats = {
      active_workflows: 12,
      pending_reviews: 8,
      completed_this_month: 24,
      urgent_items: 3,
      recent_activity: [
        {
          type: 'workflow_created',
          description: 'New shipment created',
          timestamp: new Date(Date.now() - 2 * 3600000).toISOString()
        },
        {
          type: 'documentation_approved',
          description: 'Documentation approved',
          timestamp: new Date(Date.now() - 4 * 3600000).toISOString()
        },
        {
          type: 'shipment_transit',
          description: 'Shipment in transit',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ]
    };
    
    res.json({
      success: true,
      data: stats,
      message: 'Workflow statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching workflow stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve workflow statistics'
    });
  }
});

export default router;