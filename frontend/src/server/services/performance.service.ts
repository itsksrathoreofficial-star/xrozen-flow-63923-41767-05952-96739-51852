/**
 * Performance Service - Database Performance Monitoring
 */

import Database from 'better-sqlite3';

export interface PerformanceMetrics {
  queriesPerSecond: number;
  averageQueryTime: number;
  cacheHitRatio: number;
  activeConnections: number;
  totalQueries: number;
  slowQueries: number;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema';
  severity: 'low' | 'medium' | 'high';
  table?: string;
  column?: string;
  suggestion: string;
  impact: string;
}

export class PerformanceService {
  constructor(private db: Database.Database) {}

  /**
   * Calculate current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    // Get query history stats
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(execution_time) as avg_time,
        SUM(CASE WHEN execution_time > 1000 THEN 1 ELSE 0 END) as slow_queries
      FROM query_history 
      WHERE created_at > datetime('now', '-1 hour')
    `).get() as any;

    // Calculate queries per second
    const qps = (stats.total || 0) / 3600;

    return {
      queriesPerSecond: Math.round(qps * 100) / 100,
      averageQueryTime: Math.round(stats.avg_time || 0),
      cacheHitRatio: 0, // SQLite doesn't expose this easily
      activeConnections: 1, // SQLite is single-connection by default
      totalQueries: stats.total || 0,
      slowQueries: stats.slow_queries || 0,
    };
  }

  /**
   * Analyze query patterns and suggest optimizations
   */
  getSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Find tables without indexes
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_%'
    `).all() as Array<{ name: string }>;

    for (const table of tables) {
      const indexes = this.db.prepare(`PRAGMA index_list(${table.name})`).all();

      if (indexes.length === 0) {
        suggestions.push({
          type: 'index',
          severity: 'medium',
          table: table.name,
          suggestion: `Table '${table.name}' has no indexes. Consider adding indexes on frequently queried columns.`,
          impact: 'Queries on this table may be slow',
        });
      }
    }

    // Find slow queries that could benefit from indexes
    const slowQueries = this.db.prepare(`
      SELECT DISTINCT query FROM query_history 
      WHERE execution_time > 1000 
      ORDER BY execution_time DESC 
      LIMIT 10
    `).all() as Array<{ query: string }>;

    for (const { query } of slowQueries) {
      if (query.toLowerCase().includes('where') && !query.toLowerCase().includes('index')) {
        suggestions.push({
          type: 'query',
          severity: 'high',
          suggestion: `Slow query detected: "${query.substring(0, 100)}..." Consider optimizing with indexes.`,
          impact: 'This query is taking more than 1 second to execute',
        });
      }
    }

    return suggestions;
  }

  /**
   * Clear old query history
   */
  clearOldHistory(daysToKeep: number = 7): number {
    const result = this.db.prepare(`
      DELETE FROM query_history 
      WHERE created_at < datetime('now', '-${daysToKeep} days')
    `).run();

    return result.changes;
  }

  /**
   * Get database statistics
   */
  getDatabaseStats(): any {
    return {
      pageSize: this.db.pragma('page_size', { simple: true }),
      pageCount: this.db.pragma('page_count', { simple: true }),
      journalMode: this.db.pragma('journal_mode', { simple: true }),
      cacheSize: this.db.pragma('cache_size', { simple: true }),
      freelistCount: this.db.pragma('freelist_count', { simple: true }),
    };
  }
}
