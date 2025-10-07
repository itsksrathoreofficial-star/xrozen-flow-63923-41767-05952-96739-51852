/**
 * Backup Controller - Database Backup & Restore
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { BackupManager } from '@/lib/database/core/backup.manager';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse } from '../utils/response.util';
import path from 'path';
import fs from 'fs';

export class BackupController {
  private connectionManager = ConnectionManager.getInstance();
  private backupManager: BackupManager;

  constructor() {
    const db = this.connectionManager.getConnection();
    const config = getDatabaseConfig();
    this.backupManager = new BackupManager(db, config);
  }

  /**
   * List all backups
   */
  listBackups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const backups = this.backupManager.listBackups();

      const formattedBackups = backups.map(backup => ({
        filename: backup.filename,
        size: backup.size,
        sizeFormatted: `${(backup.size / (1024 * 1024)).toFixed(2)} MB`,
        created: backup.created,
      }));

      res.json(successResponse(formattedBackups));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create backup
   */
  createBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.body;

      const backupPath = await this.backupManager.createBackup({ filename });

      res.json(successResponse({
        message: 'Backup created successfully',
        filename: path.basename(backupPath),
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Restore backup
   */
  restoreBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      const config = getDatabaseConfig();
      const backupPath = path.join(config.backupDirectory, filename);

      await this.backupManager.restoreBackup(backupPath);

      res.json(successResponse({
        message: 'Backup restored successfully. Application restart required.',
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete backup
   */
  deleteBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      const config = getDatabaseConfig();
      const backupPath = path.join(config.backupDirectory, filename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      fs.unlinkSync(backupPath);

      res.json(successResponse({
        message: 'Backup deleted successfully',
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Download backup
   */
  downloadBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      const config = getDatabaseConfig();
      const backupPath = path.join(config.backupDirectory, filename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      res.download(backupPath, filename);
    } catch (error) {
      next(error);
    }
  };
}
