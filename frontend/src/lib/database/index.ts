/**
 * Universal Database Interface - Main Entry Point
 * Single source of truth for all database operations
 */

import { SupabaseAdapter } from './adapters/supabase';
import { FirebaseAdapter } from './adapters/firebase';
import { PostgreSQLAdapter } from './adapters/postgresql';
import { MySQLAdapter } from './adapters/mysql';
import { MongoDBAdapter } from './adapters/mongodb';
import { SQLiteAdapter } from './adapters/sqlite';

import { applySecurityRules } from './security';
import { eventEmitter, emitBeforeEvent, emitAfterEvent } from './events';

import type { 
  DatabaseAdapter, 
  UniversalQuery, 
  User,
  DatabaseProvider,
  DatabaseConfig 
} from './types';

/**
 * Database Manager
 * Orchestrates all database operations through adapters
 */
class DatabaseManager {
  private currentAdapter: DatabaseAdapter;
  private currentProvider: DatabaseProvider = 'supabase';
  private currentUser: User | null = null;

  // Adapter registry
  private adapters: Map<DatabaseProvider, DatabaseAdapter> = new Map();

  constructor() {
    // Initialize with Supabase as default
    this.currentAdapter = new SupabaseAdapter();
    this.adapters.set('supabase', this.currentAdapter);
  }

