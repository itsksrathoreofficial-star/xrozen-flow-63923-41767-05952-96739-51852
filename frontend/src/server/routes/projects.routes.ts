/**
 * Projects Routes
 */

import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ProjectsController();

// All routes require authentication
router.use(authMiddleware);

// Get all projects (with optional filters)
router.get('/', controller.getProjects);

// Get single project
router.get('/:id', controller.getProject);

// Create new project
router.post('/', controller.createProject);

// Update project
router.put('/:id', controller.updateProject);

// Delete project
router.delete('/:id', controller.deleteProject);

export default router;
