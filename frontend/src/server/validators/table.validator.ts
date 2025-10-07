/**
 * Table Validation Schemas
 */

import { z } from 'zod';

export const createTableSchema = z.object({
  name: z.string()
    .min(1, 'Table name is required')
    .max(64, 'Table name must be less than 64 characters')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid table name format'),
  columns: z.array(z.object({
    name: z.string()
      .min(1, 'Column name is required')
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid column name'),
    type: z.enum(['TEXT', 'INTEGER', 'REAL', 'BLOB', 'NUMERIC']),
    primaryKey: z.boolean().optional(),
    unique: z.boolean().optional(),
    notNull: z.boolean().optional(),
    defaultValue: z.any().optional(),
  })).min(1, 'At least one column is required'),
  foreignKeys: z.array(z.object({
    column: z.string(),
    referencesTable: z.string(),
    referencesColumn: z.string(),
    onDelete: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional(),
    onUpdate: z.enum(['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION']).optional(),
  })).optional(),
});

export const modifyTableSchema = z.object({
  operation: z.enum(['add_column', 'rename_table', 'rename_column', 'drop_column']),
  columnName: z.string().optional(),
  newName: z.string().optional(),
  columnType: z.enum(['TEXT', 'INTEGER', 'REAL', 'BLOB', 'NUMERIC']).optional(),
  defaultValue: z.any().optional(),
});

export const insertRowSchema = z.object({
  data: z.record(z.any()),
});

export const updateRowSchema = z.object({
  data: z.record(z.any()),
});

export const getTableDataSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(50),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['ASC', 'DESC']).optional(),
  search: z.string().optional(),
});

export const exportTableSchema = z.object({
  format: z.enum(['csv', 'json']),
});
