/**
 * Editors Routes
 */

import { Router } from 'express';
import { EditorsController } from '../controllers/editors.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new EditorsController();

// All routes require authentication
router.use(authMiddleware);

// Get all editors
router.get('/', controller.getEditors);

// Get single editor
router.get('/:id', controller.getEditor);

// Create new editor
router.post('/', controller.createEditor);

// Update editor
router.put('/:id', controller.updateEditor);

export default router;
