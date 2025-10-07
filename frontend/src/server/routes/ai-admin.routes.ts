/**
 * AI Admin Routes - Manage AI models and API keys
 */

import { Router } from 'express';
import { AIAdminController } from '../controllers/ai-admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();
const controller = new AIAdminController();

// All routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware);

// AI Models
router.get('/ai-models', controller.getModels);
router.post('/ai-models/add-openrouter-free', controller.addFreeOpenRouterModels);
router.put('/ai-models/:id', controller.updateModel);

// API Keys
router.get('/ai-keys', controller.getAPIKeys);
router.post('/ai-keys', controller.addAPIKey);
router.delete('/ai-keys/:id', controller.deleteAPIKey);

export default router;
