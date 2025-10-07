/**
 * Migration Manager for Database Schema Versioning
 * Handles schema evolution with up/down migrations
 */

import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export class MigrationManager {
  private db: Database.Database;
  private migrations: Migration[] = [];

  constructor(db: Database.Database) {
    this.db = db;
    this.initializeMigrationsTable();
  }

  /**
   * Create migrations tracking table
   */
  private initializeMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Get current database version
   */
  getCurrentVersion(): number {
    const result = this.db.prepare(
      'SELECT MAX(version) as version FROM _migrations'
    ).get() as { version: number | null };
    
    return result.version || 0;
  }

  /**
   * Get pending migrations
   */
  getPendingMigrations(): Migration[] {
    const currentVersion = this.getCurrentVersion();
    return this.migrations.filter(m => m.version > currentVersion);
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    const pending = this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`🔄 Running ${pending.length} pending migrations...`);

    for (const migration of pending) {
      const transaction = this.db.transaction(() => {
        try {
          console.log(`  ⏳ Applying migration ${migration.version}: ${migration.name}`);
          
          // Run migration
          migration.up(this.db);
          
          // Record migration
          this.db.prepare(`
            INSERT INTO _migrations (version, name) VALUES (?, ?)
          `).run(migration.version, migration.name);
          
          console.log(`  ✅ Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`  ❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      });

      transaction();
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Rollback last migration
   */
  async rollback(): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    
    if (currentVersion === 0) {
      console.log('⚠️  No migrations to rollback');
      return;
    }

    const migration = this.migrations.find(m => m.version === currentVersion);
    
    if (!migration) {
      throw new Error(`Migration ${currentVersion} not found`);
    }

    console.log(`🔄 Rolling back migration ${migration.version}: ${migration.name}`);

    const transaction = this.db.transaction(() => {
      try {
        // Run down migration
        migration.down(this.db);
        
        // Remove migration record
        this.db.prepare('DELETE FROM _migrations WHERE version = ?').run(currentVersion);
        
        console.log(`✅ Rollback completed`);
      } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
      }
    });

    transaction();
  }

  /**
   * Get migration history
   */
  getHistory(): Array<{ version: number; name: string; applied_at: string }> {
    return this.db.prepare(`
      SELECT version, name, applied_at 
      FROM _migrations 
      ORDER BY version ASC
    `).all() as Array<{ version: number; name: string; applied_at: string }>;
  }
}
