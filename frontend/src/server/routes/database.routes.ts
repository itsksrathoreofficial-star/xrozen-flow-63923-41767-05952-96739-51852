/**
 * Database Routes
 */

import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';

const router = Router();
const controller = new DatabaseController();

router.get('/stats', controller.getStats);
router.get('/health', controller.getHealth);
router.post('/optimize', controller.optimize);
router.get('/info', controller.getInfo);

export default router;
