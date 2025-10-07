/**
 * Profile Routes
 */

import { Router } from 'express';
import { ProfileController } from '../controllers/profiles.controller';
import { authMiddleware } from '../middleware/auth.middleware';

console.log('Loading profiles routes...');

const router = Router();
const controller = new ProfileController();

console.log('Profiles controller created');

// All routes require authentication
router.use(authMiddleware);

console.log('Auth middleware applied to profiles routes');

// Debug endpoint (must be before /:userId route)
router.get('/debug', controller.debugDatabase);

// Test endpoint
router.get('/test', controller.test);

// Get current user's profile
router.get('/me', controller.getMyProfile);

// Get profile by user ID
router.get('/:userId', controller.getProfile);

// Update profile
router.put('/:id', controller.updateProfile);

export default router;
