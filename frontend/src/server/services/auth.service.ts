/**
 * Authentication Service
 */

import { ConnectionManager } from '../../lib/database/core/connection.manager';
import { PasswordService } from '../../lib/database/services/password.service';
import { JWTService } from '../../lib/database/services/jwt.service';
import { logger } from '../utils/logger.util';
import { randomUUID } from 'crypto';

export class AuthService {
  private connectionManager: ConnectionManager;
  private passwordService: PasswordService;
  private jwtService: JWTService;

  constructor() {
    this.connectionManager = ConnectionManager.getInstance();
    this.passwordService = new PasswordService();
    this.jwtService = new JWTService();
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<{ user: any; token: string } | { error: string; code: string }> {
    try {
      const db = this.connectionManager.getConnection();
      
      // Find user by email
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      if (!user) {
        logger.warn(`Login attempt with non-existent email: ${email}`);
        return { error: 'User not found. Please check your email address.', code: 'USER_NOT_FOUND' };
      }

      // Verify password
      const isValidPassword = await this.passwordService.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        logger.warn(`Invalid password attempt for email: ${email}`);
        return { error: 'Incorrect password. Please try again.', code: 'INVALID_PASSWORD' };
      }

      // Generate JWT token
      const token = this.jwtService.generateToken({
        userId: user.id,
        email: user.email,
        role: user.user_category
      });

      // Remove password hash from user object
      const { password_hash, ...userWithoutPassword } = user;

      logger.info(`User logged in successfully: ${email}`);

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      logger.error('Login error:', error);
      return { error: 'Login failed due to server error. Please try again.', code: 'LOGIN_ERROR' };
    }
  }

  /**
   * Register new user
   */
  async signup(email: string, password: string, metadata: any = {}): Promise<{ user: any; token: string } | { error: string; code: string }> {
    try {
      const db = this.connectionManager.getConnection();
      
      // Check if user already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      
      if (existingUser) {
        logger.warn(`Signup attempt with existing email: ${email}`);
        return { error: 'An account with this email already exists. Please login instead.', code: 'USER_EXISTS' };
      }

      // Validate password strength
      if (password.length < 8) {
        return { error: 'Password must be at least 8 characters long.', code: 'WEAK_PASSWORD' };
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(password);

      // Create user
      const userId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, user_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        email,
        passwordHash,
        metadata.full_name || '',
        metadata.user_category || 'editor',
        now,
        now
      );

      // Create profile
      db.prepare(`
        INSERT INTO profiles (id, email, full_name, user_category, subscription_tier, subscription_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        email,
        metadata.full_name || '',
        metadata.user_category || 'editor',
        'basic', // Changed from 'free' to 'basic'
        1,
        now,
        now
      );

      // Create user role
      db.prepare(`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        randomUUID(),
        userId,
        metadata.user_category || 'editor',
        now
      );

      // Generate JWT token
      const token = this.jwtService.generateToken({
        userId: userId,
        email: email,
        role: metadata.user_category || 'editor'
      });

      const newUser = {
        id: userId,
        email: email,
        full_name: metadata.full_name || '',
        user_category: metadata.user_category || 'editor',
        created_at: now,
        updated_at: now
      };

      logger.info(`User registered successfully: ${email}`);

      return {
        user: newUser,
        token
      };
    } catch (error) {
      logger.error('Signup error:', error);
      return { error: 'Registration failed due to server error. Please try again.', code: 'SIGNUP_ERROR' };
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verifyToken(token);
    } catch (error) {
      logger.error('Token verification error:', error);
      return null;
    }
  }
}
