import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import prisma from '../db.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';
import { getPresignedPutUrl, getPresignedGetUrl, headObject } from '../s3.js';

const router = Router();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const PREVIEWABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

// POST /api/files/upload-url
router.post('/upload-url', uploadRateLimit, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, mimeType, size, parentId } = req.body;

  if (!name || !mimeType || size == null) {
    res.status(400).json({ error: 'name, mimeType, and size are required' });
    return;
  }

  if (typeof size !== 'number' || size <= 0) {
    res.status(400).json({ error: 'size must be a positive number' });
    return;
  }

  if (size > MAX_FILE_SIZE) {
    res.status(400).json({ error: 'File size exceeds maximum of 100 MB' });
    return;
  }

  // Check quota
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (BigInt(user.storageUsed) + BigInt(size) > BigInt(user.storageLimit)) {
    res.status(413).json({ error: 'Storage quota exceeded' });
    return;
  }

  // Validate parentId if provided
  if (parentId) {
    const parent = await prisma.file.findUnique({ where: { id: parentId } });
    if (!parent || !parent.isFolder || parent.userId !== userId) {
      res.status(400).json({ error: 'Invalid parent folder' });
      return;
    }
    if (parent.trashedAt || parent.trashedByAncestorId) {
      res.status(400).json({ error: 'Cannot upload to a trashed folder' });
      return;
    }
  }

  // Generate S3 key
  const ext = path.extname(name).slice(1) || 'bin';
  const s3Key = `${userId}/${randomUUID()}.${ext}`;

  // Create pending file record
  const file = await prisma.file.create({
    data: {
      name,
      mimeType,
      size: BigInt(size),
      s3Key,
      uploadStatus: 'pending',
      userId,
      parentId: parentId || null,
    },
  });

  // Generate presigned PUT URL
  const uploadUrl = await getPresignedPutUrl(s3Key, mimeType, size);

  res.status(201).json({
    fileId: file.id,
    uploadUrl,
  });
});

// PATCH /api/files/:id/confirm
router.patch('/:id/confirm', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Idempotent: if already uploaded, return success
  if (file.uploadStatus === 'uploaded') {
    res.json({ message: 'File already confirmed' });
    return;
  }

  if (file.uploadStatus !== 'pending') {
    res.status(400).json({ error: 'File cannot be confirmed' });
    return;
  }

  // Verify S3 object exists
  try {
    await headObject(file.s3Key!);
  } catch {
    res.status(409).json({ error: 'File not yet available in storage' });
    return;
  }

  // Atomically update file status and increment quota
  await prisma.$transaction([
    prisma.file.update({
      where: { id },
      data: { uploadStatus: 'uploaded' },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: file.size } },
    }),
  ]);

  res.json({ message: 'File confirmed' });
});

// GET /api/files/:id/download
router.get('/:id/download', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.uploadStatus !== 'uploaded') {
    res.status(400).json({ error: 'File is not available for download' });
    return;
  }

  const disposition = `attachment; filename="${encodeURIComponent(file.name)}"`;
  const url = await getPresignedGetUrl(file.s3Key!, disposition);

  res.json({ url });
});

// GET /api/files/:id/preview
router.get('/:id/preview', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId || file.isFolder) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.uploadStatus !== 'uploaded') {
    res.status(400).json({ error: 'File is not available for preview' });
    return;
  }

  if (!file.mimeType || !PREVIEWABLE_MIME_TYPES.has(file.mimeType)) {
    res.status(400).json({ error: 'File type is not previewable' });
    return;
  }

  const disposition = `inline; filename="${encodeURIComponent(file.name)}"`;
  const url = await getPresignedGetUrl(file.s3Key!, disposition);

  res.json({ url, mimeType: file.mimeType });
});

export default router;
