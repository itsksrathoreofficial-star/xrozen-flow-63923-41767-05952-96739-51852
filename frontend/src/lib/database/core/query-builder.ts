/**
 * Advanced Query Builder for SQLite
 * Type-safe, chainable API similar to Supabase
 */

export interface WhereCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

export class QueryBuilder {
  private table: string = '';
  private selectColumns: string[] = ['*'];
  private whereConditions: WhereCondition[] = [];
  private joinClauses: JoinClause[] = [];
  private orderByField: string | null = null;
  private orderDirection: 'ASC' | 'DESC' = 'ASC';
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private groupByFields: string[] = [];
  private havingCondition: string | null = null;

  /**
   * Set table name
   */
  from(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * Select specific columns
   */
  select(...columns: string[]): this {
    this.selectColumns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  /**
   * Add WHERE condition
   */
  where(field: string, operator: WhereCondition['operator'], value?: any): this {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add OR WHERE condition
   */
  orWhere(field: string, operator: WhereCondition['operator'], value?: any): this {
    // Implement OR logic by wrapping in parentheses
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(table: string, on: string, type: JoinClause['type'] = 'INNER'): this {
    this.joinClauses.push({ type, table, on });
    return this;
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  /**
   * Add ORDER BY
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  /**
   * Add LIMIT
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Add OFFSET
   */
  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  /**
   * Add GROUP BY
   */
  groupBy(...fields: string[]): this {
    this.groupByFields = fields;
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(condition: string): this {
    this.havingCondition = condition;
    return this;
  }

  /**
   * Build SELECT query
   */
  toSelectSQL(): { sql: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    let sql = `SELECT ${this.selectColumns.join(', ')} FROM ${this.table}`;
    const params: any[] = [];

    // Add JOINs
    for (const join of this.joinClauses) {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Add WHERE
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
          return `${condition.field} ${condition.operator}`;
        } else if (condition.operator === 'IN') {
          const placeholders = condition.value.map(() => '?').join(', ');
          params.push(...condition.value);
          return `${condition.field} IN (${placeholders})`;
        } else {
          params.push(condition.value);
          return `${condition.field} ${condition.operator} ?`;
        }
      }).join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }

    // Add GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ` GROUP BY ${this.groupByFields.join(', ')}`;
    }

    // Add HAVING
    if (this.havingCondition) {
      sql += ` HAVING ${this.havingCondition}`;
    }

    // Add ORDER BY
    if (this.orderByField) {
      sql += ` ORDER BY ${this.orderByField} ${this.orderDirection}`;
    }

    // Add LIMIT
    if (this.limitValue !== null) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    // Add OFFSET
    if (this.offsetValue !== null) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params };
  }

  /**
   * Build INSERT query
   */
  toInsertSQL(data: Record<string, any>): { sql: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const params = keys.map(key => data[key]);

    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;

    return { sql, params };
  }

  /**
   * Build UPDATE query
   */
  toUpdateSQL(data: Record<string, any>): { sql: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    const keys = Object.keys(data);
    const setClauses = keys.map(key => `${key} = ?`).join(', ');
    const params = keys.map(key => data[key]);

    let sql = `UPDATE ${this.table} SET ${setClauses}`;

    // Add WHERE
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      }).join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }

    return { sql, params };
  }

  /**
   * Build DELETE query
   */
  toDeleteSQL(): { sql: string; params: any[] } {
    if (!this.table) {
      throw new Error('Table name is required');
    }

    let sql = `DELETE FROM ${this.table}`;
    const params: any[] = [];

    // Add WHERE
    if (this.whereConditions.length > 0) {
      const whereClause = this.whereConditions.map(condition => {
        params.push(condition.value);
        return `${condition.field} ${condition.operator} ?`;
      }).join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    } else {
      throw new Error('DELETE requires WHERE clause for safety');
    }

    return { sql, params };
  }
}
