export interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  databaseSize: number;
  lastBackup: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export interface TableMetadata {
  name: string;
  rowCount: number;
  diskSize: number;
  indexCount: number;
  lastModified: string;
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}

export interface ForeignKey {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface ColumnDefinition {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'NUMERIC';
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue?: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

export interface QueryHistoryEntry {
  id: string;
  query: string;
  timestamp: string;
  executionTime: number;
  rowCount: number;
  status: 'success' | 'error';
  error?: string;
}

export interface MigrationInfo {
  version: number;
  name: string;
  appliedAt: string | null;
  status: 'pending' | 'applied' | 'failed';
}

export interface BackupInfo {
  filename: string;
  createdAt: string;
  size: number;
}

export interface PerformanceMetrics {
  activeQueries: number;
  queriesPerSecond: number;
  averageQueryTime: number;
  cacheHitRatio: number;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  timestamp: string;
  userId?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  userCategory: 'editor' | 'client' | 'agency';
  createdAt: string;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'schema';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestion: string;
  autoFixable: boolean;
}
