/**
 * Abstract Base Adapter
 * Defines the interface that all database adapters must implement
 */

import type { DatabaseAdapter, UniversalQuery, User, DatabaseProvider } from '../types';

export abstract class BaseAdapter implements DatabaseAdapter {
  protected connected: boolean = false;

  /**
   * Execute a universal query
   */
  abstract query<T = any>(query: UniversalQuery, user?: User | null): Promise<T>;

  /**
   * Test database connection
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Disconnect from database
   */
  abstract disconnect(): Promise<void>;

  /**
   * Backup database
   */
  abstract backup(): Promise<any>;

  /**
   * Restore database from backup
   */
  abstract restore(data: any): Promise<void>;

  /**
   * Get provider name
   */
  abstract getProviderName(): DatabaseProvider;

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Build WHERE clause for provider-specific syntax
   */
  protected buildWhereClause(where: any[], operation: string = 'AND'): any {
    throw new Error('buildWhereClause must be implemented by child class');
  }

  /**
   * Build ORDER BY clause
   */
  protected buildOrderByClause(orderBy: any[]): any {
    throw new Error('buildOrderByClause must be implemented by child class');
  }

  /**
   * Handle errors consistently
   */
  protected handleError(error: any, context: string): never {
    console.error(`[${this.getProviderName()}] ${context}:`, error);
    throw new Error(`Database Error: ${error.message || error}`);
  }

  /**
   * Log queries for debugging
   */
  protected logQuery(query: UniversalQuery): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.getProviderName()}] Query:`, {
        collection: query.collection,
        operation: query.operation,
        where: query.where,
        limit: query.limit,
      });
    }
  }
}
