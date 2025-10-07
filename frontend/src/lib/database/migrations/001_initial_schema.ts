/**
 * Initial Schema Migration
 * Creates all tables for Xrozen Workflow application
 */

import Database from 'better-sqlite3';
import { Migration } from '../core/migration.manager';

export const migration_001_initial_schema: Migration = {
  version: 1,
  name: 'initial_schema',
  
  up: (db: Database.Database) => {
    console.log('Creating initial schema...');

    // Users table (replaces auth.users from Supabase)
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        user_category TEXT NOT NULL DEFAULT 'editor' CHECK(user_category IN ('editor', 'client', 'agency')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Profiles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        user_category TEXT NOT NULL DEFAULT 'editor' CHECK(user_category IN ('editor', 'client', 'agency')),
        subscription_tier TEXT NOT NULL DEFAULT 'basic' CHECK(subscription_tier IN ('basic', 'pro', 'premium')),
        subscription_active INTEGER NOT NULL DEFAULT 1,
        trial_end_date TEXT,
        subscription_start_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User roles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('editor', 'client', 'agency')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, role),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Projects table
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_type TEXT,
        editor_id TEXT,
        client_id TEXT,
        creator_id TEXT NOT NULL,
        raw_footage_link TEXT,
        assigned_date TEXT,
        deadline TEXT,
        fee REAL,
        status TEXT DEFAULT 'draft',
        parent_project_id TEXT,
        is_subproject INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Editors table
    db.exec(`
      CREATE TABLE IF NOT EXISTS editors (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        specialty TEXT,
        employment_type TEXT NOT NULL DEFAULT 'freelance' CHECK(employment_type IN ('fulltime', 'freelance')),
        hourly_rate REAL,
        monthly_salary REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Clients table
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT,
        employment_type TEXT NOT NULL DEFAULT 'freelance' CHECK(employment_type IN ('fulltime', 'freelance')),
        project_rate REAL,
        monthly_rate REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Project clients junction table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_clients (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, client_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    // Video versions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS video_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        preview_url TEXT,
        final_url TEXT,
        is_approved INTEGER NOT NULL DEFAULT 0,
        correction_notes TEXT,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES profiles(id)
      )
    `);

    // Messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        sender_id TEXT NOT NULL,
        recipient_id TEXT,
        content TEXT NOT NULL,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES profiles(id),
        FOREIGN KEY (recipient_id) REFERENCES profiles(id)
      )
    `);

    // Payments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        payer_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL CHECK(payment_type IN ('freelance', 'fulltime')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue')),
        invoice_url TEXT,
        due_date TEXT,
        paid_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (payer_id) REFERENCES profiles(id),
        FOREIGN KEY (recipient_id) REFERENCES profiles(id)
      )
    `);

    // Project types table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Database config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS database_config (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL DEFAULT 'sqlite',
        config TEXT NOT NULL DEFAULT '{}',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Password reset tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    console.log('Creating indexes...');

    // User indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    
    // Profile indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_profiles_user_category ON profiles(user_category)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier)');
    
    // Project indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_editor_id ON projects(editor_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
    
    // Message indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)');
    
    // Payment indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_payments_recipient_id ON payments(recipient_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    
    console.log('✅ Initial schema created successfully');
  },
  
  down: (db: Database.Database) => {
    console.log('Dropping initial schema...');

    // Drop tables in reverse order (respecting foreign keys)
    const tables = [
      'password_reset_tokens',
      'database_config',
      'project_types',
      'payments',
      'messages',
      'video_versions',
      'project_clients',
      'clients',
      'editors',
      'projects',
      'user_roles',
      'profiles',
      'users',
    ];

    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }

    console.log('✅ Initial schema dropped successfully');
  },
};
