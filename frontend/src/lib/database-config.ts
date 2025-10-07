/**
 * Universal Database Abstraction Layer
 * Provides a unified interface for database operations
 */

// Browser-safe import - will use browser adapter in frontend
import { SQLiteAdapter } from './database-browser/adapters/sqlite';

export type DatabaseProvider = 'supabase' | 'firebase' | 'mysql' | 'postgresql' | 'mongodb' | 'sqlite';

export type QueryOperation = 'select' | 'insert' | 'update' | 'delete' | 'count';

export interface DatabaseConfig {
  provider: DatabaseProvider;
  credentials: any;
  isActive: boolean;
}

export interface UniversalQuery {
  collection: string;
  operation: QueryOperation;
  data?: any;
  where?: any;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  select?: string;
}

interface DatabaseAdapter {
  query(query: UniversalQuery): Promise<any>;
  testConnection(): Promise<boolean>;
  migrate(data: any[]): Promise<void>;
}

class DatabaseManager {
  private currentAdapter: DatabaseAdapter;
  private currentProvider: DatabaseProvider = 'sqlite';
  
  constructor() {
    this.currentAdapter = new SQLiteAdapter();
  }
  
  getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }
  
  async query(query: UniversalQuery): Promise<any> {
    return this.currentAdapter.query(query);
  }
  
  async testConnection(): Promise<boolean> {
    return this.currentAdapter.testConnection();
  }
  
  async switchProvider(
    provider: DatabaseProvider, 
    credentials: Record<string, any>
  ): Promise<void> {
    console.log(`Switching to ${provider}...`);
    
    // Store config in database_config table
    await this.currentAdapter.query({
      collection: 'database_config',
      operation: 'insert',
      data: {
        provider,
        config: credentials,
        is_active: true
      }
    });
  }
  
  async getActiveConfig(): Promise<DatabaseConfig | null> {
    const result = await this.currentAdapter.query({
      collection: 'database_config',
      operation: 'select',
      where: { is_active: true },
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
  }
}

// Export singleton instance
export const db = new DatabaseManager();

// Helper functions for common operations
export const dbHelpers = {
  async getProfiles(userId?: string) {
    return db.query({
      collection: 'profiles',
      operation: 'select',
      where: userId ? { id: userId } : undefined
    });
  },
  
  async getProjects(editorId?: string) {
    return db.query({
      collection: 'projects',
      operation: 'select',
      where: editorId ? { editor_id: editorId } : undefined,
      orderBy: { column: 'created_at', ascending: false }
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
      where: projectId ? { project_id: projectId } : undefined,
      orderBy: { column: 'created_at', ascending: true }
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
      where: userId ? { payer_id: userId } : undefined,
      orderBy: { column: 'created_at', ascending: false }
    });
  },
  
  async getUserRole(userId: string) {
    const result = await db.query({
      collection: 'user_roles',
      operation: 'select',
      where: { user_id: userId },
      limit: 1
    });
    return result && result.length > 0 ? result[0].role : null;
  },
  
  async getEditors() {
    return db.query({
      collection: 'editors',
      operation: 'select',
      orderBy: { column: 'created_at', ascending: false }
    });
  },
  
  async getClients() {
    return db.query({
      collection: 'clients',
      operation: 'select',
      orderBy: { column: 'created_at', ascending: false }
    });
  }
};
