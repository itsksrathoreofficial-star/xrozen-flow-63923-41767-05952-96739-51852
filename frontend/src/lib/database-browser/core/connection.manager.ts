/**
 * Browser-Safe Connection Manager
 * Provides API-based database operations for frontend
 */

export class ConnectionManager {
  private static instance: ConnectionManager;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  getConnection(): any {
    // For browser, return a mock connection object
    return {
      prepare: () => ({
        get: () => null,
        all: () => [],
        run: () => ({ changes: 0, lastInsertRowid: 0 })
      }),
      exec: () => {},
      close: () => {}
    };
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }
}
