import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import path from 'path';
import prisma from '../db.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';
import { getPresignedPutUrl, getPresignedGetUrl, headObject, deleteObject } from '../s3.js';

const router = Router();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const PREVIEWABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const INVALID_NAME_CHARS = /[/\\:*?"<>|]/;

function getRouteId(req: Request): string | null {
  const value = req.params.id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function validateName(name: unknown): { valid: true; trimmed: string } | { valid: false; error: string } {
  if (typeof name !== 'string') return { valid: false, error: 'Name is required' };
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Name cannot be empty' };
  if (INVALID_NAME_CHARS.test(trimmed)) return { valid: false, error: 'Name contains invalid characters' };
  return { valid: true, trimmed };
}

function serializeFile(file: any) {
  return {
    ...file,
    size: file.size.toString(),
  };
}

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

// POST /api/files/folder
router.post('/folder', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, parentId } = req.body;

  const nameResult = validateName(name);
  if (!nameResult.valid) {
    res.status(400).json({ error: nameResult.error });
    return;
  }

  if (parentId) {
    const parent = await prisma.file.findUnique({ where: { id: parentId } });
    if (!parent || !parent.isFolder || parent.userId !== userId) {
      res.status(400).json({ error: 'Invalid parent folder' });
      return;
    }
    if (parent.trashedAt || parent.trashedByAncestorId) {
      res.status(400).json({ error: 'Cannot create folder in a trashed folder' });
      return;
    }
  }

  const folder = await prisma.file.create({
    data: {
      name: nameResult.trimmed,
      isFolder: true,
      uploadStatus: 'uploaded',
      userId,
      parentId: parentId || null,
    },
  });

  res.status(201).json(serializeFile(folder));
});

// GET /api/files/search
router.get('/search', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const q = req.query.q as string;

  if (!q || q.trim().length === 0) {
    res.json([]);
    return;
  }

  const files = await prisma.file.findMany({
    where: {
      userId,
      name: { contains: q, mode: 'insensitive' },
      trashedAt: null,
      trashedByAncestorId: null,
    },
    orderBy: [{ isFolder: 'desc' }, { name: 'asc' }],
  });

  res.json(files.map(serializeFile));
});

// GET /api/files/starred
router.get('/starred', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const files = await prisma.file.findMany({
    where: {
      userId,
      starred: true,
      trashedAt: null,
      trashedByAncestorId: null,
    },
    orderBy: [{ isFolder: 'desc' }, { name: 'asc' }],
  });

  res.json(files.map(serializeFile));
});

// GET /api/files/trash
router.get('/trash', async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const files = await prisma.file.findMany({
    where: {
      userId,
      trashedAt: { not: null },
      trashedByAncestorId: null,
    },
    orderBy: [{ isFolder: 'desc' }, { name: 'asc' }],
  });

  res.json(files.map(serializeFile));
});

// GET /api/files — list folder contents
router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const parentId = (req.query.parentId as string) || null;
  const foldersOnly = req.query.foldersOnly === 'true';

  const where: any = {
    userId,
    parentId,
    trashedAt: null,
    trashedByAncestorId: null,
  };

  if (foldersOnly) {
    where.isFolder = true;
  }

  const files = await prisma.file.findMany({
    where,
    orderBy: [{ isFolder: 'desc' }, { name: 'asc' }],
  });

  res.json(files.map(serializeFile));
});

// GET /api/files/:id/path — breadcrumb ancestor chain
router.get('/:id/path', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Walk up the tree collecting ancestors
  const ancestors: any[] = [];
  let currentParentId = file.parentId;

  while (currentParentId) {
    const parent = await prisma.file.findUnique({ where: { id: currentParentId } });
    if (!parent) break;
    ancestors.unshift(serializeFile(parent));
    currentParentId = parent.parentId;
  }

  res.json(ancestors);
});

// GET /api/files/:id — single item metadata
router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json(serializeFile(file));
});

// PATCH /api/files/:id — rename, star/unstar, move
router.patch('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const data: any = {};

  // Rename
  if (req.body.name !== undefined) {
    const nameResult = validateName(req.body.name);
    if (!nameResult.valid) {
      res.status(400).json({ error: nameResult.error });
      return;
    }
    data.name = nameResult.trimmed;
  }

  // Star/unstar
  if (req.body.starred !== undefined) {
    data.starred = Boolean(req.body.starred);
  }

  // Move
  if (req.body.parentId !== undefined) {
    const newParentId = req.body.parentId;

    if (newParentId) {
      // Can't move into itself
      if (newParentId === id) {
        res.status(400).json({ error: 'Cannot move item into itself' });
        return;
      }

      const targetParent = await prisma.file.findUnique({ where: { id: newParentId } });
      if (!targetParent || !targetParent.isFolder || targetParent.userId !== userId) {
        res.status(400).json({ error: 'Invalid target folder' });
        return;
      }

      if (targetParent.trashedAt || targetParent.trashedByAncestorId) {
        res.status(400).json({ error: 'Cannot move into a trashed folder' });
        return;
      }

      // Cycle detection: walk up from target to make sure we don't hit the item being moved
      if (file.isFolder) {
        let checkId: string | null = targetParent.parentId;
        while (checkId) {
          if (checkId === id) {
            res.status(400).json({ error: 'Cannot move folder into its own descendant' });
            return;
          }
          const ancestor = await prisma.file.findUnique({ where: { id: checkId } });
          if (!ancestor) break;
          checkId = ancestor.parentId;
        }
      }

      data.parentId = newParentId;
    } else {
      data.parentId = null; // Move to root
    }
  }

  const updated = await prisma.file.update({ where: { id }, data });
  res.json(serializeFile(updated));
});

