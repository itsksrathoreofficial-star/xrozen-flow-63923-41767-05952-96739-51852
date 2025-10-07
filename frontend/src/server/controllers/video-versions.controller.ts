/**
 * Video Versions Controller - Handle video version management
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class VideoVersionsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get video versions for a project
   */
  getVideoVersions = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.userId;

      // Verify user has access to project
      const project = this.db.prepare(`
        SELECT * FROM projects WHERE id = ? AND creator_id = ?
      `).get(projectId, userId);

      if (!project) {
        return res.status(404).json(errorResponse('Project not found or unauthorized'));
      }

      const versions = this.db.prepare(`
        SELECT v.*,
               u.full_name as uploader_name
        FROM video_versions v
        LEFT JOIN profiles u ON v.uploaded_by = u.id
        WHERE v.project_id = ?
        ORDER BY v.version_number DESC
      `).all(projectId);

      return res.json(successResponse(versions));
    } catch (error: any) {
      console.error('Get video versions error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new video version
   */
  createVideoVersion = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user.userId;
      const versionData = req.body;

      // Verify user has access to project
      const project = this.db.prepare(`
        SELECT * FROM projects WHERE id = ? AND creator_id = ?
      `).get(projectId, userId);

      if (!project) {
        return res.status(404).json(errorResponse('Project not found or unauthorized'));
      }

      // Get next version number
      const lastVersion = this.db.prepare(`
        SELECT MAX(version_number) as max_version FROM video_versions WHERE project_id = ?
      `).get(projectId) as { max_version: number | null };

      const versionNumber = (lastVersion.max_version || 0) + 1;

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO video_versions (
          id, project_id, version_number, preview_url, final_url,
          is_approved, correction_notes, uploaded_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id,
        projectId,
        versionNumber,
        versionData.preview_url || null,
        versionData.final_url || null,
        false,
        versionData.correction_notes || null,
        userId
      );

      const newVersion = this.db.prepare('SELECT * FROM video_versions WHERE id = ?').get(id);

      return res.status(201).json(successResponse(newVersion));
    } catch (error: any) {
      console.error('Create video version error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update video version
   */
  updateVideoVersion = async (req: Request, res: Response) => {
    try {
      const { projectId, versionId } = req.params;
      const userId = (req as any).user.userId;
      const updates = req.body;

      // Verify user has access to project
      const project = this.db.prepare(`
        SELECT * FROM projects WHERE id = ? AND creator_id = ?
      `).get(projectId, userId);

      if (!project) {
        return res.status(404).json(errorResponse('Project not found or unauthorized'));
      }

      const existing = this.db.prepare(`
        SELECT * FROM video_versions WHERE id = ? AND project_id = ?
      `).get(versionId, projectId);

      if (!existing) {
        return res.status(404).json(errorResponse('Video version not found'));
      }

      const allowedFields = [
        'preview_url', 'final_url', 'is_approved', 'correction_notes'
      ];

      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE video_versions 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, versionId);

      const updatedVersion = this.db.prepare('SELECT * FROM video_versions WHERE id = ?').get(versionId);

      return res.json(successResponse(updatedVersion));
    } catch (error: any) {
      console.error('Update video version error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
