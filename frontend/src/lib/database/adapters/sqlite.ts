/**
 * PRODUCTION-READY SQLite Database Adapter
 * Complete implementation with all features
 */

import Database from 'better-sqlite3';
import { BaseAdapter } from './base';
import type { UniversalQuery, User, DatabaseProvider } from '../types';
import { ConnectionManager } from '../core/connection.manager';
import { TransactionManager } from '../core/transaction.manager';
import { QueryBuilder } from '../core/query-builder';
import { BackupManager } from '../core/backup.manager';
import { getDatabaseConfig } from '@/config/database.config';

export class SQLiteAdapter extends BaseAdapter {
  private connectionManager: ConnectionManager;
  private db: Database.Database;
  private transactionManager: TransactionManager;
  private backupManager: BackupManager;

  /**
   * Initialize SQLite connection with production optimizations
   */
  constructor() {
    super();
    const config = getDatabaseConfig();
    this.connectionManager = ConnectionManager.getInstance(config);
    this.db = this.connectionManager.getConnection();
    this.transactionManager = new TransactionManager(this.db);
    this.backupManager = new BackupManager(this.db, config);
    this.connected = true;
  }

  /**
   * Execute universal query
   */
  async query<T = any>(query: UniversalQuery, user?: User | null): Promise<T> {
    this.logQuery(query);

    const { collection, operation, data, where, orderBy, limit, select } = query;

    try {
      const builder = new QueryBuilder();
      builder.from(collection);

      let sql: string;
      let params: any[];

      switch (operation) {
        case 'select':
          if (select) {
            builder.select(...(Array.isArray(select) ? select : [select]));
          }
          
          if (where) {
            for (const condition of where) {
              builder.where(condition.field, condition.operator as any, condition.value);
            }
          }

          if (orderBy) {
            for (const order of orderBy) {
              builder.orderBy(order.field, order.direction === 'asc' ? 'ASC' : 'DESC');
            }
          }

          if (limit) {
            builder.limit(limit);
          }

          const selectQuery = builder.toSelectSQL();
          sql = selectQuery.sql;
          params = selectQuery.params;

          const results = this.db.prepare(sql).all(...params);
          return results as T;
        
        case 'insert':
          if (!data) throw new Error('Insert requires data');
          
          const insertQuery = builder.toInsertSQL(data);
          sql = insertQuery.sql;
          params = insertQuery.params;

          const insertResult = this.db.prepare(sql).run(...params);
          return { id: insertResult.lastInsertRowid, ...data } as T;
        
        case 'update':
          if (!data) throw new Error('Update requires data');
          if (!where) throw new Error('Update requires where clause');

          for (const condition of where) {
            builder.where(condition.field, condition.operator as any, condition.value);
          }

          const updateQuery = builder.toUpdateSQL(data);
          sql = updateQuery.sql;
          params = updateQuery.params;

          const updateResult = this.db.prepare(sql).run(...params);
          return { changes: updateResult.changes } as T;
        
        case 'delete':
          if (!where) throw new Error('Delete requires where clause');

          for (const condition of where) {
            builder.where(condition.field, condition.operator as any, condition.value);
          }

          const deleteQuery = builder.toDeleteSQL();
          sql = deleteQuery.sql;
          params = deleteQuery.params;

          const deleteResult = this.db.prepare(sql).run(...params);
          return { changes: deleteResult.changes } as T;
        
        case 'count':
          if (where) {
            for (const condition of where) {
              builder.where(condition.field, condition.operator as any, condition.value);
            }
          }

          sql = `SELECT COUNT(*) as count FROM ${collection}`;
          if (where && where.length > 0) {
            const { sql: whereSql, params: whereParams } = builder.toSelectSQL();
            sql = whereSql.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as count FROM');
            params = whereParams;
          } else {
            params = [];
          }

          const countResult = this.db.prepare(sql).get(...params) as { count: number };
          return countResult.count as T;
        
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      this.handleError(error, `SQLite ${operation}`);
    }
  }

  /**
   * Execute raw SQL query
   */
  async rawQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
      const stmt = this.db.prepare(sql);
      
      // Determine if it's a SELECT query
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        return stmt.all(...params) as T;
      } else {
        const result = stmt.run(...params);
        return result as T;
      }
    } catch (error) {
      this.handleError(error, 'Raw SQL query');
    }
  }

  /**
   * Execute within transaction
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.transactionManager.execute(callback);
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = this.db.prepare('SELECT 1 as test').get();
      return result && (result as any).test === 1;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    this.connectionManager.close();
    this.connected = false;
  }

  /**
   * Backup database
   */
  async backup(): Promise<any> {
    try {
      const backupPath = await this.backupManager.createBackup();
      return { success: true, path: backupPath };
    } catch (error) {
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restore(backupPath: string): Promise<void> {
    try {
      await this.backupManager.restoreBackup(backupPath);
    } catch (error) {
      throw new Error(`Restore failed: ${error}`);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): DatabaseProvider {
    return 'sqlite';
  }

  /**
   * Get database connection for advanced operations
   */
  getConnection(): Database.Database {
    return this.db;
  }

  /**
   * Get database statistics
   */
  getStats(): Record<string, any> {
    return this.connectionManager.getStats();
  }

  /**
   * Optimize database
   */
  optimize(): void {
    this.connectionManager.optimize();
  }
}

