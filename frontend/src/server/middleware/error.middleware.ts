/**
 * Global Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorMiddleware = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error occurred:', error);

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'INTERNAL_ERROR';

  // SQLite-specific error mapping
  if (error.message?.includes('SQLITE_CONSTRAINT')) {
    res.status(400).json(errorResponse('Database constraint violation', 'CONSTRAINT_ERROR'));
    return;
  }

  if (error.message?.includes('SQLITE_BUSY')) {
    res.status(503).json(errorResponse('Database is busy, please try again', 'DB_BUSY'));
    return;
  }

  if (error.message?.includes('SQLITE_LOCKED')) {
    res.status(503).json(errorResponse('Database is locked', 'DB_LOCKED'));
    return;
  }

  // Send error response
  res.status(statusCode).json(
    errorResponse(
      process.env.NODE_ENV === 'production' ? message : error.stack || message,
      code
    )
  );
};

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found`, 'NOT_FOUND'));
};
