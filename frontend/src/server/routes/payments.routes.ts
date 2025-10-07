/**
 * Payments Routes
 */

import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new PaymentsController();

// All routes require authentication
router.use(authMiddleware);

// Get all payments (with optional filters)
router.get('/', controller.getPayments);

// Get single payment
router.get('/:id', controller.getPayment);

// Create new payment
router.post('/', controller.createPayment);

// Update payment
router.put('/:id', controller.updatePayment);

export default router;
