/**
 * Notifications Controller - Handle notification operations
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class NotificationsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get user notifications
   * Note: Notifications table doesn't exist yet in schema
   * This is a placeholder for future implementation
   */
  getNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      // Check if notifications table exists
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='notifications'
      `).get();

      if (!tableExists) {
        // Return empty array if table doesn't exist yet
        return res.json(successResponse([]));
      }

      const notifications = this.db.prepare(`
        SELECT * FROM notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId);

      return res.json(successResponse(notifications));
    } catch (error: any) {
      console.error('Get notifications error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Mark notification as read
   */
  markAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='notifications'
      `).get();

      if (!tableExists) {
        return res.status(404).json(errorResponse('Notifications table not found'));
      }

      const notification = this.db.prepare(`
        SELECT * FROM notifications WHERE id = ? AND user_id = ?
      `).get(id, userId);

      if (!notification) {
        return res.status(404).json(errorResponse('Notification not found'));
      }

      this.db.prepare(`
        UPDATE notifications SET is_read = true WHERE id = ?
      `).run(id);

      const updated = this.db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

      return res.json(successResponse(updated));
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Mark all notifications as read
   */
  markAllAsRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='notifications'
      `).get();

      if (!tableExists) {
        return res.status(404).json(errorResponse('Notifications table not found'));
      }

      this.db.prepare(`
        UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false
      `).run(userId);

      return res.json(successResponse({ message: 'All notifications marked as read' }));
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
