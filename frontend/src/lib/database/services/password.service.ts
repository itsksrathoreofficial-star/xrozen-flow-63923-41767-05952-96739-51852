/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 */

import bcrypt from 'bcryptjs';

export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
