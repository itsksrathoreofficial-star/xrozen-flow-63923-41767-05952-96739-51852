/**
 * Supabase Adapter - Enhanced Implementation
 * Wraps Supabase client within universal interface
 */

import { BaseAdapter } from './base';
import type { UniversalQuery, User, DatabaseProvider } from '../types';

// Lazy import to avoid initialization issues
let supabaseClient: any = null;
const getSupabase = async () => {
  if (!supabaseClient) {
    const { supabase } = await import("@/integrations/supabase/client");
    supabaseClient = supabase;
  }
  return supabaseClient;
};

export class SupabaseAdapter extends BaseAdapter {
  async query<T = any>(query: UniversalQuery, user?: User | null): Promise<T> {
    this.logQuery(query);
    
    const supabase = await getSupabase();
    const { collection, operation, data, where, orderBy, limit, offset, select, join, aggregate, or } = query;

    try {
      switch (operation) {
        case 'select':
          return await this.handleSelect(supabase, query);

        case 'insert':
          return await this.handleInsert(supabase, collection, data);

        case 'update':
          return await this.handleUpdate(supabase, collection, where, data);

        case 'delete':
          return await this.handleDelete(supabase, collection, where);

        case 'count':
          return await this.handleCount(supabase, collection, where) as T;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error: any) {
      this.handleError(error, `${operation} on ${collection}`);
    }
  }

  private async handleSelect(supabase: any, query: UniversalQuery): Promise<any> {
    const { collection, select, where, or, orderBy, limit, offset, join, aggregate } = query;

    let selectQuery = supabase.from(collection).select(select || '*');

    // Apply WHERE conditions
    if (where && where.length > 0) {
      for (const condition of where) {
        selectQuery = this.applyWhereCondition(selectQuery, condition);
      }
    }

    // Apply OR conditions
    if (or && or.length > 0) {
      const orConditions = or.map(orGroup => 
        orGroup.map(c => `${c.field}.${this.mapOperator(c.operator)}.${c.value}`).join(',')
      ).join(',');
      selectQuery = selectQuery.or(orConditions);
    }

    // Apply ORDER BY
    if (orderBy && orderBy.length > 0) {
      for (const order of orderBy) {
        selectQuery = selectQuery.order(order.field, { 
          ascending: order.direction === 'asc' 
        });
      }
    }

    // Apply LIMIT and OFFSET
    if (limit) {
      selectQuery = selectQuery.limit(limit);
    }
    if (offset) {
      selectQuery = selectQuery.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await selectQuery;
    
    if (error) throw error;
    return data;
  }

  private async handleInsert(supabase: any, collection: string, data: any): Promise<any> {
    const { data: insertData, error } = await supabase
      .from(collection)
      .insert(data)
      .select();

    if (error) throw error;
    return Array.isArray(insertData) ? insertData[0] : insertData;
  }

  private async handleUpdate(supabase: any, collection: string, where: any[], data: any): Promise<any> {
    if (!where || where.length === 0) {
      throw new Error('Update requires where clause');
    }

    let updateQuery = supabase.from(collection).update(data);

    for (const condition of where) {
      updateQuery = this.applyWhereCondition(updateQuery, condition);
    }

    const { data: updateData, error } = await updateQuery.select();

    if (error) throw error;
    return Array.isArray(updateData) ? updateData[0] : updateData;
  }

  private async handleDelete(supabase: any, collection: string, where: any[]): Promise<any> {
    if (!where || where.length === 0) {
      throw new Error('Delete requires where clause');
    }

    let deleteQuery = supabase.from(collection).delete();

    for (const condition of where) {
      deleteQuery = this.applyWhereCondition(deleteQuery, condition);
    }

    const { error } = await deleteQuery;

    if (error) throw error;
    return null;
  }

  private async handleCount(supabase: any, collection: string, where?: any[]): Promise<number> {
    let countQuery = supabase.from(collection).select('*', { count: 'exact', head: true });

    if (where && where.length > 0) {
      for (const condition of where) {
        countQuery = this.applyWhereCondition(countQuery, condition);
      }
    }

    const { count, error } = await countQuery;

    if (error) throw error;
    return count || 0;
  }

  private applyWhereCondition(query: any, condition: any): any {
    const { field, operator, value } = condition;

    switch (operator) {
      case '=':
        return query.eq(field, value);
      case '!=':
        return query.neq(field, value);
      case '>':
        return query.gt(field, value);
      case '<':
        return query.lt(field, value);
      case '>=':
        return query.gte(field, value);
      case '<=':
        return query.lte(field, value);
      case 'in':
        return query.in(field, value);
      case 'not in':
        return query.not(field, 'in', value);
      case 'like':
        return query.like(field, value);
      case 'ilike':
        return query.ilike(field, value);
      case 'is null':
        return query.is(field, null);
      case 'is not null':
        return query.not(field, 'is', null);
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      '=': 'eq',
      '!=': 'neq',
      '>': 'gt',
      '<': 'lt',
      '>=': 'gte',
      '<=': 'lte',
      'in': 'in',
      'like': 'like',
      'ilike': 'ilike',
    };

    return operatorMap[operator] || operator;
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query({
        collection: 'profiles',
        operation: 'select',
        select: ['id'],
        limit: 1,
      });
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    // Supabase handles connection pooling automatically
    this.connected = false;
  }

  async backup(): Promise<any> {
    // Backup all tables
    const tables = [
      'profiles',
      'user_roles',
      'projects',
      'project_clients',
      'project_types',
      'video_versions',
      'editors',
      'clients',
      'messages',
      'payments',
      'database_config',
    ];

    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const data = await this.query({
          collection: table,
          operation: 'select',
        });
        backup[table] = data || [];
      } catch (error) {
        console.error(`Failed to backup table ${table}:`, error);
        backup[table] = [];
      }
    }

    return {
      schema: {}, // Schema backup not implemented for Supabase
      data: backup,
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        recordCount: Object.values(backup).reduce((sum, data) => sum + data.length, 0),
      },
    };
  }

  async restore(data: any): Promise<void> {
    const { data: tableData } = data;

    for (const [table, records] of Object.entries(tableData)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      try {
        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          await this.query({
            collection: table,
            operation: 'insert',
            data: batch,
          });
        }
        console.log(`Restored ${records.length} records to ${table}`);
      } catch (error) {
        console.error(`Failed to restore table ${table}:`, error);
      }
    }
  }

  getProviderName(): DatabaseProvider {
    return 'supabase';
  }
}
