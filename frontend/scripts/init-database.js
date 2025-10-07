/**
 * Simple Database Initialization Script
 * Creates SQLite database with basic tables
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import bcrypt from 'bcryptjs';

async function initializeDatabase() {
  console.log('🚀 Initializing SQLite database...\n');

  try {
    // Create database file
    const dbPath = path.join(process.cwd(), 'data', 'xrozen-dev.db');
    console.log(`📁 Database file: ${dbPath}`);

    // Create database connection
    const db = new Database(dbPath);
    
    // Apply production optimizations
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    db.pragma('temp_store = MEMORY');

    console.log('✅ Database connection established');
    console.log('✅ Production optimizations applied');

    // Create tables
    console.log('\n📋 Creating tables...');

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
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        skills TEXT,
        hourly_rate REAL,
        employment_type TEXT CHECK(employment_type IN ('full_time', 'part_time', 'contract', 'freelance')),
        availability TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Clients table
    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        employment_type TEXT CHECK(employment_type IN ('individual', 'company', 'agency')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Project clients junction table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_clients (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(project_id, client_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // Video versions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS video_versions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_url TEXT,
        thumbnail_url TEXT,
        duration REAL,
        file_size INTEGER,
        uploader_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'revision_requested')),
        feedback TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
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
        message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'file', 'image', 'video')),
        file_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
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
        currency TEXT DEFAULT 'INR',
        payment_type TEXT CHECK(payment_type IN ('advance', 'milestone', 'final', 'bonus')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed', 'refunded')),
        payment_method TEXT,
        transaction_id TEXT,
        due_date TEXT,
        paid_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Project types table
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Database config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS database_config (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK(type IN ('info', 'warning', 'error', 'success')),
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Notification preferences table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        email_notifications INTEGER DEFAULT 1,
        push_notifications INTEGER DEFAULT 1,
        project_updates INTEGER DEFAULT 1,
        payment_notifications INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // API keys table
    db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_name TEXT NOT NULL,
        key_value TEXT NOT NULL UNIQUE,
        permissions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Admin activity logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Password reset tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ All tables created successfully');

    // Create initial admin user
    console.log('\n👤 Creating initial admin user...');
    
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123'; // Change this in production
    
    // Check if admin user already exists
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    
    if (!existingAdmin) {
      // Create admin user with hashed password
      const userId = randomUUID();
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, user_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(userId, adminEmail, hashedPassword, 'Admin User', 'agency');
      
      db.prepare(`
        INSERT INTO profiles (id, email, full_name, user_category, subscription_tier, subscription_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(userId, adminEmail, 'Admin User', 'agency', 'premium', 1);
      
      db.prepare(`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(randomUUID(), userId, 'agency');
      
      console.log('✅ Admin user created');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create sample data for testing
    console.log('\n📝 Creating sample data...');
    
    // Create sample project types
    const projectTypes = [
      { id: randomUUID(), name: 'Corporate Video', description: 'Professional corporate videos' },
      { id: randomUUID(), name: 'Social Media', description: 'Short-form social media content' },
      { id: randomUUID(), name: 'Documentary', description: 'Long-form documentary content' },
      { id: randomUUID(), name: 'Advertisement', description: 'Commercial advertisements' }
    ];

    for (const type of projectTypes) {
      db.prepare(`
        INSERT OR IGNORE INTO project_types (id, name, description, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(type.id, type.name, type.description);
    }

    console.log('✅ Sample project types created');

    // Get database statistics
    const stats = {
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      profiles: db.prepare('SELECT COUNT(*) as count FROM profiles').get().count,
      projectTypes: db.prepare('SELECT COUNT(*) as count FROM project_types').get().count,
      tables: db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get().count
    };

    console.log('\n📊 Database Statistics:');
    console.log(`  Users: ${stats.users}`);
    console.log(`  Profiles: ${stats.profiles}`);
    console.log(`  Project Types: ${stats.projectTypes}`);
    console.log(`  Total Tables: ${stats.tables}`);

    // Close database connection
    db.close();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the backend server: npm run server');
    console.log('2. Start the frontend: npm run dev');
    console.log('3. Login with admin credentials');
    console.log('4. Begin frontend refactoring');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();