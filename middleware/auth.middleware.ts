import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { redisClient } from '../config/redis.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Extend Express request interface to attach user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Access token required', 'TOKEN_REQUIRED');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw AppError.unauthorized('Invalid token format', 'INVALID_TOKEN_FORMAT');
  }

  // Check Redis blacklist
  try {
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw AppError.unauthorized('Token is no longer valid', 'TOKEN_BLACKLISTED');
    }
  } catch (redisError) {
    console.error("Redis blacklist check error:", redisError);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    throw AppError.unauthorized('Invalid or expired access token', 'TOKEN_INVALID_OR_EXPIRED');
  }

  req.user = payload as { id: string; email: string; role: string };
  next();
});

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden('Access forbidden: Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

export const loginRateLimiter = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const key = `rate-limit:login:${ip}`;

  try {
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      // First attempt in this window, set TTL of 15 minutes (900 seconds)
      await redisClient.expire(key, 900);
    }

    if (attempts > 5) {
      throw AppError.tooManyRequests('Too many login attempts. Please try again after 15 minutes.', 'RATE_LIMIT_EXCEEDED');
    }
  } catch (redisError) {
    if (redisError instanceof AppError) throw redisError;
    // Fail-open: If Redis is down, log the error but allow login to function
    console.error("Redis rate limiter error:", redisError);
  }

  next();
});

