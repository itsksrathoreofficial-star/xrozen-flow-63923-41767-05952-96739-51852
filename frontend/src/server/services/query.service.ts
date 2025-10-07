/**
 * Query Service - SQL Query Execution and Management
 */

import Database from 'better-sqlite3';

export interface QueryResult {
  rows?: any[];
  changes?: number;
  lastInsertRowid?: number;
  executionTime: number;
}

export interface QueryHistory {
  id: string;
  user_id: string;
  query: string;
  execution_time: number;
  created_at: string;
}

export class QueryService {
  constructor(private db: Database.Database) {
    this.initializeHistoryTable();
    this.initializeSavedQueriesTable();
  }

  /**
   * Initialize query history table
   */
  private initializeHistoryTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        execution_time INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Initialize saved queries table
   */
  private initializeSavedQueriesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS saved_queries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        query TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Validate query for dangerous operations
   */
  validateQuery(query: string): { valid: boolean; error?: string } {
    const trimmedQuery = query.trim().toLowerCase();

    // Block multiple statements
    if (query.split(';').filter(s => s.trim()).length > 1) {
      return { valid: false, error: 'Multiple statements are not allowed' };
    }

    // Warn about destructive operations without WHERE clause
    const destructiveOps = ['delete', 'update', 'drop', 'truncate'];
    const hasWhere = trimmedQuery.includes('where');

    for (const op of destructiveOps) {
      if (trimmedQuery.startsWith(op) && !hasWhere && op !== 'drop') {
        return { 
          valid: false, 
          error: `${op.toUpperCase()} without WHERE clause is not allowed. Add WHERE clause or contact admin.` 
        };
      }
    }

    // Block dropping system tables
    if (trimmedQuery.includes('drop table') && 
        (trimmedQuery.includes('sqlite_') || trimmedQuery.includes('_migrations'))) {
      return { valid: false, error: 'Cannot drop system tables' };
    }

    return { valid: true };
  }

  /**
   * Execute query
   */
  executeQuery(query: string, userId: string): QueryResult {
    const validation = this.validateQuery(query);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const startTime = Date.now();

    try {
      const trimmedQuery = query.trim();
      let result: QueryResult;

      if (trimmedQuery.toLowerCase().startsWith('select')) {
        const rows = this.db.prepare(query).all();
        result = {
          rows,
          executionTime: Date.now() - startTime,
        };
      } else {
        const info = this.db.prepare(query).run();
        result = {
          changes: info.changes,
          lastInsertRowid: Number(info.lastInsertRowid),
          executionTime: Date.now() - startTime,
        };
      }

      // Record in history
      this.recordQueryExecution(query, result.executionTime, userId);

      return result;
    } catch (error: any) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Explain query execution plan
   */
  explainQuery(query: string): any[] {
    try {
      const plan = this.db.prepare(`EXPLAIN QUERY PLAN ${query}`).all();
      return plan;
    } catch (error: any) {
      throw new Error(`Failed to explain query: ${error.message}`);
    }
  }

  /**
   * Record query execution
   */
  private recordQueryExecution(query: string, duration: number, userId: string): void {
    try {
      this.db.prepare(`
        INSERT INTO query_history (id, user_id, query, execution_time)
        VALUES (?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        query,
        duration
      );
    } catch (error) {
      // Silently fail history recording
      console.error('Failed to record query history:', error);
    }
  }

  /**
   * Get query history
   */
  getQueryHistory(userId: string, limit: number = 50): QueryHistory[] {
    return this.db.prepare(`
      SELECT * FROM query_history 
      WHERE user_id = ?
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(userId, limit) as QueryHistory[];
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 1000, limit: number = 50): QueryHistory[] {
    return this.db.prepare(`
      SELECT * FROM query_history 
      WHERE execution_time > ?
      ORDER BY execution_time DESC 
      LIMIT ?
    `).all(threshold, limit) as QueryHistory[];
  }

  /**
   * Save query
   */
  saveQuery(userId: string, name: string, query: string, description?: string): void {
    this.db.prepare(`
      INSERT INTO saved_queries (id, user_id, name, query, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      name,
      query,
      description || null
    );
  }

  /**
   * Get saved queries
   */
  getSavedQueries(userId: string): any[] {
    return this.db.prepare(`
      SELECT * FROM saved_queries 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
  }

  /**
   * Delete saved query
   */
  deleteSavedQuery(queryId: string, userId: string): void {
    this.db.prepare(`
      DELETE FROM saved_queries 
      WHERE id = ? AND user_id = ?
    `).run(queryId, userId);
  }
}
