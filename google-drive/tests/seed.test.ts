import { describe, it, expect, vi } from 'vitest';
import prisma from '../src/server/db';

const uploadedObjects = new Map<string, { length: number; contentType: string }>();

vi.mock('../src/server/s3', () => ({
  getPresignedPutUrl: vi.fn().mockImplementation(async (key: string) => `https://s3.example.com/upload/${encodeURIComponent(key)}`),
  getPresignedGetUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-get-url'),
  headObject: vi.fn().mockImplementation(async (key: string) => {
    const metadata = uploadedObjects.get(key);
    if (!metadata) {
      throw new Error('NotFound');
    }

    return {
      ContentLength: metadata.length,
      ContentType: metadata.contentType,
    };
  }),
  deleteObject: vi.fn().mockResolvedValue({}),
  getObjectStream: vi.fn().mockResolvedValue(null),
  uploadViaPresignedUrl: vi.fn().mockImplementation(async (url: string, body: Buffer, contentType: string) => {
    const key = decodeURIComponent(url.split('/upload/')[1] ?? '');
    uploadedObjects.set(key, {
      length: body.length,
      contentType,
    });
  }),
}));

import { seed } from '../src/server/scripts/seed';

describe('Seed Script', () => {
  it('runs without errors and creates expected data', async () => {
    uploadedObjects.clear();

    await seed();

    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    expect(user).not.toBeNull();
    expect(user!.storageUsed).toBeGreaterThan(BigInt(0));

    const files = await prisma.file.findMany({ where: { userId: user!.id } });
    expect(files.length).toBeGreaterThanOrEqual(14);
    expect(files.every((file) => file.uploadStatus === 'uploaded')).toBe(true);

    const folders = files.filter((file) => file.isFolder);
    expect(folders.length).toBeGreaterThanOrEqual(5);

    const starredItems = files.filter((file) => file.starred);
    expect(starredItems.length).toBeGreaterThanOrEqual(2);

    const trashedItems = files.filter((file) => file.trashedAt !== null);
    expect(trashedItems.length).toBeGreaterThanOrEqual(1);

    expect(uploadedObjects.size).toBeGreaterThanOrEqual(10);
  });
});
