/**
 * Performance Controller - Performance Monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { PerformanceService } from '../services/performance.service';
import { QueryService } from '../services/query.service';
import { successResponse } from '../utils/response.util';

export class PerformanceController {
  private connectionManager = ConnectionManager.getInstance();
  private performanceService: PerformanceService;
  private queryService: QueryService;

  constructor() {
    const db = this.connectionManager.getConnection();
    this.performanceService = new PerformanceService(db);
    this.queryService = new QueryService(db);
  }

  /**
   * Get performance metrics
   */
  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = this.performanceService.getMetrics();
      const dbStats = this.performanceService.getDatabaseStats();

      res.json(successResponse({
        ...metrics,
        database: dbStats,
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get slow queries
   */
  getSlowQueries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { threshold = 1000, limit = 50 } = req.query;

      const slowQueries = this.queryService.getSlowQueries(
        Number(threshold),
        Number(limit)
      );

      res.json(successResponse(slowQueries));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get optimization suggestions
   */
  getSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const suggestions = this.performanceService.getSuggestions();

      res.json(successResponse(suggestions));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clear old query history
   */
  clearHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { daysToKeep = 7 } = req.body;

      const deleted = this.performanceService.clearOldHistory(Number(daysToKeep));

      res.json(successResponse({
        message: `Deleted ${deleted} old query records`,
        deleted,
      }));
    } catch (error) {
      next(error);
    }
  };
}
