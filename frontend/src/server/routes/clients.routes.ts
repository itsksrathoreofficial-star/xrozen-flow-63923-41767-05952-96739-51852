/**
 * Clients Routes
 */

import { Router } from 'express';
import { ClientsController } from '../controllers/clients.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ClientsController();

// All routes require authentication
router.use(authMiddleware);

// Get all clients
router.get('/', controller.getClients);

// Get single client
router.get('/:id', controller.getClient);

// Create new client
router.post('/', controller.createClient);

// Update client
router.put('/:id', controller.updateClient);

export default router;
