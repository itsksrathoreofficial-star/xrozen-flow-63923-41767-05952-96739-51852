/**
 * Phase 5: Export all data from Supabase
 * Creates JSON backups of all tables including auth.users
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXPORT_DIR = path.join(process.cwd(), 'migration', 'exports');
const BATCH_SIZE = 1000;

interface ExportMetadata {
  table: string;
  rows: number;
  checksum: string;
  timestamp: string;
  filePath: string;
}

const TABLES = [
  'profiles',
  'user_roles',
  'projects',
  'project_clients',
  'video_versions',
  'editors',
  'clients',
  'messages',
  'payments',
  'project_types',
  'database_config'
];

async function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

async function exportTable(tableName: string): Promise<ExportMetadata> {
  console.log(`📤 Exporting table: ${tableName}...`);
  
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  // Fetch data in batches
  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      offset += BATCH_SIZE;
      console.log(`  → Fetched ${allData.length} rows...`);
    } else {
      hasMore = false;
    }

    if (data && data.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  // Write to file
  const fileName = `${tableName}.json`;
  const filePath = path.join(EXPORT_DIR, fileName);
  const jsonData = JSON.stringify(allData, null, 2);
  
  fs.writeFileSync(filePath, jsonData);

  // Generate checksum
  const checksum = crypto.createHash('md5').update(jsonData).digest('hex');
  fs.writeFileSync(`${filePath}.md5`, checksum);

  console.log(`✅ Exported ${allData.length} rows to ${fileName} (MD5: ${checksum.substring(0, 8)}...)`);

  return {
    table: tableName,
    rows: allData.length,
    checksum,
    timestamp: new Date().toISOString(),
    filePath: fileName
  };
}

async function exportAuthUsers(): Promise<ExportMetadata> {
  console.log(`📤 Exporting auth.users...`);

  // Use admin API to fetch users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to export auth.users: ${error.message}`);
  }

  // Extract only necessary fields
  const userData = users.map(user => ({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    raw_user_meta_data: user.user_metadata
  }));

  const fileName = 'auth_users.json';
  const filePath = path.join(EXPORT_DIR, fileName);
  const jsonData = JSON.stringify(userData, null, 2);
  
  fs.writeFileSync(filePath, jsonData);

  const checksum = crypto.createHash('md5').update(jsonData).digest('hex');
  fs.writeFileSync(`${filePath}.md5`, checksum);

  console.log(`✅ Exported ${userData.length} auth users to ${fileName}`);

  return {
    table: 'auth_users',
    rows: userData.length,
    checksum,
    timestamp: new Date().toISOString(),
    filePath: fileName
  };
}

async function main() {
  console.log('🚀 Starting Supabase data export...\n');
  
  ensureExportDir();

  const manifest: ExportMetadata[] = [];

  // Export all tables
  for (const table of TABLES) {
    try {
      const metadata = await exportTable(table);
      manifest.push(metadata);
    } catch (error) {
      console.error(`❌ Error exporting ${table}:`, error);
      throw error;
    }
  }

  // Export auth users
  try {
    const authMetadata = await exportAuthUsers();
    manifest.push(authMetadata);
  } catch (error) {
    console.error(`❌ Error exporting auth users:`, error);
    throw error;
  }

  // Write manifest
  const manifestPath = path.join(EXPORT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTables: manifest.length,
    totalRows: manifest.reduce((sum, m) => sum + m.rows, 0),
    tables: manifest
  }, null, 2));

  console.log('\n✅ Export complete!');
  console.log(`📊 Total tables: ${manifest.length}`);
  console.log(`📊 Total rows: ${manifest.reduce((sum, m) => sum + m.rows, 0)}`);
  console.log(`📁 Export directory: ${EXPORT_DIR}`);
}

main().catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
