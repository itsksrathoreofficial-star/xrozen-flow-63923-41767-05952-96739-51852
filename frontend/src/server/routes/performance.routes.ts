/**
 * Performance Routes
 */

import { Router } from 'express';
import { PerformanceController } from '../controllers/performance.controller';

const router = Router();
const controller = new PerformanceController();

router.get('/metrics', controller.getMetrics);
router.get('/slow-queries', controller.getSlowQueries);
router.get('/suggestions', controller.getSuggestions);
router.post('/clear-history', controller.clearHistory);

export default router;
