/**
 * Authentication Middleware - JWT Token Verification
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../../lib/database/services/jwt.service';
import { errorResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json(errorResponse('No authorization token provided', 'NO_TOKEN'));
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json(errorResponse('Invalid authorization format', 'INVALID_FORMAT'));
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json(errorResponse('Token is empty', 'EMPTY_TOKEN'));
      return;
    }

    const jwtService = new JWTService();
    const payload = jwtService.verifyToken(token);

    if (!payload) {
      res.status(401).json(errorResponse('Invalid or expired token', 'INVALID_TOKEN'));
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json(errorResponse('Authentication failed', 'AUTH_ERROR'));
  }
};
