import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import prisma from '../db.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';
import { getPresignedGetUrl, deleteObject, getObjectStream } from '../s3.js';
import { createPendingUploadRecord, confirmPendingUpload } from '../services/uploads.js';

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

  const { file, uploadUrl } = await createPendingUploadRecord({
    userId,
    name,
    mimeType,
    size,
    parentId: parentId || null,
  });

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

// POST /api/files/bulk-trash
router.post('/bulk-trash', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  const now = new Date();
  for (const id of ids) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || file.userId !== userId) continue;

    await prisma.file.update({
      where: { id },
      data: { trashedAt: now },
    });

    if (file.isFolder) {
      await cascadeTrashToDescendants(id, id);
    }
  }

  res.json({ message: 'Items moved to trash' });
});

// POST /api/files/bulk-restore
router.post('/bulk-restore', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  for (const id of ids) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || file.userId !== userId) continue;

    let parentId = file.parentId;
    if (parentId) {
      const parent = await prisma.file.findUnique({ where: { id: parentId } });
      if (!parent) parentId = null;
    }

    await prisma.file.update({
      where: { id },
      data: { trashedAt: null, parentId },
    });

    if (file.isFolder) {
      await prisma.file.updateMany({
        where: { trashedByAncestorId: id },
        data: { trashedByAncestorId: null },
      });
    }
  }

  res.json({ message: 'Items restored' });
});

// POST /api/files/bulk-delete
router.post('/bulk-delete', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  for (const id of ids) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file || file.userId !== userId) continue;

    if (file.isFolder) {
      const allDescendants = await collectDescendants(id);
      const filesToDelete = allDescendants.filter(f => !f.isFolder && f.s3Key && f.uploadStatus === 'uploaded');

      let totalSize = BigInt(0);
      for (const f of filesToDelete) {
        totalSize += f.size;
      }

      for (const f of filesToDelete) {
        try { await deleteObject(f.s3Key!); } catch { /* continue */ }
      }

      const allIds = [...allDescendants.map(f => f.id), id];
      await prisma.$transaction([
        prisma.file.deleteMany({ where: { id: { in: allIds } } }),
        ...(totalSize > BigInt(0)
          ? [prisma.user.update({ where: { id: userId }, data: { storageUsed: { decrement: totalSize } } })]
          : []),
      ]);
    } else {
      if (file.s3Key && file.uploadStatus === 'uploaded') {
        try { await deleteObject(file.s3Key); } catch { /* continue */ }
      }
      const decrementSize = file.uploadStatus === 'uploaded' ? file.size : BigInt(0);
      await prisma.$transaction([
        prisma.file.delete({ where: { id } }),
        ...(decrementSize > BigInt(0)
          ? [prisma.user.update({ where: { id: userId }, data: { storageUsed: { decrement: decrementSize } } })]
          : []),
      ]);
    }
  }

  res.json({ message: 'Items permanently deleted' });
});

// POST /api/files/bulk-move
router.post('/bulk-move', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { ids, parentId } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  if (parentId) {
    const target = await prisma.file.findUnique({ where: { id: parentId } });
    if (!target || !target.isFolder || target.userId !== userId) {
      res.status(400).json({ error: 'Invalid target folder' });
      return;
    }
    if (target.trashedAt || target.trashedByAncestorId) {
      res.status(400).json({ error: 'Cannot move into a trashed folder' });
      return;
    }
  }

  const items = await prisma.file.findMany({
    where: {
      id: { in: ids },
      userId,
    },
  });

  for (const item of items) {
    if (!parentId || !item.isFolder) {
      continue;
    }

    if (parentId === item.id) {
      res.status(400).json({ error: 'Cannot move item into itself' });
      return;
    }

    let checkId: string | null = parentId;
    while (checkId) {
      if (checkId === item.id) {
        res.status(400).json({ error: 'Cannot move folder into its own descendant' });
        return;
      }

      const ancestor = await prisma.file.findUnique({ where: { id: checkId } });
      if (!ancestor) {
        break;
      }
      checkId = ancestor.parentId;
    }
  }

  await prisma.file.updateMany({
    where: {
      id: { in: ids },
      userId,
    },
    data: { parentId: parentId || null },
  });

  res.json({ message: 'Items moved' });
});

const BULK_DOWNLOAD_MAX_FILES = 50;
const BULK_DOWNLOAD_MAX_SIZE = 500 * 1024 * 1024; // 500 MB

// POST /api/files/bulk-download
router.post('/bulk-download', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  const files = await prisma.file.findMany({
    where: { id: { in: ids }, userId },
  });

  // Check for folders
  if (files.some(f => f.isFolder)) {
    res.status(400).json({ error: 'Bulk download does not support folders' });
    return;
  }

  if (files.length > BULK_DOWNLOAD_MAX_FILES) {
    res.status(400).json({ error: `Cannot download more than ${BULK_DOWNLOAD_MAX_FILES} files at once` });
    return;
  }

  const totalSize = files.reduce((sum, f) => sum + Number(f.size), 0);
  if (totalSize > BULK_DOWNLOAD_MAX_SIZE) {
    res.status(400).json({ error: 'Total download size exceeds 500 MB limit' });
    return;
  }

  // Stream ZIP
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="download.zip"');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  for (const file of files) {
    if (!file.s3Key) continue;
    try {
      const stream = await getObjectStream(file.s3Key);
      if (stream) {
        archive.append(stream as any, { name: file.name });
      }
    } catch {
      // Skip files that can't be fetched
    }
  }

  await archive.finalize();
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

  const result = await confirmPendingUpload(id, userId);

  if (result === 'already-confirmed') {
    res.json({ message: 'File already confirmed' });
    return;
  }

  if (result === 'not-found') {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (result === 'invalid-state') {
    res.status(400).json({ error: 'File cannot be confirmed' });
    return;
  }

  if (result === 'missing-object') {
    res.status(409).json({ error: 'File not yet available in storage' });
    return;
  }

  if (result === 'metadata-mismatch') {
    res.status(409).json({ error: 'Uploaded file metadata does not match the pending record' });
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
