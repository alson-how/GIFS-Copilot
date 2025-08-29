import express from 'express';

const router = express.Router();

/**
 * POST /api/step-routing/complete/:shipmentId/:stepNumber
 * Mark a step as complete and determine next step
 */
router.post('/complete/:shipmentId/:stepNumber', async (req, res) => {
  try {
    const { shipmentId, stepNumber } = req.params;
    const stepData = req.body || {};

    console.log(`📝 Completing step ${stepNumber} for shipment ${shipmentId}`);

    // TODO: Implement step advancement logic
    const result = {
      success: true,
      shipmentId,
      stepCompleted: parseInt(stepNumber),
      currentStep: parseInt(stepNumber) + 1,
      nextStep: parseInt(stepNumber) + 1,
      stepName: getStepName(parseInt(stepNumber) + 1),
      component: getStepComponent(parseInt(stepNumber) + 1),
      isComplete: parseInt(stepNumber) >= 5,
      routing: {
        nextStep: parseInt(stepNumber) + 1,
        reason: 'Standard progression',
        priority: 'normal',
        requiredActions: []
      }
    };

    res.json(result);

  } catch (error) {
    console.error(`❌ Failed to complete step for ${req.params.shipmentId}:`, error);
    res.status(500).json({
      error: 'Step completion failed',
      message: error.message,
      shipmentId: req.params.shipmentId,
      step: req.params.stepNumber
    });
  }
});

/**
 * GET /api/step-routing/next/:shipmentId/:currentStep
 * Determine next step without advancing
 */
router.get('/next/:shipmentId/:currentStep', async (req, res) => {
  try {
    const { shipmentId, currentStep } = req.params;

    console.log(`🔍 Determining next step for shipment ${shipmentId} after step ${currentStep}`);

    const nextStepInfo = {
      success: true,
      shipmentId,
      currentStep: parseInt(currentStep),
      nextStep: parseInt(currentStep) + 1,
      stepName: getStepName(parseInt(currentStep) + 1),
      component: getStepComponent(parseInt(currentStep) + 1),
      reason: 'Standard progression',
      priority: 'normal',
      requiredActions: []
    };

    res.json(nextStepInfo);

  } catch (error) {
    console.error(`❌ Failed to determine next step for ${req.params.shipmentId}:`, error);
    res.status(500).json({
      error: 'Next step determination failed',
      message: error.message,
      shipmentId: req.params.shipmentId
    });
  }
});

/**
 * GET /api/step-routing/shipments/step/:stepNumber
 * Get shipments ready for a specific step
 */
router.get('/shipments/step/:stepNumber', async (req, res) => {
  try {
    const { stepNumber } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`📋 Getting shipments ready for step ${stepNumber}`);

    try {
      const result = await req.db.query(`
        SELECT 
          s.*, 
          COUNT(pi.item_id) as product_count,
          COALESCE(SUM(pi.total_amount), 0) as calculated_value
        FROM shipments s
        LEFT JOIN product_items pi ON s.shipment_id = pi.shipment_id
        WHERE s.current_step = $1
        GROUP BY s.shipment_id
        ORDER BY s.updated_at ASC
        LIMIT $2
      `, [parseInt(stepNumber), limit]);

      res.json({
        success: true,
        stepNumber: parseInt(stepNumber),
        shipments: result.rows,
        count: result.rows.length,
        limit
      });
    } catch (dbError) {
      console.log('Database query failed, returning empty array');
      res.json({
        success: true,
        stepNumber: parseInt(stepNumber),
        shipments: [],
        count: 0,
        limit
      });
    }

  } catch (error) {
    console.error(`❌ Failed to get shipments for step ${req.params.stepNumber}:`, error);
    res.status(500).json({
      error: 'Failed to retrieve shipments',
      message: error.message,
      step: req.params.stepNumber
    });
  }
});

/**
 * POST /api/step-routing/workflow-status
 * Get workflow status for multiple shipments
 */
