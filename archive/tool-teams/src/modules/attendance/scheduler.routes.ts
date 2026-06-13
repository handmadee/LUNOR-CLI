import { Router } from 'express';
import { schedulerController } from './controllers/scheduler.controller';

const router = Router();

/**
 * Scheduler Routes
 * 
 * /api/scheduler
 */

// Start scheduler
router.post('/start', schedulerController.start.bind(schedulerController));

// Stop scheduler
router.post('/stop', schedulerController.stop.bind(schedulerController));

// Get status
router.get('/status', schedulerController.getStatus.bind(schedulerController));

// Update config
router.put('/config', schedulerController.updateConfig.bind(schedulerController));

export default router;
