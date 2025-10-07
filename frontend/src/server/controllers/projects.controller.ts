/**
 * Projects Controller - Handle project CRUD operations
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class ProjectsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get all projects (with optional filters)
   */
  getProjects = async (req: Request, res: Response) => {
    try {
      const { editor_id, client_id, status } = req.query;
      const userId = (req as any).user.userId;

      let query = `
        SELECT p.*, 
               e.full_name as editor_name,
               c.full_name as client_name
        FROM projects p
        LEFT JOIN editors e ON p.editor_id = e.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.creator_id = ?
      `;
      const params: any[] = [userId];

      if (editor_id) {
        query += ' AND p.editor_id = ?';
        params.push(editor_id);
      }

      if (client_id) {
        query += ' AND p.client_id = ?';
        params.push(client_id);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC';

      const projects = this.db.prepare(query).all(...params);

      return res.json(successResponse(projects));
    } catch (error: any) {
      console.error('Get projects error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get single project by ID
   */
  getProject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const project = this.db.prepare(`
        SELECT p.*, 
               e.full_name as editor_name, e.email as editor_email,
               c.full_name as client_name, c.email as client_email
        FROM projects p
        LEFT JOIN editors e ON p.editor_id = e.id
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.id = ? AND p.creator_id = ?
      `).get(id, userId);

      if (!project) {
        return res.status(404).json(errorResponse('Project not found'));
      }

      return res.json(successResponse(project));
    } catch (error: any) {
      console.error('Get project error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new project
   */
  createProject = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const projectData = {
        ...req.body,
        creator_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const requiredFields = ['name'];
      for (const field of requiredFields) {
        if (!projectData[field]) {
          return res.status(400).json(errorResponse(`Missing required field: ${field}`));
        }
      }

      const id = crypto.randomUUID();
      
      this.db.prepare(`
        INSERT INTO projects (
          id, name, description, project_type, editor_id, client_id,
          creator_id, raw_footage_link, assigned_date, deadline, fee,
          status, parent_project_id, is_subproject, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        projectData.name,
        projectData.description || null,
        projectData.project_type || null,
        projectData.editor_id || null,
        projectData.client_id || null,
        projectData.creator_id,
        projectData.raw_footage_link || null,
        projectData.assigned_date || null,
        projectData.deadline || null,
        projectData.fee || null,
        projectData.status || 'draft',
        projectData.parent_project_id || null,
        projectData.is_subproject || false,
        projectData.created_at,
        projectData.updated_at
      );

      const newProject = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

      return res.status(201).json(successResponse(newProject));
    } catch (error: any) {
      console.error('Create project error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update project
   */
  updateProject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const updates = req.body;

      // Check project exists and user owns it
      const existing = this.db.prepare(`
        SELECT * FROM projects WHERE id = ? AND creator_id = ?
      `).get(id, userId);

      if (!existing) {
        return res.status(404).json(errorResponse('Project not found or unauthorized'));
      }

      const allowedFields = [
        'name', 'description', 'project_type', 'editor_id', 'client_id',
        'raw_footage_link', 'assigned_date', 'deadline', 'fee', 'status',
        'parent_project_id', 'is_subproject'
      ];

      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE projects 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedProject = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

      return res.json(successResponse(updatedProject));
    } catch (error: any) {
      console.error('Update project error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Delete project
   */
  deleteProject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const existing = this.db.prepare(`
        SELECT * FROM projects WHERE id = ? AND creator_id = ?
      `).get(id, userId);

      if (!existing) {
        return res.status(404).json(errorResponse('Project not found or unauthorized'));
      }

      this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);

      return res.json(successResponse({ message: 'Project deleted successfully' }));
    } catch (error: any) {
      console.error('Delete project error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