router.post('/workflow-status', async (req, res) => {
  try {
    const { shipmentIds } = req.body;

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'shipmentIds array is required'
      });
    }

    console.log(`📊 Getting workflow status for ${shipmentIds.length} shipments`);

    try {
      const result = await req.db.query(`
        SELECT 
          s.shipment_id,
          s.current_step,
          s.step1_completed_at,
          s.step2_completed_at,
          s.step3_completed_at,
          s.step4_completed_at,
          s.step5_completed_at,
          COUNT(pi.item_id) as product_count,
          s.commercial_value,
          s.destination_country,
          s.created_at
        FROM shipments s
        LEFT JOIN product_items pi ON s.shipment_id = pi.shipment_id
        WHERE s.shipment_id = ANY($1)
        GROUP BY s.shipment_id
        ORDER BY s.created_at DESC
      `, [shipmentIds]);

      const workflowStatus = result.rows.map(row => ({
        ...row,
        progress: calculateProgress(row),
        nextAction: getNextAction(row.current_step)
      }));

      res.json({
        success: true,
        shipments: workflowStatus,
        count: workflowStatus.length
      });
    } catch (dbError) {
      console.log('Database query failed, returning empty array');
      res.json({
        success: true,
        shipments: [],
        count: 0
      });
    }

  } catch (error) {
    console.error('❌ Failed to get workflow status:', error);
    res.status(500).json({
      error: 'Failed to retrieve workflow status',
      message: error.message
    });
  }
});

/**
 * GET /api/step-routing/dashboard
 * Get dashboard statistics for all steps
 */
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 Getting workflow dashboard statistics');

    try {
      // Get counts for each step
      const stepCounts = await req.db.query(`
        SELECT 
          current_step,
          COUNT(*) as count,
          COUNT(CASE WHEN has_strategic_items THEN 1 END) as strategic_count,
          COUNT(CASE WHEN has_ai_chips THEN 1 END) as ai_chip_count,
          COALESCE(SUM(commercial_value), 0) as total_value
        FROM shipments 
        WHERE current_step <= 5
        GROUP BY current_step
        ORDER BY current_step
      `);

      // Get recent completions
      const recentCompletions = await req.db.query(`
        SELECT 
          scl.shipment_id,
          scl.step_number,
          scl.completed_at,
          s.destination_country,
          s.commercial_value,
          s.source_file
        FROM step_completion_log scl
        JOIN shipments s ON scl.shipment_id = s.shipment_id
        WHERE scl.status = 'completed'
        ORDER BY scl.completed_at DESC
        LIMIT 10
      `);

      // Get processing statistics
      const processingStats = await req.db.query(`
        SELECT 
          COUNT(*) as total_shipments,
          COUNT(CASE WHEN current_step >= 999 THEN 1 END) as completed_shipments,
          COUNT(DISTINCT batch_id) as total_batches,
          COALESCE(AVG(commercial_value), 0) as avg_value,
          COALESCE(SUM(commercial_value), 0) as total_value
        FROM shipments
      `);

      res.json({
        success: true,
        stepCounts: stepCounts.rows,
        recentCompletions: recentCompletions.rows,
        processingStats: processingStats.rows[0],
        generatedAt: new Date().toISOString()
      });
    } catch (dbError) {
      console.log('Database query failed, returning empty dashboard');
      res.json({
        success: true,
        stepCounts: [],
        recentCompletions: [],
        processingStats: {},
        generatedAt: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Failed to get dashboard statistics:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message
    });
  }
});

// Helper functions
function getStepName(stepNumber) {
  const stepNames = {
    1: 'Shipment Basics',
    2: 'STA Screening',
    3: 'AI Screening',
    4: 'General Screening',
    5: 'Documentation'
  };
  return stepNames[stepNumber] || 'Unknown Step';
}

function getStepComponent(stepNumber) {
  const stepComponents = {
    1: 'StepBasics',
    2: 'StepSTA',
    3: 'StepAI',
    4: 'StepScreening',
    5: 'StepDocs'
  };
  return stepComponents[stepNumber] || 'UnknownStep';
}

function calculateProgress(shipment) {
  const completedSteps = [
    shipment.step1_completed_at,
    shipment.step2_completed_at,
    shipment.step3_completed_at,
    shipment.step4_completed_at,
    shipment.step5_completed_at
  ].filter(Boolean).length;

  return Math.round((completedSteps / 5) * 100);
}

function getNextAction(currentStep) {
  const actions = {
    1: 'Complete shipment basics',
    2: 'STA compliance screening',
    3: 'AI chip assessment',
    4: 'General compliance check',
    5: 'Prepare documentation',
    999: 'Ready for export'
  };
  return actions[currentStep] || 'Unknown step';
}

export { router as stepRoutingRouter };