import { Router, Request, Response } from 'express';
import prisma from '../db.js';

const router = Router();

// GET /api/storage
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  res.json({
    used: user.storageUsed.toString(),
    limit: user.storageLimit.toString(),
  });
});

export default router;
