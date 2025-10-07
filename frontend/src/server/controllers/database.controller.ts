/**
 * Database Controller - Database-level Operations
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { successResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export class DatabaseController {
  private connectionManager = ConnectionManager.getInstance();

  /**
   * Get database statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = this.connectionManager.getConnection();

      const tables = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get() as { count: number };

      const pageCount = db.pragma('page_count', { simple: true }) as number;
      const pageSize = db.pragma('page_size', { simple: true }) as number;
      const databaseSize = pageCount * pageSize;

      const stats = {
        totalTables: tables.count,
        databaseSize,
        databaseSizeFormatted: `${(databaseSize / (1024 * 1024)).toFixed(2)} MB`,
        connectionStatus: 'connected',
        journalMode: db.pragma('journal_mode', { simple: true }),
      };

      res.json(successResponse(stats));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Health check
   */
  getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = this.connectionManager.getConnection();

      const checks = [];

      // Test query execution
      try {
        db.prepare('SELECT 1').get();
        checks.push({ name: 'Query Execution', status: 'passed' });
      } catch {
        checks.push({ name: 'Query Execution', status: 'failed' });
      }

      // Check write permissions
      try {
        db.prepare('CREATE TEMP TABLE test_write (id INTEGER)').run();
        db.prepare('DROP TABLE test_write').run();
        checks.push({ name: 'Write Permission', status: 'passed' });
      } catch {
        checks.push({ name: 'Write Permission', status: 'failed' });
      }

      const allPassed = checks.every(check => check.status === 'passed');

      res.json(successResponse({
        status: allPassed ? 'healthy' : 'degraded',
        checks,
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optimize database
   */
  optimize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = this.connectionManager.getConnection();

      logger.info('Starting database optimization...');

      // VACUUM - rebuild database
      db.exec('VACUUM');
      logger.info('VACUUM completed');

      // ANALYZE - update query planner statistics
      db.exec('ANALYZE');
      logger.info('ANALYZE completed');

      // WAL checkpoint
      db.pragma('wal_checkpoint(TRUNCATE)');
      logger.info('WAL checkpoint completed');

      res.json(successResponse({ 
        message: 'Database optimized successfully' 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get database info
   */
  getInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = this.connectionManager.getConnection();

      const info = {
        sqliteVersion: db.pragma('application_id', { simple: true }),
        journalMode: db.pragma('journal_mode', { simple: true }),
        pageSize: db.pragma('page_size', { simple: true }),
        cacheSize: db.pragma('cache_size', { simple: true }),
        foreignKeys: db.pragma('foreign_keys', { simple: true }),
        autoVacuum: db.pragma('auto_vacuum', { simple: true }),
        encoding: db.pragma('encoding', { simple: true }),
      };

      res.json(successResponse(info));
    } catch (error) {
      next(error);
    }
  };
}
