/**
 * Admin Authorization Middleware
 * Checks if user has admin privileges
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { errorResponse } from '../utils/response.util';

export const adminMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json(errorResponse('User not authenticated', 'NOT_AUTHENTICATED'));
    return;
  }

  const userRole = req.user.role?.toLowerCase();

  if (userRole !== 'admin' && userRole !== 'agency') {
    res.status(403).json(
      errorResponse('Access denied. Admin privileges required.', 'FORBIDDEN')
    );
    return;
  }

  next();
};