// PATCH /api/files/:id/trash
router.patch('/:id/trash', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  await prisma.file.update({
    where: { id },
    data: { trashedAt: new Date() },
  });

  // If folder, cascade trashedByAncestorId to all descendants
  if (file.isFolder) {
    await cascadeTrashToDescendants(id, id);
  }

  res.json({ message: 'Moved to trash' });
});

// PATCH /api/files/:id/restore
router.patch('/:id/restore', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  // Check if parent still exists; fall back to root if not
  let parentId = file.parentId;
  if (parentId) {
    const parent = await prisma.file.findUnique({ where: { id: parentId } });
    if (!parent) {
      parentId = null;
    }
  }

  await prisma.file.update({
    where: { id },
    data: { trashedAt: null, parentId },
  });

  // If folder, clear ancestor-trash markers on descendants
  if (file.isFolder) {
    await prisma.file.updateMany({
      where: { trashedByAncestorId: id },
      data: { trashedByAncestorId: null },
    });
  }

  res.json({ message: 'Restored from trash' });
});

// DELETE /api/files/:id — permanent delete
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.userId !== userId) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (file.isFolder) {
    // Collect all descendants recursively
    const allDescendants = await collectDescendants(id);
    const filesToDelete = allDescendants.filter(f => !f.isFolder && f.s3Key && f.uploadStatus === 'uploaded');

    // Calculate total storage to decrement
    let totalSize = BigInt(0);
    for (const f of filesToDelete) {
      totalSize += f.size;
    }

    // Delete S3 objects
    for (const f of filesToDelete) {
      try {
        await deleteObject(f.s3Key!);
      } catch {
        // Continue even if S3 delete fails
      }
    }

    // Delete all descendants + the folder itself, decrement storage
    const allIds = [...allDescendants.map(f => f.id), id];
    await prisma.$transaction([
      prisma.file.deleteMany({ where: { id: { in: allIds } } }),
      ...(totalSize > BigInt(0)
        ? [prisma.user.update({
            where: { id: userId },
            data: { storageUsed: { decrement: totalSize } },
          })]
        : []),
    ]);
  } else {
    // Single file delete
    if (file.s3Key && file.uploadStatus === 'uploaded') {
      try {
        await deleteObject(file.s3Key);
      } catch {
        // Continue even if S3 delete fails
      }
    }

    const decrementSize = file.uploadStatus === 'uploaded' ? file.size : BigInt(0);

    await prisma.$transaction([
      prisma.file.delete({ where: { id } }),
      ...(decrementSize > BigInt(0)
        ? [prisma.user.update({
            where: { id: userId },
            data: { storageUsed: { decrement: decrementSize } },
          })]
        : []),
    ]);
  }

  res.json({ message: 'Permanently deleted' });
});

// Helper: recursively cascade trashedByAncestorId to descendants
async function cascadeTrashToDescendants(parentId: string, ancestorId: string) {
  const children = await prisma.file.findMany({
    where: { parentId },
  });

  for (const child of children) {
    if (!child.trashedByAncestorId) {
      await prisma.file.update({
        where: { id: child.id },
        data: { trashedByAncestorId: ancestorId },
      });
    }
    if (child.isFolder) {
      await cascadeTrashToDescendants(child.id, ancestorId);
    }
  }
}

// Helper: collect all descendants of a folder
async function collectDescendants(parentId: string): Promise<any[]> {
  const children = await prisma.file.findMany({ where: { parentId } });
  const result: any[] = [...children];
  for (const child of children) {
    if (child.isFolder) {
      const nested = await collectDescendants(child.id);
      result.push(...nested);
    }
  }
  return result;
}

// PATCH /api/files/:id/confirm
router.patch('/:id/confirm', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

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

  if (file.isFolder || !file.s3Key) {
    res.status(400).json({ error: 'File cannot be confirmed' });
    return;
  }

  // Verify S3 object exists
  let objectMetadata: Awaited<ReturnType<typeof headObject>>;
  try {
    objectMetadata = await headObject(file.s3Key);
  } catch {
    res.status(409).json({ error: 'File not yet available in storage' });
    return;
  }

  const expectedSize = Number(file.size);
  const sizeMatches = objectMetadata.ContentLength === expectedSize;
  const typeMatches = !file.mimeType || objectMetadata.ContentType === file.mimeType;

  if (!sizeMatches || !typeMatches) {
    res.status(409).json({ error: 'Uploaded file metadata does not match the pending record' });
    return;
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const updated = await tx.file.updateMany({
      where: {
        id,
        userId,
        uploadStatus: 'pending',
      },
      data: {
        uploadStatus: 'uploaded',
      },
    });

    if (updated.count === 0) {
      const currentFile = await tx.file.findUnique({ where: { id } });
      if (currentFile?.userId === userId && currentFile.uploadStatus === 'uploaded') {
        return 'already-confirmed' as const;
      }

      return 'invalid-state' as const;
    }

    await tx.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: file.size } },
    });

    return 'confirmed' as const;
  });

  if (outcome === 'already-confirmed') {
    res.json({ message: 'File already confirmed' });
    return;
  }

  if (outcome === 'invalid-state') {
    res.status(400).json({ error: 'File cannot be confirmed' });
    return;
  }

  res.json({ message: 'File confirmed' });
});

// GET /api/files/:id/download
router.get('/:id/download', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

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
  const id = getRouteId(req);

  if (!id) {
    res.status(400).json({ error: 'Invalid file id' });
    return;
  }

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
