/**
 * Table Service - Business Logic for Table Operations
 */

import Database from 'better-sqlite3';

export interface TableMetadata {
  name: string;
  rowCount: number;
  columns: any[];
  indexes: any[];
  foreignKeys: any[];
}

export interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export class TableService {
  constructor(private db: Database.Database) {}

  /**
   * Get all table names
   */
  getTables(): Array<{ name: string; type: string }> {
    const tables = this.db.prepare(`
      SELECT name, type 
      FROM sqlite_master 
      WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_%'
      ORDER BY name
    `).all() as Array<{ name: string; type: string }>;

    return tables;
  }

  /**
   * Get table metadata
   */
  getTableMetadata(tableName: string): TableMetadata {
    // Validate table name
    this.validateTableName(tableName);

    // Get columns
    const columns = this.db.prepare(`PRAGMA table_info(${tableName})`).all();

    // Get indexes
    const indexes = this.db.prepare(`PRAGMA index_list(${tableName})`).all();

    // Get foreign keys
    const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();

    // Get row count
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };

    return {
      name: tableName,
      rowCount: count,
      columns,
      indexes,
      foreignKeys,
    };
  }

  /**
   * Get table relationships
   */
  getTableRelationships(tableName: string): Array<any> {
    this.validateTableName(tableName);

    const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();

    return foreignKeys;
  }

  /**
   * Build CREATE TABLE SQL
   */
  buildCreateTableSQL(definition: any): string {
    const { name, columns, foreignKeys } = definition;

    let sql = `CREATE TABLE ${name} (\n`;

    // Add columns
    const columnDefs = columns.map((col: any) => {
      let def = `  ${col.name} ${col.type}`;
      
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.unique) def += ' UNIQUE';
      if (col.notNull) def += ' NOT NULL';
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
      }

      return def;
    });

    sql += columnDefs.join(',\n');

    // Add foreign keys
    if (foreignKeys && foreignKeys.length > 0) {
      const fkDefs = foreignKeys.map((fk: any) => {
        let def = `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencesTable}(${fk.referencesColumn})`;
        if (fk.onDelete) def += ` ON DELETE ${fk.onDelete}`;
        if (fk.onUpdate) def += ` ON UPDATE ${fk.onUpdate}`;
        return def;
      });

      sql += ',\n' + fkDefs.join(',\n');
    }

    sql += '\n)';

    return sql;
  }

  /**
   * Validate table name
   */
  validateTableName(tableName: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name');
    }

    // Check for SQL injection attempts
    const forbidden = ['drop', 'delete', 'insert', 'update', 'alter', 'create'];
    if (forbidden.some(keyword => tableName.toLowerCase().includes(keyword))) {
      throw new Error('Table name contains forbidden keywords');
    }
  }

  /**
   * Check if table exists
   */
  tableExists(tableName: string): boolean {
    const result = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);

    return !!result;
  }

  /**
   * Export table data to JSON
   */
  exportToJSON(tableName: string): string {
    this.validateTableName(tableName);
    const rows = this.db.prepare(`SELECT * FROM ${tableName}`).all();
    return JSON.stringify(rows, null, 2);
  }

  /**
   * Export table data to CSV
   */
  exportToCSV(tableName: string): string {
    this.validateTableName(tableName);
    const rows = this.db.prepare(`SELECT * FROM ${tableName}`).all() as Array<Record<string, any>>;

    if (rows.length === 0) return '';

    // Get column names
    const columns = Object.keys(rows[0]);

    // Create CSV header
    let csv = columns.join(',') + '\n';

    // Add rows
    rows.forEach(row => {
      const values = columns.map(col => {
        const value = row[col];
        if (value === null) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(',') + '\n';
    });

    return csv;
  }
}
