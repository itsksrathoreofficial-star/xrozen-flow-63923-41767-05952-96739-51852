/**
 * Video Versions Routes
 */

import { Router } from 'express';
import { VideoVersionsController } from '../controllers/video-versions.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new VideoVersionsController();

// All routes require authentication
router.use(authMiddleware);

// Get video versions for a project
router.get('/projects/:projectId/versions', controller.getVideoVersions);

// Create new video version
router.post('/projects/:projectId/versions', controller.createVideoVersion);

// Update video version
router.put('/projects/:projectId/versions/:versionId', controller.updateVideoVersion);

export default router;
