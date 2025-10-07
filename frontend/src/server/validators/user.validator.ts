/**
 * User Validation Schemas
 */

import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  fullName: z.string().min(1, 'Full name is required').max(100),
  userCategory: z.enum(['editor', 'client', 'agency']),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  userCategory: z.enum(['editor', 'client', 'agency']).optional(),
  subscriptionTier: z.enum(['basic', 'pro', 'premium']).optional(),
  subscriptionActive: z.boolean().optional(),
});
