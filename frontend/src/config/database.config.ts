/**
 * Database Configuration for Production-Grade SQLite
 * Optimized for performance, concurrency, and reliability
 */

import path from 'path';

export interface DatabaseConfig {
  filename: string;
  mode: 'memory' | 'file';
  wal: boolean;
  synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  cacheSize: number;
  busyTimeout: number;
  foreignKeys: boolean;
  backupDirectory: string;
  enableQueryLogging: boolean;
  slowQueryThreshold: number; // milliseconds
}

export const productionConfig: DatabaseConfig = {
  filename: path.join(process.cwd(), 'data', 'xrozen.db'),
  mode: 'file',
  wal: true, // Enable Write-Ahead Logging for better concurrency
  synchronous: 'NORMAL', // Balance between safety and performance
  cacheSize: -64000, // 64MB cache (negative = KB)
  busyTimeout: 5000, // Wait 5 seconds if database is locked
  foreignKeys: true, // Enable FK constraints
  backupDirectory: path.join(process.cwd(), 'backups'),
  enableQueryLogging: false, // Disable in production
  slowQueryThreshold: 100, // Log queries > 100ms
};

export const developmentConfig: DatabaseConfig = {
  ...productionConfig,
  filename: path.join(process.cwd(), 'data', 'xrozen-dev.db'),
  enableQueryLogging: true,
  slowQueryThreshold: 50,
};

export const testConfig: DatabaseConfig = {
  ...productionConfig,
  filename: ':memory:', // In-memory for tests
  mode: 'memory',
  enableQueryLogging: false,
};

export const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    default:
      return developmentConfig;
  }
};
