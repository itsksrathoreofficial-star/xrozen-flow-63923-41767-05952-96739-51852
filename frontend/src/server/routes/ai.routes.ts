/**
 * AI Routes - XrozenAI Endpoints
 */

import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AIController();

// All AI routes require authentication
router.use(authMiddleware);

router.post('/chat', controller.chat);
router.get('/conversations', controller.getConversations);
router.post('/conversations', controller.createConversation);
router.delete('/conversations/:conversationId', controller.deleteConversation);
router.get('/conversations/:conversationId/messages', controller.getMessages);

export default router;
