import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { setAuthCookies, clearAuthCookies } from '../helpers/cookies.js';
import { registerRateLimit, loginRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerRateLimit, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  setAuthCookies(res, user.id, user.email);

  res.status(201).json({
    id: user.id,
    email: user.email,
    storageUsed: user.storageUsed.toString(),
    storageLimit: user.storageLimit.toString(),
  });
});

// POST /api/auth/login
router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  setAuthCookies(res, user.id, user.email);

  res.json({
    id: user.id,
    email: user.email,
    storageUsed: user.storageUsed.toString(),
    storageLimit: user.storageLimit.toString(),
  });
});

// GET /api/auth/session
router.get('/session', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
  });

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    storageUsed: user.storageUsed.toString(),
    storageLimit: user.storageLimit.toString(),
  });
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ message: 'Logged out' });
});

export default router;
