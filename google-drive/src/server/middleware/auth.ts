import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AuthPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const PUBLIC_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/session',
]);

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip non-API routes
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  // Skip public auth endpoints
  if (PUBLIC_PATHS.has(req.path)) {
    // Still try to decode for session endpoint
    const token = req.cookies?.drive_session;
    if (token) {
      try {
        req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      } catch {
        // Ignore invalid tokens on public routes
      }
    }
    next();
    return;
  }

  const token = req.cookies?.drive_session;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
