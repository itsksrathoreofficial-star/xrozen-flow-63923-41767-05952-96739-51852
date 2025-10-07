export const SQLITE_DATA_TYPES = [
  { value: 'TEXT', label: 'TEXT', description: 'String data' },
  { value: 'INTEGER', label: 'INTEGER', description: 'Whole numbers' },
  { value: 'REAL', label: 'REAL', description: 'Floating point numbers' },
  { value: 'BLOB', label: 'BLOB', description: 'Binary data' },
  { value: 'NUMERIC', label: 'NUMERIC', description: 'Numeric values' },
] as const;

export const CASCADE_ACTIONS = [
  { value: 'CASCADE', label: 'CASCADE' },
  { value: 'SET NULL', label: 'SET NULL' },
  { value: 'RESTRICT', label: 'RESTRICT' },
  { value: 'NO ACTION', label: 'NO ACTION' },
] as const;
