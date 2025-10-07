/**
 * Transform PostgreSQL TIMESTAMPTZ to ISO 8601 strings for SQLite
 */

export function transformTimestamp(value: any): string | null {
  if (value === null || value === undefined) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    return date.toISOString();
  } catch (error) {
    console.error(`Error transforming timestamp "${value}":`, error);
    throw error;
  }
}

export function transformTableTimestamps(data: any[], timestampColumns: string[]): any[] {
  return data.map(row => {
    const transformedRow = { ...row };
    
    for (const column of timestampColumns) {
      if (row[column] !== undefined) {
        transformedRow[column] = transformTimestamp(row[column]);
      }
    }
    
    return transformedRow;
  });
}

export function validateTimestamps(data: any[], timestampColumns: string[]): boolean {
  for (const row of data) {
    for (const column of timestampColumns) {
      const value = row[column];
      if (value !== null && value !== undefined) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error(`Invalid timestamp in column ${column}: ${value}`);
          return false;
        }
      }
    }
  }
  return true;
}