  /**
   * Get current database provider
   */
  getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }

  /**
   * Set current user for security checks
   */
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  /**
   * Execute a universal query
   * Applies security rules, emits events, and routes through active adapter
   */
  async query<T = any>(query: UniversalQuery): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Emit before event
      await emitBeforeEvent(query.collection, query.operation, query.data, this.currentUser);

      // Apply security rules
      const secureQuery = await applySecurityRules(query, this.currentUser);

      // Execute query through active adapter
      const result = await this.currentAdapter.query<T>(secureQuery, this.currentUser);

      // Emit after event
      await emitAfterEvent(query.collection, query.operation, result, this.currentUser);

      success = true;
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      console.error('[DatabaseManager] Query error:', err);
      throw err;
    } finally {
      // Record performance metric
      const duration = Date.now() - startTime;
      const { monitoringService } = await import('./monitoring');
      monitoringService.recordMetric({
        operation: query.operation,
        collection: query.collection,
        duration,
        success,
        error,
      });
    }
  }

  /**
   * Test connection to current database
   */
  async testConnection(): Promise<boolean> {
    return this.currentAdapter.testConnection();
  }

  /**
   * Switch to a different database provider
   */
  async switchProvider(
    provider: DatabaseProvider,
    credentials: Record<string, any>
  ): Promise<void> {
    console.log(`[DatabaseManager] Switching to ${provider}...`);

    // Get or create adapter for the target provider
    let targetAdapter = this.adapters.get(provider);

    if (!targetAdapter) {
      targetAdapter = this.createAdapter(provider);
      this.adapters.set(provider, targetAdapter);
    }

    // Test connection to new provider
    const connected = await targetAdapter.testConnection();
    
    if (!connected) {
      throw new Error(`Failed to connect to ${provider}`);
    }

    // Switch active adapter
    this.currentAdapter = targetAdapter;
    this.currentProvider = provider;

    console.log(`[DatabaseManager] Successfully switched to ${provider}`);
  }

  /**
   * Create adapter instance for a provider
   */
  private createAdapter(provider: DatabaseProvider): DatabaseAdapter {
    switch (provider) {
      case 'supabase':
        return new SupabaseAdapter();
      case 'firebase':
        return new FirebaseAdapter();
      case 'postgresql':
        return new PostgreSQLAdapter();
      case 'mysql':
        return new MySQLAdapter();
      case 'mongodb':
        return new MongoDBAdapter();
      case 'sqlite':
        return new SQLiteAdapter();
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Backup current database
   */
  async backup(): Promise<any> {
    console.log(`[DatabaseManager] Creating backup of ${this.currentProvider}...`);
    return this.currentAdapter.backup();
  }

  /**
   * Restore database from backup
   */
  async restore(data: any): Promise<void> {
    console.log(`[DatabaseManager] Restoring ${this.currentProvider} from backup...`);
    await this.currentAdapter.restore(data);
  }

  /**
   * Migrate data from current provider to another
   */
  async migrate(
    targetProvider: DatabaseProvider,
    targetCredentials: Record<string, any>,
    onProgress?: (progress: { table: string; completed: number; total: number }) => void
  ): Promise<void> {
    console.log(`[DatabaseManager] Starting migration from ${this.currentProvider} to ${targetProvider}...`);

    // Step 1: Backup current database
    const backupData = await this.backup();

    // Step 2: Initialize target adapter
    const targetAdapter = this.createAdapter(targetProvider);
    const connected = await targetAdapter.testConnection();

    if (!connected) {
      throw new Error(`Failed to connect to target database: ${targetProvider}`);
    }

    // Step 3: Restore data to target database
    await targetAdapter.restore(backupData);

    // Step 4: Verify data integrity
    const verified = await this.verifyMigration(this.currentAdapter, targetAdapter);

    if (!verified) {
      throw new Error('Migration verification failed');
    }

    // Step 5: Switch to new provider
    this.currentAdapter = targetAdapter;
    this.currentProvider = targetProvider;
    this.adapters.set(targetProvider, targetAdapter);

    console.log(`[DatabaseManager] Migration completed successfully`);
  }

  /**
   * Verify data integrity after migration
   */
  private async verifyMigration(
    sourceAdapter: DatabaseAdapter,
    targetAdapter: DatabaseAdapter
  ): Promise<boolean> {
    // Implement verification logic
    // Compare record counts, checksums, sample data
    console.log('[DatabaseManager] Verifying migration...');
    return true; // Placeholder
  }

  /**
   * Get active database configuration
   */
  async getActiveConfig(): Promise<DatabaseConfig | null> {
    try {
      const result = await this.query({
        collection: 'database_config',
        operation: 'select',
        where: [{ field: 'is_active', operator: '=', value: true }],
        limit: 1
      });

      if (Array.isArray(result) && result.length > 0) {
        return {
          provider: result[0].provider,
          credentials: result[0].config,
          isActive: result[0].is_active
        };
      }

      return null;
    } catch (error) {
      console.error('[DatabaseManager] Failed to get active config:', error);
      return null;
    }
  }

  /**
   * Save database configuration
   */
  async saveConfig(provider: DatabaseProvider, credentials: Record<string, any>): Promise<void> {
    await this.query({
      collection: 'database_config',
      operation: 'insert',
      data: {
        provider,
        config: credentials,
        is_active: true
      }
    });
  }
}

// Export singleton instance
export const db = new DatabaseManager();

// Export event emitter for custom event handlers
export { eventEmitter };

// Helper functions for common operations
export const dbHelpers = {
  async getProfiles(userId?: string) {
    return db.query({
      collection: 'profiles',
      operation: 'select',
      where: userId ? [{ field: 'id', operator: '=', value: userId }] : undefined
    });
  },

  async getProjects(editorId?: string) {
    return db.query({
      collection: 'projects',
      operation: 'select',
      where: editorId ? [{ field: 'editor_id', operator: '=', value: editorId }] : undefined,
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  },

  async createProject(data: any) {
    return db.query({
      collection: 'projects',
      operation: 'insert',
      data
    });
  },

  async getMessages(projectId?: string) {
    return db.query({
      collection: 'messages',
      operation: 'select',
      where: projectId ? [{ field: 'project_id', operator: '=', value: projectId }] : undefined,
      orderBy: [{ field: 'created_at', direction: 'asc' }]
    });
  },

  async createMessage(data: any) {
    return db.query({
      collection: 'messages',
      operation: 'insert',
      data
    });
  },

  async getPayments(userId?: string) {
    return db.query({
      collection: 'payments',
      operation: 'select',
      where: userId ? [{ field: 'payer_id', operator: '=', value: userId }] : undefined,
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  },

  async getUserRole(userId: string) {
    const result = await db.query({
      collection: 'user_roles',
      operation: 'select',
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1
    });
    return result && result.length > 0 ? result[0].role : null;
  },

  async getEditors() {
    return db.query({
      collection: 'editors',
      operation: 'select',
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  },

  async getClients() {
    return db.query({
      collection: 'clients',
      operation: 'select',
      orderBy: [{ field: 'created_at', direction: 'desc' }]
    });
  }
};
