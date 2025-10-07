/**
 * Phase 5: Import transformed data to SQLite
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { transformTableTimestamps } from '../transformers/timestamp-transformer';
import { transformTableEnums } from '../transformers/enum-transformer';

const EXPORT_DIR = path.join(process.cwd(), 'migration', 'exports');
const TRANSFORMED_DIR = path.join(process.cwd(), 'migration', 'transformed');
const REPORT_DIR = path.join(process.cwd(), 'migration', 'reports');

interface ImportResult {
  table: string;
  rowsImported: number;
  errors: string[];
  duration: number;
}

// Import order based on foreign key dependencies
const IMPORT_ORDER = [
  { 
    file: 'users.json', 
    table: 'users',
    source: 'transformed'
  },
  { 
    file: 'profiles.json', 
    table: 'profiles',
    source: 'exports',
    timestamps: ['created_at', 'updated_at', 'trial_end_date', 'subscription_start_date'],
    enums: { user_category: 'user_category', subscription_tier: 'subscription_tier' }
  },
  { 
    file: 'user_roles.json', 
    table: 'user_roles',
    source: 'exports',
    timestamps: ['created_at'],
    enums: { role: 'app_role' }
  },
  { 
    file: 'editors.json', 
    table: 'editors',
    source: 'exports',
    timestamps: ['created_at', 'updated_at'],
    enums: { employment_type: 'employment_type' }
  },
  { 
    file: 'clients.json', 
    table: 'clients',
    source: 'exports',
    timestamps: ['created_at', 'updated_at'],
    enums: { employment_type: 'employment_type' }
  },
  { 
    file: 'projects.json', 
    table: 'projects',
    source: 'exports',
    timestamps: ['created_at', 'updated_at', 'assigned_date', 'deadline']
  },
  { 
    file: 'project_clients.json', 
    table: 'project_clients',
    source: 'exports',
    timestamps: ['created_at']
  },
  { 
    file: 'video_versions.json', 
    table: 'video_versions',
    source: 'exports',
    timestamps: ['created_at', 'updated_at']
  },
  { 
    file: 'messages.json', 
    table: 'messages',
    source: 'exports',
    timestamps: ['created_at']
  },
  { 
    file: 'payments.json', 
    table: 'payments',
    source: 'exports',
    timestamps: ['created_at', 'updated_at', 'due_date', 'paid_date'],
    enums: { payment_type: 'payment_type', status: 'payment_status' }
  },
  { 
    file: 'project_types.json', 
    table: 'project_types',
    source: 'exports',
    timestamps: ['created_at']
  },
  { 
    file: 'database_config.json', 
    table: 'database_config',
    source: 'exports',
    timestamps: ['created_at', 'updated_at']
  }
];

function getDb(): Database.Database {
  const config = getDatabaseConfig();
  return new Database(config.filename);
}

function importTable(
  db: Database.Database, 
  tableName: string, 
  data: any[],
  transformConfig?: {
    timestamps?: string[];
    enums?: Record<string, any>;
  }
): ImportResult {
  const startTime = Date.now();
  const errors: string[] = [];
  let rowsImported = 0;

  console.log(`📥 Importing ${tableName}... (${data.length} rows)`);

  if (data.length === 0) {
    console.log(`  ⚠️ No data to import`);
    return { table: tableName, rowsImported: 0, errors: [], duration: 0 };
  }

  // Transform data
  let transformedData = data;
  
  if (transformConfig?.timestamps) {
    transformedData = transformTableTimestamps(transformedData, transformConfig.timestamps);
  }
  
  if (transformConfig?.enums) {
    transformedData = transformTableEnums(transformedData, transformConfig.enums);
  }

  // Prepare insert statement
  const columns = Object.keys(transformedData[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);

  // Import in transaction with batches
  const BATCH_SIZE = 100;
  const batches = Math.ceil(transformedData.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, transformedData.length);
    const batch = transformedData.slice(start, end);

    const transaction = db.transaction((rows: any[]) => {
      for (const row of rows) {
        try {
          const values = columns.map(col => row[col]);
          stmt.run(...values);
          rowsImported++;
        } catch (error: any) {
          errors.push(`Row error: ${error.message}`);
        }
      }
    });

    transaction(batch);
    
    console.log(`  → Progress: ${rowsImported}/${data.length}`);
  }

  const duration = Date.now() - startTime;
  
  if (errors.length > 0) {
    console.log(`  ⚠️ Completed with ${errors.length} errors`);
  } else {
    console.log(`  ✅ Imported ${rowsImported} rows in ${duration}ms`);
  }

  return { table: tableName, rowsImported, errors, duration };
}

async function main() {
  console.log('🚀 Starting SQLite data import...\n');

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const db = getDb();
  const results: ImportResult[] = [];
  let totalRows = 0;
  let totalErrors = 0;

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  for (const importSpec of IMPORT_ORDER) {
    const sourceDir = importSpec.source === 'transformed' ? TRANSFORMED_DIR : EXPORT_DIR;
    const filePath = path.join(sourceDir, importSpec.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${importSpec.file}, skipping...`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const result = importTable(db, importSpec.table, data, {
      timestamps: (importSpec as any).timestamps,
      enums: (importSpec as any).enums
    });

    results.push(result);
    totalRows += result.rowsImported;
    totalErrors += result.errors.length;
  }

  db.close();

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    status: totalErrors === 0 ? 'success' : 'completed_with_errors',
    summary: {
      totalTables: results.length,
      totalRowsImported: totalRows,
      totalErrors,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    },
    tables: results
  };

  const reportPath = path.join(REPORT_DIR, 'import-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n📊 Import Summary:');
  console.log(`  Total tables: ${results.length}`);
  console.log(`  Total rows imported: ${totalRows}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`  Total duration: ${report.summary.totalDuration}ms`);
  console.log(`\n📁 Report saved to: ${reportPath}`);

  if (totalErrors > 0) {
    console.error('\n⚠️ Import completed with errors. Review the report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ Import completed successfully!');
  }
}

main().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
