/**
 * Authentication Controller
 */

import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger.util';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required', code: 'MISSING_CREDENTIALS' }
        });
      }

      const result = await this.authService.login(email, password);
      
      // Check if result contains error
      if ('error' in result) {
        const statusCode = result.code === 'USER_NOT_FOUND' ? 404 : 
                          result.code === 'INVALID_PASSWORD' ? 401 : 500;
        return res.status(statusCode).json({
          success: false,
          error: { message: result.error, code: result.code }
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Login failed', code: 'LOGIN_ERROR' }
      });
    }
  }

  /**
   * Register user
   */
  async signup(req: Request, res: Response) {
    try {
      const { email, password, ...metadata } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password are required', code: 'MISSING_CREDENTIALS' }
        });
      }

      const result = await this.authService.signup(email, password, metadata);
      
      // Check if result contains error
      if ('error' in result) {
        const statusCode = result.code === 'USER_EXISTS' ? 409 : 
                          result.code === 'WEAK_PASSWORD' ? 400 : 500;
        return res.status(statusCode).json({
          success: false,
          error: { message: result.error, code: result.code }
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Signup error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Signup failed', code: 'SIGNUP_ERROR' }
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response) {
    try {
      // For JWT tokens, logout is handled client-side by removing the token
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Logout failed', code: 'LOGOUT_ERROR' }
      });
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      const user = req.user; // Set by auth middleware
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'No authorization token provided', code: 'NO_TOKEN' }
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to get user', code: 'USER_ERROR' }
      });
    }
  }
}
