/**
 * JWT Service
 * Handles JWT token generation and verification
 */

import jwt from 'jsonwebtoken';

export class JWTService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload: any): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode a JWT token without verification
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
