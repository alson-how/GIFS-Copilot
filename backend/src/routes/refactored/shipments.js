/**
 * Refactored Shipments Routes
 * Clean, maintainable routes using the new architecture
 */

import express from 'express';
import { container } from '../../container/Container.js';
import { validateRequest } from '../../utils/validation.js';

const router = express.Router();

// Resolve controller from container
const getController = async () => await container.resolve('shipmentController');

// Shipment CRUD routes
router.get('/', 
  validateRequest('pagination', 'query'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().list(req, res);
  }
);

router.get('/active', 
  validateRequest('pagination', 'query'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getActive(req, res);
  }
);

router.get('/statistics', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getStatistics(req, res);
  }
);

router.get('/:id', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getById(req, res);
  }
);

router.get('/:id/complete', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().getComplete(req, res);
  }
);

router.post('/', 
  validateRequest('shipment.create', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().create(req, res);
  }
);

router.post('/search', 
  validateRequest('shipment.search', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().search(req, res);
  }
);

router.put('/:id', 
  validateRequest('shipment.update', 'body'),
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().update(req, res);
  }
);

router.patch('/:id/status', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().updateStatus(req, res);
  }
);

router.patch('/bulk/status', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().bulkUpdateStatus(req, res);
  }
);

router.delete('/:id', 
  async (req, res) => {
    const controller = await getController();
    return controller.getRoutes().delete(req, res);
  }
);

export default router;