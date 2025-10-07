/**
 * Browser-Safe SQLite Adapter
 * Provides API-based database operations for frontend
 */

import { ConnectionManager } from '../core/connection.manager';

export interface DatabaseAdapter {
  query(query: any): Promise<any>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getProvider(): string;
}

export class SQLiteAdapter implements DatabaseAdapter {
  private provider = 'sqlite';
  private connectionManager: ConnectionManager;

  constructor() {
    this.connectionManager = ConnectionManager.getInstance();
  }

  async query(query: any): Promise<any> {
    // For browser, we'll use API calls instead of direct database access
    console.warn('Browser SQLiteAdapter: Direct database queries not supported. Use API calls instead.');
    return [];
  }

  async connect(): Promise<void> {
    await this.connectionManager.connect();
  }

  async disconnect(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  isConnected(): boolean {
    return this.connectionManager.isConnectionActive();
  }

  getProvider(): string {
    return this.provider;
  }
}
