/**
 * Phase 5: Validate exported data integrity
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXPORT_DIR = path.join(process.cwd(), 'migration', 'exports');
const REPORT_DIR = path.join(process.cwd(), 'migration', 'reports');

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}

interface TableValidation {
  exported: number;
  validated: number;
  supabaseCount: number;
  checksumValid: boolean;
  issues: ValidationIssue[];
}

interface ValidationReport {
  timestamp: string;
  status: 'success' | 'failed';
  tables: Record<string, TableValidation>;
  summary: {
    totalTables: number;
    passedTables: number;
    failedTables: number;
    totalIssues: number;
  };
}

async function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function validateChecksum(filePath: string): boolean {
  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const expectedChecksum = fs.readFileSync(`${filePath}.md5`, 'utf-8').trim();
  const actualChecksum = crypto.createHash('md5').update(jsonData).digest('hex');
  return expectedChecksum === actualChecksum;
}

function validateRecordStructure(data: any[], tableName: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for empty export
  if (data.length === 0) {
    issues.push({
      type: 'warning',
      message: 'Table is empty'
    });
    return issues;
  }

  // Validate UUIDs
  data.forEach((row, index) => {
    if (row.id && !isValidUUID(row.id)) {
      issues.push({
        type: 'error',
        message: `Row ${index}: Invalid UUID format for id`
      });
    }
  });

  // Table-specific validations
  if (tableName === 'profiles') {
    data.forEach((row, index) => {
      if (!row.email || !isValidEmail(row.email)) {
        issues.push({
          type: 'error',
          message: `Row ${index}: Invalid email format`
        });
      }
    });
  }

  if (tableName === 'projects') {
    data.forEach((row, index) => {
      if (!row.creator_id) {
        issues.push({
          type: 'error',
          message: `Row ${index}: Missing creator_id`
        });
      }
    });
  }

  return issues;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function getSupabaseRowCount(tableName: string): Promise<number> {
  if (tableName === 'auth_users') {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    return users.length;
  }

  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to count ${tableName}: ${error.message}`);
  }

  return count || 0;
}

async function validateTable(tableName: string): Promise<TableValidation> {
  console.log(`🔍 Validating ${tableName}...`);

  const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
  
  if (!fs.existsSync(filePath)) {
    return {
      exported: 0,
      validated: 0,
      supabaseCount: 0,
      checksumValid: false,
      issues: [{ type: 'error', message: 'Export file not found' }]
    };
  }

  // Validate checksum
  const checksumValid = validateChecksum(filePath);
  const issues: ValidationIssue[] = [];

  if (!checksumValid) {
    issues.push({
      type: 'error',
      message: 'Checksum validation failed - file may be corrupted'
    });
  }

  // Load data
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const exported = data.length;

  // Validate structure
  const structureIssues = validateRecordStructure(data, tableName);
  issues.push(...structureIssues);

  // Compare with Supabase count
  const supabaseCount = await getSupabaseRowCount(tableName);
  
  if (exported !== supabaseCount) {
    issues.push({
      type: 'error',
      message: `Row count mismatch: exported ${exported}, Supabase has ${supabaseCount}`
    });
  }

  const validated = exported - issues.filter(i => i.type === 'error').length;

  console.log(`  ${checksumValid ? '✅' : '❌'} Checksum ${checksumValid ? 'valid' : 'invalid'}`);
  console.log(`  ${exported === supabaseCount ? '✅' : '❌'} Row count: ${exported} (Supabase: ${supabaseCount})`);
  console.log(`  ${issues.length === 0 ? '✅' : '⚠️'} Issues found: ${issues.length}`);

  return {
    exported,
    validated,
    supabaseCount,
    checksumValid,
    issues
  };
}

async function main() {
  console.log('🚀 Starting export validation...\n');

  ensureReportDir();

  // Load manifest
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Manifest file not found. Run export script first.');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    status: 'success',
    tables: {},
    summary: {
      totalTables: manifest.tables.length,
      passedTables: 0,
      failedTables: 0,
      totalIssues: 0
    }
  };

  // Validate each table
  for (const tableInfo of manifest.tables) {
    const validation = await validateTable(tableInfo.table);
    report.tables[tableInfo.table] = validation;

    if (validation.issues.length === 0 && validation.checksumValid) {
      report.summary.passedTables++;
    } else {
      report.summary.failedTables++;
      report.status = 'failed';
    }

    report.summary.totalIssues += validation.issues.length;
  }

  // Write report
  const reportPath = path.join(REPORT_DIR, 'export-validation.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n📊 Validation Summary:');
  console.log(`  Total tables: ${report.summary.totalTables}`);
  console.log(`  Passed: ${report.summary.passedTables}`);
  console.log(`  Failed: ${report.summary.failedTables}`);
  console.log(`  Total issues: ${report.summary.totalIssues}`);
  console.log(`\n📁 Report saved to: ${reportPath}`);

  if (report.status === 'failed') {
    console.error('\n❌ Validation failed! Review the report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed!');
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
