/**
 * User Controller - User Management
 */

import { Request, Response, NextFunction } from 'express';
import { ConnectionManager } from '@/lib/database/core/connection.manager';
import { AuthService } from '@/lib/auth/auth.service';
import { successResponse } from '../utils/response.util';

export class UserController {
  private connectionManager = ConnectionManager.getInstance();
  private authService: AuthService;

  constructor() {
    const db = this.connectionManager.getConnection();
    this.authService = new AuthService(db);
  }

  /**
   * List all users
   */
  listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const db = this.connectionManager.getConnection();

      const users = db.prepare(`
        SELECT id, email, full_name, user_category, subscription_tier, subscription_active, created_at
        FROM profiles
        ORDER BY created_at DESC
      `).all();

      res.json(successResponse(users));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new user
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, fullName, userCategory } = req.body;

      const result = await this.authService.register({
        email,
        password,
        full_name: fullName,
        user_category: userCategory,
      });

      res.json(successResponse({
        message: 'User created successfully',
        userId: result.user.id,
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user
   */
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const db = this.connectionManager.getConnection();

      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(updates), id];

      db.prepare(`
        UPDATE profiles 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values);

      res.json(successResponse({
        message: 'User updated successfully',
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const db = this.connectionManager.getConnection();

      // Delete user (CASCADE will handle related records)
      db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);

      res.json(successResponse({
        message: 'User deleted successfully',
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get user activity
   */
  getUserActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const db = this.connectionManager.getConnection();

      const projects = db.prepare(`
        SELECT id, name, status, created_at
        FROM projects
        WHERE creator_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(id);

      const messages = db.prepare(`
        SELECT id, content, created_at
        FROM messages
        WHERE sender_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(id);

      res.json(successResponse({
        projects,
        messages,
      }));
    } catch (error) {
      next(error);
    }
  };
}
