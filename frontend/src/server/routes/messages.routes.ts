/**
 * Messages Routes
 */

import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new MessagesController();

// All routes require authentication
router.use(authMiddleware);

// Get messages (optionally filtered by project)
router.get('/', controller.getMessages);

// Create new message
router.post('/', controller.createMessage);

// Mark message as read
router.put('/:id/read', controller.markAsRead);

export default router;
