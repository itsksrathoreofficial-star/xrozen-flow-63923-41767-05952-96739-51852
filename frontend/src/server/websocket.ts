/**
 * WebSocket Server for Real-time Features
 * Replaces Supabase Realtime functionality
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './utils/logger.util';

interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      try {
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          ws.close(1008, 'No token provided');
          return;
        }

        // For now, extract userId from token (simplified)
        // In production, use proper JWT verification
        const userId = this.extractUserIdFromToken(token);
        if (!userId) {
          ws.close(1008, 'Invalid token');
          return;
        }

        const client = ws as AuthenticatedWebSocket;
        client.userId = userId;
        client.isAlive = true;

        // Add to clients map
        if (!this.clients.has(client.userId)) {
          this.clients.set(client.userId, new Set());
        }
        this.clients.get(client.userId)!.add(client);

        logger.info(`WebSocket connected: User ${client.userId}`);

        // Heartbeat
        client.on('pong', () => {
          client.isAlive = true;
        });

        client.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(client, message);
          } catch (error) {
            logger.error('Invalid WebSocket message:', error);
          }
        });

        client.on('close', () => {
          this.clients.get(client.userId)?.delete(client);
          if (this.clients.get(client.userId)?.size === 0) {
            this.clients.delete(client.userId);
          }
          logger.info(`WebSocket disconnected: User ${client.userId}`);
        });

        client.on('error', (error) => {
          logger.error(`WebSocket error for user ${client.userId}:`, error);
        });
      } catch (error) {
        logger.error('WebSocket connection error:', error);
        ws.close(1011, 'Internal server error');
      }
    });
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      // Simple base64 decode for JWT payload
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || payload.sub || null;
    } catch {
      return null;
    }
  }

  private handleMessage(client: AuthenticatedWebSocket, message: any) {
    logger.info(`Message from ${client.userId}:`, message);
    
    // Handle different message types
    switch (message.event) {
      case 'ping':
        this.sendToUser(client.userId, 'pong', { timestamp: Date.now() });
        break;
      default:
        logger.warn(`Unknown message event: ${message.event}`);
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = ws as AuthenticatedWebSocket;
        if (!client.isAlive) {
          logger.info(`Terminating inactive WebSocket: User ${client.userId}`);
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any) {
    const userClients = this.clients.get(userId);
    if (userClients && userClients.size > 0) {
      const message = JSON.stringify({ event, data, timestamp: Date.now() });
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
          } catch (error) {
            logger.error(`Failed to send to user ${userId}:`, error);
          }
        }
      });
      logger.info(`Sent ${event} to user ${userId} (${userClients.size} connections)`);
    } else {
      logger.warn(`No active connections for user ${userId}`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data, timestamp: Date.now() });
    let sentCount = 0;
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
          sentCount++;
        } catch (error) {
          logger.error('Failed to broadcast message:', error);
        }
      }
    });
    
    logger.info(`Broadcast ${event} to ${sentCount} clients`);
  }

  /**
   * Send to multiple users
   */
  public sendToUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((userId) => this.sendToUser(userId, event, data));
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return userClients !== undefined && userClients.size > 0;
  }

  /**
   * Gracefully close all connections
   */
  public close() {
    logger.info('Closing WebSocket server...');
    this.wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
    this.wss.close();
    this.clients.clear();
  }
}
