/**
 * Server Startup Script
 * Ensures database is initialized before starting the server
 */

import { loadEnvironmentConfig } from './utils/env.util';
import { logger } from './utils/logger.util';
import fs from 'fs';
import path from 'path';

async function ensureDatabaseExists(): Promise<void> {
  const dbPath = path.join(process.cwd(), 'data', 'xrozen-dev.db');
  
  try {
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      logger.info('Database file not found, initializing...');
      
      // Ensure data directory exists
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        logger.info('✅ Created data directory');
      }
      
      // Run database initialization directly
      const { execSync } = await import('child_process');
      
      try {
        execSync('npm run init-db', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        logger.info('✅ Database initialization completed');
      } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        throw error;
      }
    } else {
      logger.info('✅ Database file exists');
    }
  } catch (error) {
    logger.error('❌ Error checking database:', error);
    throw error;
  }
}

async function startServer(): Promise<void> {
  try {
    // Load environment configuration
    loadEnvironmentConfig();
    
    // Ensure database exists
    await ensureDatabaseExists();
    
    // Import and start the actual server
    logger.info('🚀 Starting server...');
    
    // Import the server startup function
    const serverModule = await import('./index');
    
    // The server starts automatically when the module is imported
    logger.info('✅ Server startup process completed');
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
