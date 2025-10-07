import type { 
  DatabaseStats, 
  TableMetadata, 
  QueryResult, 
  QueryHistoryEntry,
  MigrationInfo,
  BackupInfo,
  PerformanceMetrics,
  SlowQuery,
  AdminUser,
  OptimizationSuggestion
} from '@/types/admin.types';

const API_BASE = '/api/admin';

export const adminApi = {
  // Database operations
  async getDatabaseStats(): Promise<DatabaseStats> {
    const response = await fetch(`${API_BASE}/database/stats`);
    if (!response.ok) throw new Error('Failed to fetch database stats');
    return response.json();
  },

  async getDatabaseHealth(): Promise<{ status: string; checks: any[] }> {
    const response = await fetch(`${API_BASE}/database/health`);
    if (!response.ok) throw new Error('Failed to fetch database health');
    return response.json();
  },

  async optimizeDatabase(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/database/optimize`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to optimize database');
    return response.json();
  },

  // Table operations
  async getTables(): Promise<TableMetadata[]> {
    const response = await fetch(`${API_BASE}/tables`);
    if (!response.ok) throw new Error('Failed to fetch tables');
    return response.json();
  },

  async getTableSchema(tableName: string): Promise<TableMetadata> {
    const response = await fetch(`${API_BASE}/tables/${tableName}`);
    if (!response.ok) throw new Error('Failed to fetch table schema');
    return response.json();
  },

  async getTableData(tableName: string, page = 1, pageSize = 50): Promise<QueryResult> {
    const response = await fetch(`${API_BASE}/tables/${tableName}/data?page=${page}&pageSize=${pageSize}`);
    if (!response.ok) throw new Error('Failed to fetch table data');
    return response.json();
  },

  async createTable(definition: any): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(definition),
    });
    if (!response.ok) throw new Error('Failed to create table');
    return response.json();
  },

  async dropTable(tableName: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tables/${tableName}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to drop table');
    return response.json();
  },

  async insertRow(tableName: string, data: any): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tables/${tableName}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to insert row');
    return response.json();
  },

  async updateRow(tableName: string, id: string, data: any): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tables/${tableName}/rows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update row');
    return response.json();
  },

  async deleteRow(tableName: string, id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/tables/${tableName}/rows/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete row');
    return response.json();
  },

  // Query operations
  async executeQuery(query: string): Promise<QueryResult> {
    const response = await fetch(`${API_BASE}/query/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute query');
    }
    return response.json();
  },

  async getQueryHistory(): Promise<QueryHistoryEntry[]> {
    const response = await fetch(`${API_BASE}/query/history`);
    if (!response.ok) throw new Error('Failed to fetch query history');
    return response.json();
  },

  async explainQuery(query: string): Promise<any> {
    const response = await fetch(`${API_BASE}/query/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error('Failed to explain query');
    return response.json();
  },

  async saveQuery(name: string, query: string, description?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/query/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, query, description }),
    });
    if (!response.ok) throw new Error('Failed to save query');
    return response.json();
  },

  async getSavedQueries(): Promise<any[]> {
    const response = await fetch(`${API_BASE}/query/saved`);
    if (!response.ok) throw new Error('Failed to fetch saved queries');
    return response.json();
  },

  // Migration operations
  async getMigrations(): Promise<MigrationInfo[]> {
    const response = await fetch(`${API_BASE}/migrations`);
    if (!response.ok) throw new Error('Failed to fetch migrations');
    return response.json();
  },

  async getPendingMigrations(): Promise<MigrationInfo[]> {
    const response = await fetch(`${API_BASE}/migrations/pending`);
    if (!response.ok) throw new Error('Failed to fetch pending migrations');
    return response.json();
  },

  async applyMigrations(): Promise<{ success: boolean; applied: number }> {
    const response = await fetch(`${API_BASE}/migrations/apply`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to apply migrations');
    return response.json();
  },

  async rollbackMigration(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/migrations/rollback`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to rollback migration');
    return response.json();
  },

  // Backup operations
  async getBackups(): Promise<BackupInfo[]> {
    const response = await fetch(`${API_BASE}/backups`);
    if (!response.ok) throw new Error('Failed to fetch backups');
    return response.json();
  },

  async createBackup(): Promise<{ success: boolean; filename: string }> {
    const response = await fetch(`${API_BASE}/backups`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to create backup');
    return response.json();
  },

  async restoreBackup(filename: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/backups/${filename}/restore`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to restore backup');
    return response.json();
  },

  async deleteBackup(filename: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/backups/${filename}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete backup');
    return response.json();
  },

  // Performance operations
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await fetch(`${API_BASE}/performance/metrics`);
    if (!response.ok) throw new Error('Failed to fetch performance metrics');
    return response.json();
  },

  async getSlowQueries(): Promise<SlowQuery[]> {
    const response = await fetch(`${API_BASE}/performance/slow-queries`);
    if (!response.ok) throw new Error('Failed to fetch slow queries');
    return response.json();
  },

  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const response = await fetch(`${API_BASE}/performance/suggestions`);
    if (!response.ok) throw new Error('Failed to fetch optimization suggestions');
    return response.json();
  },

  // User management
  async getUsers(): Promise<AdminUser[]> {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(userData: Partial<AdminUser>): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  async updateUser(id: string, userData: Partial<AdminUser>): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },
};
