/**
 * Payments Controller - Handle payment operations
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class PaymentsController {
  private db: Database.Database;

  constructor() {
    const config = getDatabaseConfig();
    this.db = new Database(config.filename);
  }

  /**
   * Get payments (with optional filters)
   */
  getPayments = async (req: Request, res: Response) => {
    try {
      const { payer_id, recipient_id, status } = req.query;
      const userId = (req as any).user.userId;

      let query = `
        SELECT p.*,
               payer.full_name as payer_name,
               recipient.full_name as recipient_name,
               proj.name as project_name
        FROM payments p
        LEFT JOIN profiles payer ON p.payer_id = payer.id
        LEFT JOIN profiles recipient ON p.recipient_id = recipient.id
        LEFT JOIN projects proj ON p.project_id = proj.id
        WHERE (p.payer_id = ? OR p.recipient_id = ?)
      `;
      const params: any[] = [userId, userId];

      if (payer_id) {
        query += ' AND p.payer_id = ?';
        params.push(payer_id);
      }

      if (recipient_id) {
        query += ' AND p.recipient_id = ?';
        params.push(recipient_id);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      query += ' ORDER BY p.created_at DESC';

      const payments = this.db.prepare(query).all(...params);

      return res.json(successResponse(payments));
    } catch (error: any) {
      console.error('Get payments error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get single payment
   */
  getPayment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const payment = this.db.prepare(`
        SELECT p.*,
               payer.full_name as payer_name,
               recipient.full_name as recipient_name
        FROM payments p
        LEFT JOIN profiles payer ON p.payer_id = payer.id
        LEFT JOIN profiles recipient ON p.recipient_id = recipient.id
        WHERE p.id = ? AND (p.payer_id = ? OR p.recipient_id = ?)
      `).get(id, userId, userId);

      if (!payment) {
        return res.status(404).json(errorResponse('Payment not found or unauthorized'));
      }

      return res.json(successResponse(payment));
    } catch (error: any) {
      console.error('Get payment error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Create new payment
   */
  createPayment = async (req: Request, res: Response) => {
    try {
      const paymentData = req.body;

      const requiredFields = ['payer_id', 'recipient_id', 'amount', 'payment_type'];
      for (const field of requiredFields) {
        if (!paymentData[field]) {
          return res.status(400).json(errorResponse(`Missing required field: ${field}`));
        }
      }

      const id = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO payments (
          id, project_id, payer_id, recipient_id, amount, payment_type,
          status, invoice_url, due_date, paid_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        id,
        paymentData.project_id || null,
        paymentData.payer_id,
        paymentData.recipient_id,
        paymentData.amount,
        paymentData.payment_type,
        paymentData.status || 'pending',
        paymentData.invoice_url || null,
        paymentData.due_date || null,
        paymentData.paid_date || null
      );

      const newPayment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id);

      return res.status(201).json(successResponse(newPayment));
    } catch (error: any) {
      console.error('Create payment error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update payment
   */
  updatePayment = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const updates = req.body;

      const existing = this.db.prepare(`
        SELECT * FROM payments WHERE id = ? AND (payer_id = ? OR recipient_id = ?)
      `).get(id, userId, userId);

      if (!existing) {
        return res.status(404).json(errorResponse('Payment not found or unauthorized'));
      }

      const allowedFields = [
        'status', 'invoice_url', 'due_date', 'paid_date'
      ];

      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE payments 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedPayment = this.db.prepare('SELECT * FROM payments WHERE id = ?').get(id);

      return res.json(successResponse(updatedPayment));
    } catch (error: any) {
      console.error('Update payment error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
