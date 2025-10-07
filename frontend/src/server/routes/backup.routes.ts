/**
 * Backup Routes
 */

import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { backupCreationLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const controller = new BackupController();

router.get('/', controller.listBackups);
router.post('/', backupCreationLimiter, controller.createBackup);
router.post('/:filename/restore', controller.restoreBackup);
router.delete('/:filename', controller.deleteBackup);
router.get('/:filename/download', controller.downloadBackup);

export default router;
