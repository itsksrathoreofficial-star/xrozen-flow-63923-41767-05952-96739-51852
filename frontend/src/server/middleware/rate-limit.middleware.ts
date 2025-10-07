/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { 
    success: false, 
    error: { 
      message: 'Too many requests, please try again later', 
      code: 'RATE_LIMIT_EXCEEDED' 
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const queryExecutionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 query executions per minute
  message: { 
    success: false, 
    error: { 
      message: 'Query execution rate limit exceeded', 
      code: 'QUERY_RATE_LIMIT' 
    } 
  },
});

export const backupCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 backups per hour
  message: { 
    success: false, 
    error: { 
      message: 'Backup creation rate limit exceeded', 
      code: 'BACKUP_RATE_LIMIT' 
    } 
  },
});
