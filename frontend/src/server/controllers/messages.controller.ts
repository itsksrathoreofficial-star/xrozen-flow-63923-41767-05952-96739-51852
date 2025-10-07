/**
 * Messages Controller - Handle messaging operations
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class MessagesController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get messages (optionally filtered by project)
   */
  getMessages = async (req: Request, res: Response) => {
    try {
      const { project_id } = req.query;
      const userId = (req as any).user.userId;

      let query = `
        SELECT m.*,
               sender.full_name as sender_name,
               recipient.full_name as recipient_name
        FROM messages m
        LEFT JOIN profiles sender ON m.sender_id = sender.id
        LEFT JOIN profiles recipient ON m.recipient_id = recipient.id
        WHERE (m.sender_id = ? OR m.recipient_id = ?)
      `;
      const params: any[] = [userId, userId];

      if (project_id) {
        query += ' AND m.project_id = ?';
        params.push(project_id);
      }

      query += ' ORDER BY m.created_at DESC';

      const messages = this.db.prepare(query).all(...params);

      return res.json(successResponse(messages));
    } catch (error: any) {
      console.error('Get messages error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new message
   */
  createMessage = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const messageData = {
        ...req.body,
        sender_id: userId,
        created_at: new Date().toISOString()
      };

      const requiredFields = ['content'];
      for (const field of requiredFields) {
        if (!messageData[field]) {
          return res.status(400).json(errorResponse(`Missing required field: ${field}`));
        }
      }

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO messages (
          id, project_id, sender_id, recipient_id, content, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        messageData.project_id || null,
        messageData.sender_id,
        messageData.recipient_id || null,
        messageData.content,
        false,
        messageData.created_at
      );

      const newMessage = this.db.prepare(`
        SELECT m.*,
               sender.full_name as sender_name,
               recipient.full_name as recipient_name
        FROM messages m
        LEFT JOIN profiles sender ON m.sender_id = sender.id
        LEFT JOIN profiles recipient ON m.recipient_id = recipient.id
        WHERE m.id = ?
      `).get(id);

      // TODO: Emit WebSocket event for real-time delivery
      // wsServer.broadcast('message:new', newMessage);

      return res.status(201).json(successResponse(newMessage));
    } catch (error: any) {
      console.error('Create message error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Mark message as read
   */
  markAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const message = this.db.prepare(`
        SELECT * FROM messages WHERE id = ? AND recipient_id = ?
      `).get(id, userId);

      if (!message) {
        return res.status(404).json(errorResponse('Message not found or unauthorized'));
      }

      this.db.prepare(`
        UPDATE messages SET is_read = true WHERE id = ?
      `).run(id);

      const updatedMessage = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

      return res.json(successResponse(updatedMessage));
    } catch (error: any) {
      console.error('Mark message as read error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
