/**
 * Authentication Service
 * Complete auth system with registration, login, and session management
 */

import Database from 'better-sqlite3';
import { PasswordService } from './password.service';
import { JWTService, TokenPair } from './jwt.service';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  user_category: 'editor' | 'client' | 'agency';
  created_at: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  user_category?: 'editor' | 'client' | 'agency';
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: User; tokens: TokenPair }> {
    try {
      // Validate password strength
      const passwordValidation = PasswordService.validateStrength(data.password);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = this.db.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).get(data.email);

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await PasswordService.hash(data.password);

      // Create user
      const userId = uuidv4();
      const now = new Date().toISOString();

      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, user_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        data.email.toLowerCase(),
        passwordHash,
        data.full_name || null,
        data.user_category || 'editor',
        now,
        now
      );

      // Create profile
      this.db.prepare(`
        INSERT INTO profiles (id, email, full_name, user_category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        data.email.toLowerCase(),
        data.full_name || null,
        data.user_category || 'editor',
        now,
        now
      );

      // Create user role
      this.db.prepare(`
        INSERT INTO user_roles (id, user_id, role, created_at)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), userId, data.user_category || 'editor', now);

      // Get user
      const user = this.getUserById(userId);
      if (!user) {
        throw new Error('Failed to create user');
      }

      // Generate tokens
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.user_category,
      });

      console.log(`✅ User registered: ${user.email}`);

      return { user, tokens };
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData): Promise<{ user: User; tokens: TokenPair }> {
    try {
      // Find user
      const userRecord = this.db.prepare(`
        SELECT id, email, password_hash, full_name, user_category, created_at
        FROM users
        WHERE email = ?
      `).get(data.email.toLowerCase()) as any;

      if (!userRecord) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValid = await PasswordService.verify(data.password, userRecord.password_hash);
      if (!isValid) {
        throw new Error('Invalid email or password');
      }

      const user: User = {
        id: userRecord.id,
        email: userRecord.email,
        full_name: userRecord.full_name,
        user_category: userRecord.user_category,
        created_at: userRecord.created_at,
      };

      // Generate tokens
      const tokens = JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.user_category,
      });

      console.log(`✅ User logged in: ${user.email}`);

      return { user, tokens };
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = this.getUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token pair
      return JWTService.generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.user_category,
      });
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Verify access token and get user
   */
  async verifyToken(accessToken: string): Promise<User | null> {
    try {
      const payload = JWTService.verifyAccessToken(accessToken);
      if (!payload) {
        return null;
      }

      return this.getUserById(payload.userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user
      const userRecord = this.db.prepare(`
        SELECT password_hash FROM users WHERE id = ?
      `).get(userId) as any;

      if (!userRecord) {
        throw new Error('User not found');
      }

      // Verify old password
      const isValid = await PasswordService.verify(oldPassword, userRecord.password_hash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      const validation = PasswordService.validateStrength(newPassword);
      if (!validation.valid) {
        throw new Error(`New password validation failed: ${validation.errors.join(', ')}`);
      }

      // Hash new password
      const newHash = await PasswordService.hash(newPassword);

      // Update password
      this.db.prepare(`
        UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
      `).run(newHash, new Date().toISOString(), userId);

      console.log(`✅ Password changed for user: ${userId}`);
    } catch (error: any) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    try {
      const user = this.db.prepare(`
        SELECT id FROM users WHERE email = ?
      `).get(email.toLowerCase()) as any;

      if (!user) {
        // Don't reveal if email exists
        return 'reset-token-placeholder';
      }

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      this.db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), user.id, resetToken, expiresAt.toISOString(), new Date().toISOString());

      console.log(`✅ Password reset requested for: ${email}`);

      return resetToken;
    } catch (error: any) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Find valid token
      const tokenRecord = this.db.prepare(`
        SELECT user_id FROM password_reset_tokens
        WHERE token = ? AND expires_at > datetime('now') AND used_at IS NULL
      `).get(token) as any;

      if (!tokenRecord) {
        throw new Error('Invalid or expired reset token');
      }

      // Validate new password
      const validation = PasswordService.validateStrength(newPassword);
      if (!validation.valid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Hash new password
      const newHash = await PasswordService.hash(newPassword);

      // Update password
      this.db.prepare(`
        UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
      `).run(newHash, new Date().toISOString(), tokenRecord.user_id);

      // Mark token as used
      this.db.prepare(`
        UPDATE password_reset_tokens SET used_at = ? WHERE token = ?
      `).run(new Date().toISOString(), token);

      console.log(`✅ Password reset completed`);
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  private getUserById(userId: string): User | null {
    const user = this.db.prepare(`
      SELECT id, email, full_name, user_category, created_at
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    return user || null;
  }
}
