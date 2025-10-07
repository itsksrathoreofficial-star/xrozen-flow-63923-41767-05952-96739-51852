/**
 * Query Controller - SQL Query Execution
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { QueryService } from '../services/query.service';
import { successResponse } from '../utils/response.util';

export class QueryController {
  private connectionManager = ConnectionManager.getInstance();
  private queryService: QueryService;

  constructor() {
    const db = this.connectionManager.getConnection();
    this.queryService = new QueryService(db);
  }

  /**
   * Execute SQL query
   */
  executeQuery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req.body;
      const userId = req.user!.userId;

      const result = this.queryService.executeQuery(query, userId);

      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get query history
   */
  getQueryHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const history = this.queryService.getQueryHistory(userId);

      res.json(successResponse(history));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Explain query
   */
  explainQuery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query } = req.body;
      const plan = this.queryService.explainQuery(query);

      res.json(successResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Save query
   */
  saveQuery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, query, description } = req.body;
      const userId = req.user!.userId;

      this.queryService.saveQuery(userId, name, query, description);

      res.json(successResponse({ message: 'Query saved successfully' }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get saved queries
   */
  getSavedQueries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const queries = this.queryService.getSavedQueries(userId);

      res.json(successResponse(queries));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete saved query
   */
  deleteSavedQuery = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      this.queryService.deleteSavedQuery(id, userId);

      res.json(successResponse({ message: 'Query deleted successfully' }));
    } catch (error) {
      next(error);
    }
  };
}
