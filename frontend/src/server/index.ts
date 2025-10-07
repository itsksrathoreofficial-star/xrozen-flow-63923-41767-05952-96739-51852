/**
 * Express Server Entry Point
 */

import { loadEnvironmentConfig } from './utils/env.util';
import { createApp } from './app';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { WebSocketManager } from './websocket';
import { logger } from './utils/logger.util';

// Load environment configuration first
loadEnvironmentConfig();

const PORT = process.env.PORT || 3001;

export let wsManager: WebSocketManager;

async function startServer() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    const connectionManager = ConnectionManager.getInstance();
    connectionManager.getConnection();
    logger.info('Database connection established');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
      
      // Initialize WebSocket server
      wsManager = new WebSocketManager(server);
      logger.info('✅ WebSocket server initialized');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        connectionManager.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        connectionManager.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer();
