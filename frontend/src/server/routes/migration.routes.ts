/**
 * Migration Routes
 */

import { Router } from 'express';
import { MigrationController } from '../controllers/migration.controller';

const router = Router();
const controller = new MigrationController();

router.get('/', controller.getMigrations);
router.get('/pending', controller.getPendingMigrations);
router.post('/apply', controller.applyMigrations);
router.post('/rollback', controller.rollbackMigration);

export default router;
