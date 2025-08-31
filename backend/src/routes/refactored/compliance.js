/**
 * Refactored Compliance Routes
 * Clean, maintainable routes using the new architecture
 */

import express from 'express';
import { container } from '../../container/Container.js';
import { validateRequest } from '../../utils/validation.js';

const router = express.Router();

// Resolve controller from container
const getController = async () => await container.resolve('complianceController');

// STA Screening
router.post('/sta-screening',
  validateRequest('compliance.staScreening', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().performStaScreening(req, res);
  }
);

// AI Chip Control
router.post('/ai-chip',
  validateRequest('compliance.aiChip', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().processAiChipControl(req, res);
  }
);

// End User Screening
router.post('/screening',
  validateRequest('compliance.screening', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().performEndUserScreening(req, res);
  }
);

// Documents Processing
router.post('/docs',
  validateRequest('compliance.documents', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().processDocuments(req, res);
  }
);

// Get compliance data
router.get('/statistics',
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getStatistics(req, res);
  }
);

router.get('/:shipmentId',
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getComplianceData(req, res);
  }
);

export default router;