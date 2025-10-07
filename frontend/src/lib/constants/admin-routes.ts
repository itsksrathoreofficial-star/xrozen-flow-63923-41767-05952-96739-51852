export const ADMIN_ROUTES = {
  DASHBOARD: '/admin',
  DATABASE_OVERVIEW: '/admin/database',
  TABLE_EXPLORER: '/admin/tables',
  TABLE_DATA_VIEW: '/admin/tables/:tableName',
  SCHEMA_MANAGER: '/admin/schema',
  QUERY_CONSOLE: '/admin/query',
  MIGRATION_MANAGER: '/admin/migrations',
  BACKUP_RESTORE: '/admin/backups',
  USER_MANAGEMENT: '/admin/users',
  PERFORMANCE_MONITOR: '/admin/performance',
  SETTINGS: '/admin/settings',
} as const;

export const getTableDataRoute = (tableName: string) => 
  `/admin/tables/${tableName}`;
