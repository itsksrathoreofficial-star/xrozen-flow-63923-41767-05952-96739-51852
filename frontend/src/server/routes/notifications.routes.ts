/**
 * Notifications Routes
 */

import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new NotificationsController();

// All routes require authentication
router.use(authMiddleware);

// Get user notifications
router.get('/', controller.getNotifications);

// Mark notification as read
router.put('/:id/read', controller.markAsRead);

// Mark all notifications as read
router.put('/read-all', controller.markAllAsRead);

export default router;
