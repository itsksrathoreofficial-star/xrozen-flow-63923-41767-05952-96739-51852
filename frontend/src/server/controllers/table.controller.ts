/**
 * Table Controller - Table CRUD Operations
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { TableService } from '../services/table.service';
import { successResponse, paginatedResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export class TableController {
  private connectionManager = ConnectionManager.getInstance();
  private tableService: TableService;

  constructor() {
    const db = this.connectionManager.getConnection();
    this.tableService = new TableService(db);
  }

  /**
   * List all tables
   */
  listTables = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tables = this.tableService.getTables();

      const tablesWithMetadata = tables.map(table => {
        try {
          const metadata = this.tableService.getTableMetadata(table.name);
          return {
            name: table.name,
            rowCount: metadata.rowCount,
            columnCount: metadata.columns.length,
          };
        } catch {
          return {
            name: table.name,
            rowCount: 0,
            columnCount: 0,
          };
        }
      });

      res.json(successResponse(tablesWithMetadata));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get table schema
   */
  getTableSchema = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      const metadata = this.tableService.getTableMetadata(name);
      res.json(successResponse(metadata));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get table data with pagination
   */
  getTableData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      const { page = 1, limit = 50, orderBy, orderDirection = 'ASC' } = req.query;

      this.tableService.validateTableName(name);

      const offset = (Number(page) - 1) * Number(limit);

      let query = `SELECT * FROM ${name}`;
      if (orderBy) {
        query += ` ORDER BY ${orderBy} ${orderDirection}`;
      }
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const db = this.connectionManager.getConnection();
      const rows = db.prepare(query).all();

      const { count } = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as { count: number };

      res.json(paginatedResponse(rows, count, Number(page), Number(limit)));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create table
   */
  createTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const definition = req.body;
      const sql = this.tableService.buildCreateTableSQL(definition);

      logger.info(`Creating table with SQL: ${sql}`);

      const db = this.connectionManager.getConnection();
      db.exec(sql);

      res.json(successResponse({ 
        message: `Table '${definition.name}' created successfully`,
        sql 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Modify table
   */
  modifyTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      const { operation, columnName, newName, columnType, defaultValue } = req.body;

      this.tableService.validateTableName(name);

      const db = this.connectionManager.getConnection();

      let sql = '';

      switch (operation) {
        case 'add_column':
          sql = `ALTER TABLE ${name} ADD COLUMN ${columnName} ${columnType}`;
          if (defaultValue !== undefined) {
            sql += ` DEFAULT ${typeof defaultValue === 'string' ? `'${defaultValue}'` : defaultValue}`;
          }
          break;

        case 'rename_table':
          sql = `ALTER TABLE ${name} RENAME TO ${newName}`;
          break;

        case 'rename_column':
          sql = `ALTER TABLE ${name} RENAME COLUMN ${columnName} TO ${newName}`;
          break;

        case 'drop_column':
          sql = `ALTER TABLE ${name} DROP COLUMN ${columnName}`;
          break;

        default:
          throw new Error('Invalid operation');
      }

      logger.info(`Modifying table with SQL: ${sql}`);
      db.exec(sql);

      res.json(successResponse({ 
        message: 'Table modified successfully',
        sql 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Drop table
   */
  dropTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      this.tableService.validateTableName(name);

      const db = this.connectionManager.getConnection();
      db.exec(`DROP TABLE IF EXISTS ${name}`);

      res.json(successResponse({ 
        message: `Table '${name}' dropped successfully` 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Insert row
   */
  insertRow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      const { data } = req.body;

      this.tableService.validateTableName(name);

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');

      const sql = `INSERT INTO ${name} (${columns.join(', ')}) VALUES (${placeholders})`;

      const db = this.connectionManager.getConnection();
      const result = db.prepare(sql).run(...values);

      res.json(successResponse({ 
        message: 'Row inserted successfully',
        lastInsertRowid: result.lastInsertRowid 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update row
   */
  updateRow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, id } = req.params;
      const { data } = req.body;

      this.tableService.validateTableName(name);

      const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];

      const sql = `UPDATE ${name} SET ${setClause} WHERE id = ?`;

      const db = this.connectionManager.getConnection();
      const result = db.prepare(sql).run(...values);

      res.json(successResponse({ 
        message: 'Row updated successfully',
        changes: result.changes 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete row
   */
  deleteRow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, id } = req.params;
      this.tableService.validateTableName(name);

      const db = this.connectionManager.getConnection();
      const result = db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id);

      res.json(successResponse({ 
        message: 'Row deleted successfully',
        changes: result.changes 
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export table
   */
  exportTable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.params;
      const { format } = req.body;

      const data = format === 'csv' 
        ? this.tableService.exportToCSV(name)
        : this.tableService.exportToJSON(name);

      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const extension = format === 'csv' ? 'csv' : 'json';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${name}.${extension}"`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  };
}
