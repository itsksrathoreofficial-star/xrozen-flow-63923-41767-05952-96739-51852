/**
 * Profile Controller - Handle user profile operations
 */

import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from '@/config/database.config';
import { successResponse, errorResponse } from '../utils/response.util';

export class ProfileController {
  private db: Database.Database;

  constructor() {
    try {
      console.log('Initializing ProfileController...');
      const config = getDatabaseConfig();
      console.log('Database config:', config);
      this.db = new Database(config.filename);
      console.log('Database connection established:', this.db.name);
    } catch (error) {
      console.error('Error initializing ProfileController:', error);
      throw error;
    }
  }

  /**
   * Get current user's profile
   */
  getMyProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      console.log('Getting profile for user ID:', userId);
      console.log('Database file:', this.db.name);

      let profile = this.db.prepare(`
        SELECT * FROM profiles WHERE id = ?
      `).get(userId);

      console.log('Profile found:', !!profile);

      // If profile doesn't exist, create it
      if (!profile) {
        console.log('Profile not found, creating new profile...');
        const user = this.db.prepare(`
          SELECT * FROM users WHERE id = ?
        `).get(userId);

        console.log('User found:', !!user);
        if (user) {
          console.log('User data:', user);
        }

        if (!user) {
          console.log('User not found in database');
          return res.status(404).json(errorResponse('User not found'));
        }

        // Create profile for existing user
        console.log('Creating profile...');
        try {
          this.db.prepare(`
            INSERT INTO profiles (id, email, full_name, user_category, subscription_tier, subscription_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            userId,
            user.email,
            user.full_name || '',
            user.user_category || 'editor',
            'basic',
            1,
            user.created_at,
            user.updated_at
          );
          console.log('Profile created successfully');
        } catch (insertError) {
          console.error('Error creating profile:', insertError);
          return res.status(500).json(errorResponse('Failed to create profile'));
        }

        // Get the newly created profile
        profile = this.db.prepare(`
          SELECT * FROM profiles WHERE id = ?
        `).get(userId);
      }

      if (!profile) {
        console.log('Profile still not found after creation attempt');
        return res.status(404).json(errorResponse('Profile not found'));
      }

      console.log('Returning profile:', profile);
      return res.json(successResponse(profile));
    } catch (error: any) {
      console.error('Get profile error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Simple test endpoint
   */
  test = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      return res.json({
        success: true,
        data: {
          message: 'Profiles controller is working',
          userId: userId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Test error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Debug endpoint to test database connection
   */
  debugDatabase = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      console.log('Debug: Getting profile for user ID:', userId);
      console.log('Debug: Database file:', this.db.name);
      
      // Test user query
      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      console.log('Debug: User found:', !!user);
      
      // Test profile query
      const profile = this.db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
      console.log('Debug: Profile found:', !!profile);
      
      // Test all profiles
      const allProfiles = this.db.prepare('SELECT * FROM profiles').all();
      console.log('Debug: Total profiles:', allProfiles.length);
      
      return res.json({
        success: true,
        data: {
          userId,
          userFound: !!user,
          profileFound: !!profile,
          totalProfiles: allProfiles.length,
          user: user,
          profile: profile
        }
      });
    } catch (error: any) {
      console.error('Debug error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Get profile by user ID
   */
  getProfile = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const profile = this.db.prepare(`
        SELECT * FROM profiles WHERE id = ?
      `).get(userId);

      if (!profile) {
        return res.status(404).json(errorResponse('Profile not found'));
      }

      return res.json(successResponse(profile));
    } catch (error: any) {
      console.error('Get profile error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Update profile
   */
  updateProfile = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = (req as any).user.userId;
      const updates = req.body;

      // Check authorization
      if (id !== currentUserId) {
        return res.status(403).json(errorResponse('Unauthorized to update this profile'));
      }

      // Build update query dynamically
      const allowedFields = ['full_name', 'avatar_url', 'user_category', 'subscription_tier', 'subscription_active'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

      if (updateFields.length === 0) {
        return res.status(400).json(errorResponse('No valid fields to update'));
      }

      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => updates[field]);

      this.db.prepare(`
        UPDATE profiles 
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...values, id);

      const updatedProfile = this.db.prepare(`
        SELECT * FROM profiles WHERE id = ?
      `).get(id);

      return res.json(successResponse(updatedProfile));
    } catch (error: any) {
      console.error('Update profile error:', error);
      return res.status(500).json(errorResponse(error.message));
    }
  };
}
