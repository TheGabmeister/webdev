import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { generateCsrfToken } from '../middleware/csrf.js';

export function setAuthCookies(res: Response, userId: string, email: string): void {
  const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '1h' });
  const csrfToken = generateCsrfToken();

  const cookieOptions: {
    httpOnly: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
    secure?: boolean;
  } = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000, // 1 hour
  };

  if (env.isProduction) {
    cookieOptions.secure = true;
  }

  res.cookie('drive_session', token, cookieOptions);

  // CSRF cookie must be readable by JS (not httpOnly)
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000,
    ...(env.isProduction ? { secure: true } : {}),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('drive_session', { path: '/' });
  res.clearCookie('csrf_token', { path: '/' });
}
