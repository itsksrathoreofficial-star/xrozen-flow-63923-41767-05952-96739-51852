/**
 * User Routes
 */

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validation.middleware';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

const router = Router();
const controller = new UserController();

router.get('/', controller.listUsers);
router.post('/', validate(createUserSchema), controller.createUser);
router.put('/:id', validate(updateUserSchema), controller.updateUser);
router.delete('/:id', controller.deleteUser);
router.get('/:id/activity', controller.getUserActivity);

export default router;
