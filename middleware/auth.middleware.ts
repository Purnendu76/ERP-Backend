import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { redisClient } from '../config/redis.js';

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

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Invalid token format' });
    return;
  }

  // Check Redis blacklist
  try {
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(401).json({ error: 'Token is no longer valid' });
      return;
    }
  } catch (redisError) {
    console.error("Redis blacklist check error:", redisError);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return;
  }

  req.user = payload as { id: string; email: string; role: string };
  next();
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

export const loginRateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || "unknown-ip";
  const key = `rate-limit:login:${ip}`;

  try {
    const attempts = await redisClient.incr(key);
    if (attempts === 1) {
      // First attempt in this window, set TTL of 15 minutes (900 seconds)
      await redisClient.expire(key, 900);
    }

    if (attempts > 5) {
      res.status(429).json({ error: 'Too many login attempts. Please try again after 15 minutes.' });
      return;
    }
  } catch (redisError) {
    // Fail-open: If Redis is down, log the error but allow login to function
    console.error("Redis rate limiter error:", redisError);
  }

  next();
};
