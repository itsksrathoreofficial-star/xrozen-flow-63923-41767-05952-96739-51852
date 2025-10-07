/**
 * Backup Manager for SQLite
 * Automated backups, scheduling, and restore capabilities
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DatabaseConfig } from '@/config/database.config';

export interface BackupOptions {
  filename?: string;
  compress?: boolean;
  includeTimestamp?: boolean;
}

export class BackupManager {
  private db: Database.Database;
  private config: DatabaseConfig;

  constructor(db: Database.Database, config: DatabaseConfig) {
    this.db = db;
    this.config = config;
    
    // Ensure backup directory exists
    if (!fs.existsSync(config.backupDirectory)) {
      fs.mkdirSync(config.backupDirectory, { recursive: true });
    }
  }

  /**
   * Create backup with timestamp
   */
  async createBackup(options: BackupOptions = {}): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = options.filename || `xrozen-backup-${timestamp}.db`;
      const backupPath = path.join(this.config.backupDirectory, filename);

      console.log(`📦 Creating backup: ${backupPath}`);

      // Use SQLite's built-in backup API
      await new Promise((resolve, reject) => {
        this.db.backup(backupPath)
          .then(() => {
            console.log(`✅ Backup created successfully: ${backupPath}`);
            resolve(backupPath);
          })
          .catch(reject);
      });

      // Get backup file size
      const stats = fs.statSync(backupPath);
      console.log(`📊 Backup size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw new Error(`Backup failed: ${error}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      console.log(`🔄 Restoring from backup: ${backupPath}`);

      // Close current connection
      this.db.close();

      // Copy backup file to main database location
      fs.copyFileSync(backupPath, this.config.filename);

      console.log('✅ Restore completed successfully');
      console.log('⚠️  Application needs to restart to use restored database');
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw new Error(`Restore failed: ${error}`);
    }
  }

  /**
   * List all backups
   */
  listBackups(): Array<{ filename: string; size: number; created: Date }> {
    try {
      const files = fs.readdirSync(this.config.backupDirectory);
      
      return files
        .filter(file => file.endsWith('.db'))
        .map(file => {
          const filepath = path.join(this.config.backupDirectory, file);
          const stats = fs.statSync(filepath);
          
          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime,
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups (keep only last N)
   */
  cleanOldBackups(keepCount: number = 10): void {
    try {
      const backups = this.listBackups();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        for (const backup of toDelete) {
          const filepath = path.join(this.config.backupDirectory, backup.filename);
          fs.unlinkSync(filepath);
          console.log(`🗑️  Deleted old backup: ${backup.filename}`);
        }
        
        console.log(`✅ Cleaned ${toDelete.length} old backups`);
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleBackups(intervalHours: number = 24): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`⏰ Scheduled automatic backups every ${intervalHours} hours`);
    
    return setInterval(async () => {
      console.log('🔔 Running scheduled backup...');
      await this.createBackup();
      this.cleanOldBackups();
    }, intervalMs);
  }
}
