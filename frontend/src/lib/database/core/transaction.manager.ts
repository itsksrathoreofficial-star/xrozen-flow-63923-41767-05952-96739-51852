/**
 * Transaction Manager for ACID-compliant operations
 * Provides safe transaction handling with automatic rollback
 */

import Database from 'better-sqlite3';

export class TransactionManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Execute function within a transaction
   * Automatically rolls back on error
   */
  async execute<T>(callback: () => Promise<T> | T): Promise<T> {
    const transaction = this.db.transaction(callback);
    return transaction();
  }

  /**
   * Execute immediate transaction (BEGIN IMMEDIATE)
   * Acquires write lock immediately
   */
  async executeImmediate<T>(callback: () => Promise<T> | T): Promise<T> {
    this.db.exec('BEGIN IMMEDIATE');
    
    try {
      const result = await callback();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Execute exclusive transaction (BEGIN EXCLUSIVE)
   * Acquires exclusive lock
   */
  async executeExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
    this.db.exec('BEGIN EXCLUSIVE');
    
    try {
      const result = await callback();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Create a savepoint
   */
  savepoint(name: string): void {
    this.db.exec(`SAVEPOINT ${name}`);
  }

  /**
   * Release a savepoint
   */
  releaseSavepoint(name: string): void {
    this.db.exec(`RELEASE SAVEPOINT ${name}`);
  }

  /**
   * Rollback to a savepoint
   */
  rollbackToSavepoint(name: string): void {
    this.db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
  }
}
