/**
 * Migration Controller - Database Migration Management
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { MigrationManager } from '@/lib/database/core/migration.manager';
import { successResponse } from '../utils/response.util';

export class MigrationController {
  private connectionManager = ConnectionManager.getInstance();
  private migrationManager: MigrationManager;

  constructor() {
    const db = this.connectionManager.getConnection();
    this.migrationManager = new MigrationManager(db);
  }

  /**
   * Get migration history
   */
  getMigrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = this.migrationManager.getHistory();
      const currentVersion = this.migrationManager.getCurrentVersion();

      res.json(successResponse({
        currentVersion,
        migrations: history,
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get pending migrations
   */
  getPendingMigrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pending = this.migrationManager.getPendingMigrations();

      res.json(successResponse({
        count: pending.length,
        migrations: pending.map(m => ({
          version: m.version,
          name: m.name,
        })),
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Apply migrations
   */
  applyMigrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.migrationManager.migrate();

      res.json(successResponse({
        message: 'Migrations applied successfully',
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Rollback last migration
   */
  rollbackMigration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.migrationManager.rollback();

      res.json(successResponse({
        message: 'Migration rolled back successfully',
      }));
    } catch (error) {
      next(error);
    }
  };
}
