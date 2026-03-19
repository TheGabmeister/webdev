import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticate } from '../middleware/authenticate';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';
import { createUser, findUserByEmail, findUserById, markEmailVerified, updatePassword, deleteUser } from '../db/queries/users';
import {
  createVerificationToken, findVerificationToken, deleteVerificationTokensForUser,
  createResetToken, findResetToken, deleteResetTokensForUser,
} from '../db/queries/tokens';
import { sendVerificationEmail, sendPasswordResetEmail } from '../email/resend';
import { AuthRequest } from '../types';

const router = Router();
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVerificationPage(title: string, message: string, ctaLabel: string) {
  const frontendUrl = escapeHtml(getFrontendUrl());
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeCtaLabel = escapeHtml(ctaLabel);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, #f3fbf6 0%, #eef5ff 45%, #f7f7f9 100%);
        color: #102316;
      }

      .card {
        width: min(100%, 480px);
        padding: 40px 32px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 18px 45px rgba(16, 35, 22, 0.12);
        text-align: center;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2rem, 5vw, 2.6rem);
        line-height: 1.1;
      }

      p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        color: #3e5345;
      }

      a {
        display: inline-block;
        margin-top: 28px;
        padding: 12px 20px;
        border-radius: 999px;
        background: #154f31;
        color: #ffffff;
        text-decoration: none;
        font-weight: 600;
      }

      a:hover {
        background: #0f3d25;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${safeTitle}</h1>
      <p>${safeMessage}</p>
      <a href="${frontendUrl}">${safeCtaLabel}</a>
    </main>
  </body>
</html>`;
}

function setCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: SEVEN_DAYS,
  });
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(email, passwordHash);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await createVerificationToken(user.id, token, expiresAt);
    await sendVerificationEmail(email, token);

    res.status(201).json({ message: 'Account created. Please check your email to verify.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.email_verified) {
      res.status(403).json({ error: 'Email not verified. Please check your email.', needsVerification: true });
      return;
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    setCookie(res, token);

    res.json({ user: { id: user.id, email: user.email, email_verified: user.email_verified } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.cookie('token', '', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 0 });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res
        .status(400)
        .type('html')
        .send(renderVerificationPage(
          'Invalid verification link',
          'This verification link is invalid. Request a new verification email from the app and try again.',
          'Back to app'
        ));
      return;
    }

    const record = await findVerificationToken(token);
    if (!record) {
      res
        .status(400)
        .type('html')
        .send(renderVerificationPage(
          'Invalid verification link',
          'This verification link is invalid or has already been used. Request a new verification email from the app and try again.',
          'Back to app'
        ));
      return;
    }

    if (new Date(record.expires_at) < new Date()) {
      res
        .status(400)
        .type('html')
        .send(renderVerificationPage(
          'Verification link expired',
          'This verification link has expired. Request a new verification email from the app and try again.',
          'Back to app'
        ));
      return;
    }

    await markEmailVerified(record.user_id);
    await deleteVerificationTokensForUser(record.user_id);

    res
      .status(200)
      .type('html')
      .send(renderVerificationPage(
        'Email verified',
        'Your email has been verified. You can now sign in.',
        'Back to app'
      ));
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user || user.email_verified) {
      // Don't reveal whether user exists
      res.json({ message: 'If the email is registered and unverified, a verification link has been sent.' });
      return;
    }

    await deleteVerificationTokensForUser(user.id);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await createVerificationToken(user.id, token, expiresAt);
    await sendVerificationEmail(email, token);

    res.json({ message: 'If the email is registered and unverified, a verification link has been sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await findUserByEmail(email);
    if (user) {
      await deleteResetTokensForUser(user.id);
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await createResetToken(user.id, token, expiresAt);
      await sendPasswordResetEmail(email, token);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If the email is registered, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const record = await findResetToken(token);
    if (!record) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    if (new Date(record.expires_at) < new Date()) {
      res.status(400).json({ error: 'Token has expired. Please request a new password reset.' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    await updatePassword(record.user_id, hash);
    await deleteResetTokensForUser(record.user_id);

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new passwords are required' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    const user = await findUserByEmail((await findUserById(req.userId!))!.email);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await updatePassword(req.userId!, hash);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, email_verified: user.email_verified } });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/auth/account
router.delete('/account', authenticate as any, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required to delete account' });
      return;
    }

    const user = await findUserByEmail((await findUserById(req.userId!))!.email);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Password is incorrect' });
      return;
    }

    await deleteUser(req.userId!);
    res.cookie('token', '', { httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax', maxAge: 0 });
    res.json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
