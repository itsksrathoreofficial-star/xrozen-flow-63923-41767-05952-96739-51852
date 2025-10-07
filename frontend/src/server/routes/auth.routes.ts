/**
 * Authentication Routes
 */

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

// Public routes (no authentication required)
router.post('/login', controller.login.bind(controller));
router.post('/signup', controller.signup.bind(controller));
router.post('/logout', controller.logout.bind(controller));

// Protected routes (authentication required)
router.get('/me', authMiddleware, controller.getCurrentUser.bind(controller));

export default router;
