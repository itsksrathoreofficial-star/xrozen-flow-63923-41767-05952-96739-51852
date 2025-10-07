/**
 * Editors Controller - Handle editor management
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class EditorsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get all editors
   */
  getEditors = async (req: Request, res: Response) => {
    try {
      const editors = this.db.prepare(`
        SELECT * FROM editors ORDER BY created_at DESC
      `).all();

      return res.json(successResponse(editors));
    } catch (error: any) {
      console.error('Get editors error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get single editor
   */
  getEditor = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const editor = this.db.prepare(`
        SELECT * FROM editors WHERE id = ?
      `).get(id);

      if (!editor) {
        return res.status(404).json(errorResponse('Editor not found'));
      }

      return res.json(successResponse(editor));
    } catch (error: any) {
      console.error('Get editor error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new editor
   */
  createEditor = async (req: Request, res: Response) => {
    try {
      const editorData = req.body;

      const requiredFields = ['full_name', 'email'];
      for (const field of requiredFields) {
        if (!editorData[field]) {
          return res.status(400).json(errorResponse(`Missing required field: ${field}`));
        }
      }

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO editors (
          id, user_id, full_name, email, specialty, employment_type,
          hourly_rate, monthly_salary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id,
        editorData.user_id || null,
        editorData.full_name,
        editorData.email,
        editorData.specialty || null,
        editorData.employment_type || 'freelance',
        editorData.hourly_rate || null,
        editorData.monthly_salary || null
      );

      const newEditor = this.db.prepare('SELECT * FROM editors WHERE id = ?').get(id);

      return res.status(201).json(successResponse(newEditor));
    } catch (error: any) {
      console.error('Create editor error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update editor
   */
  updateEditor = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = this.db.prepare('SELECT * FROM editors WHERE id = ?').get(id);

      if (!existing) {
        return res.status(404).json(errorResponse('Editor not found'));
      }

      const allowedFields = [
        'user_id', 'full_name', 'email', 'specialty', 'employment_type',
        'hourly_rate', 'monthly_salary'
      ];

      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE editors 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedEditor = this.db.prepare('SELECT * FROM editors WHERE id = ?').get(id);

      return res.json(successResponse(updatedEditor));
    } catch (error: any) {
      console.error('Update editor error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
