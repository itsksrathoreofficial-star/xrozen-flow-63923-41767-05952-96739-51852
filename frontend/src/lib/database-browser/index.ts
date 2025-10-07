/**
 * Browser-Safe Database Index
 * Exports browser-compatible database adapters and managers
 */

export { SQLiteAdapter } from './adapters/sqlite';
export { ConnectionManager } from './core/connection.manager';
export type { DatabaseAdapter } from './adapters/sqlite';
