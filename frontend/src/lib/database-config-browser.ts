/**
 * Browser-Safe Database Abstraction Layer
 * Provides API-based database operations for frontend
 */

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
  where?: Record<string, any>;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
}

export interface DatabaseAdapter {
  query(query: UniversalQuery): Promise<any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getProvider(): DatabaseProvider;
}

// Browser-safe adapter that uses API calls
class BrowserAdapter implements DatabaseAdapter {
  private provider: DatabaseProvider = 'sqlite';

  async query(query: UniversalQuery): Promise<any> {
    // For browser, we'll use API calls instead of direct database access
    // This is a placeholder implementation
    console.warn('Browser adapter: Direct database queries not supported. Use API calls instead.');
    return [];
  }

  async connect(): Promise<void> {
    // No-op for browser
  }

  async disconnect(): Promise<void> {
    // No-op for browser
  }

  isConnected(): boolean {
    return true; // Always "connected" in browser
  }

  getProvider(): DatabaseProvider {
    return this.provider;
  }
}

class DatabaseManager {
  private currentAdapter: DatabaseAdapter;
  private currentProvider: DatabaseProvider = 'sqlite';
  
  constructor() {
    this.currentAdapter = new BrowserAdapter();
  }

  async initialize(): Promise<void> {
    await this.currentAdapter.connect();
  }

  async query(query: UniversalQuery): Promise<any> {
    return await this.currentAdapter.query(query);
  }

  async disconnect(): Promise<void> {
    await this.currentAdapter.disconnect();
  }

  isConnected(): boolean {
    return this.currentAdapter.isConnected();
  }

  getCurrentProvider(): DatabaseProvider {
    return this.currentProvider;
  }

  getCurrentAdapter(): DatabaseAdapter {
    return this.currentAdapter;
  }
}

// Export singleton instance
export const db = new DatabaseManager();
export default db;
