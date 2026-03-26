import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '../src/server/db';
import { registerUser, extractCookies } from './helpers/auth';

vi.mock('../src/server/s3', () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-put-url'),
  getPresignedGetUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-get-url'),
  headObject: vi.fn().mockResolvedValue({ ContentLength: 1024, ContentType: 'text/plain' }),
  deleteObject: vi.fn().mockResolvedValue({}),
  getObjectStream: vi.fn().mockResolvedValue(null),
}));

import { headObject } from '../src/server/s3';
const mockedHeadObject = vi.mocked(headObject);

import { reconcilePendingUploads } from '../src/server/scripts/reconcile';

describe('Reconciliation', () => {
  beforeEach(() => {
    mockedHeadObject.mockReset();
  });

  // Reconciliation: stale pending upload with valid S3 object → marked uploaded, quota incremented once
  it('marks stale pending upload as uploaded when S3 object exists with correct size', async () => {
    const { res } = await registerUser();
    const userId = res.body.id;

    // Create a stale pending file (created 30 minutes ago)
    const staleDate = new Date(Date.now() - 30 * 60 * 1000);
    const file = await prisma.file.create({
      data: {
        name: 'stale.txt',
        mimeType: 'text/plain',
        size: BigInt(2048),
        s3Key: `${userId}/stale.txt`,
        uploadStatus: 'pending',
        userId,
        createdAt: staleDate,
      },
    });

    mockedHeadObject.mockResolvedValueOnce({ ContentLength: 2048, ContentType: 'text/plain' } as any);

    await reconcilePendingUploads();

    const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(dbFile!.uploadStatus).toBe('uploaded');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user!.storageUsed).toBe(BigInt(2048));
  });

  // Reconciliation: stale pending upload with missing S3 object → marked failed
  it('marks stale pending upload as failed when S3 object is missing', async () => {
    const { res } = await registerUser();
    const userId = res.body.id;

    const staleDate = new Date(Date.now() - 30 * 60 * 1000);
    const file = await prisma.file.create({
      data: {
        name: 'missing.txt',
        mimeType: 'text/plain',
        size: BigInt(1024),
        s3Key: `${userId}/missing.txt`,
        uploadStatus: 'pending',
        userId,
        createdAt: staleDate,
      },
    });

    mockedHeadObject.mockRejectedValueOnce(new Error('NotFound'));

    await reconcilePendingUploads();

    const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
    expect(dbFile!.uploadStatus).toBe('failed');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user!.storageUsed).toBe(BigInt(0));
  });
});
