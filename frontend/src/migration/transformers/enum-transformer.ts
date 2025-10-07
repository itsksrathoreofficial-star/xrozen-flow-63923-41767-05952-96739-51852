/**
 * Transform PostgreSQL ENUMs to SQLite TEXT with validation
 */

const ENUM_TYPES = {
  user_category: ['editor', 'client', 'agency'],
  subscription_tier: ['basic', 'pro', 'premium'],
  app_role: ['editor', 'client', 'agency'],
  employment_type: ['fulltime', 'freelance'],
  payment_type: ['freelance', 'fulltime'],
  payment_status: ['pending', 'paid', 'overdue'],
  project_status: ['draft', 'in_review', 'approved', 'completed']
};

export function validateEnum(value: any, enumType: keyof typeof ENUM_TYPES): boolean {
  if (value === null || value === undefined) return true;
  return ENUM_TYPES[enumType].includes(value);
}

export function transformEnumValue(value: any, enumType: keyof typeof ENUM_TYPES): string {
  if (!validateEnum(value, enumType)) {
    throw new Error(`Invalid enum value "${value}" for type ${enumType}. Allowed: ${ENUM_TYPES[enumType].join(', ')}`);
  }
  return value;
}

export function transformTableEnums(data: any[], enumMappings: Record<string, keyof typeof ENUM_TYPES>): any[] {
  return data.map(row => {
    const transformedRow = { ...row };
    
    for (const [column, enumType] of Object.entries(enumMappings)) {
      if (row[column] !== undefined) {
        transformedRow[column] = transformEnumValue(row[column], enumType);
      }
    }
    
    return transformedRow;
  });
}
