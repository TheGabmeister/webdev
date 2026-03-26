import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
]);

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
