/**
 * Query Validation Schemas
 */

import { z } from 'zod';

export const executeQuerySchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(10000, 'Query is too long'),
});

export const saveQuerySchema = z.object({
  name: z.string()
    .min(1, 'Query name is required')
    .max(100, 'Query name too long'),
  query: z.string().min(1, 'Query cannot be empty'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const explainQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
});
