/**
 * Clients Controller - Handle client management
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class ClientsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get all clients
   */
  getClients = async (req: Request, res: Response) => {
    try {
      const clients = this.db.prepare(`
        SELECT * FROM clients ORDER BY created_at DESC
      `).all();

      return res.json(successResponse(clients));
    } catch (error: any) {
      console.error('Get clients error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get single client
   */
  getClient = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const client = this.db.prepare(`
        SELECT * FROM clients WHERE id = ?
      `).get(id);

      if (!client) {
        return res.status(404).json(errorResponse('Client not found'));
      }

      return res.json(successResponse(client));
    } catch (error: any) {
      console.error('Get client error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new client
   */
  createClient = async (req: Request, res: Response) => {
    try {
      const clientData = req.body;

      const requiredFields = ['full_name', 'email'];
      for (const field of requiredFields) {
        if (!clientData[field]) {
          return res.status(400).json(errorResponse(`Missing required field: ${field}`));
        }
      }

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO clients (
          id, user_id, full_name, email, company, employment_type,
          project_rate, monthly_rate, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id,
        clientData.user_id || null,
        clientData.full_name,
        clientData.email,
        clientData.company || null,
        clientData.employment_type || 'freelance',
        clientData.project_rate || null,
        clientData.monthly_rate || null
      );

      const newClient = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

      return res.status(201).json(successResponse(newClient));
    } catch (error: any) {
      console.error('Create client error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update client
   */
  updateClient = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

      if (!existing) {
        return res.status(404).json(errorResponse('Client not found'));
      }

      const allowedFields = [
        'user_id', 'full_name', 'email', 'company', 'employment_type',
        'project_rate', 'monthly_rate'
      ];

      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE clients 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedClient = this.db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

      return res.json(successResponse(updatedClient));
    } catch (error: any) {
      console.error('Update client error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
