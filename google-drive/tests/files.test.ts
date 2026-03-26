import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/server/app';
import prisma from '../src/server/db';
import { registerUser, extractCookies, cookieHeader } from './helpers/auth';

// Mock the S3 module
vi.mock('../src/server/s3', () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-put-url'),
  getPresignedGetUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-get-url'),
  headObject: vi.fn().mockResolvedValue({ ContentLength: 1024 }),
  deleteObject: vi.fn().mockResolvedValue({}),
}));

import { headObject } from '../src/server/s3';

const mockedHeadObject = vi.mocked(headObject);

interface AuthContext {
  cookies: Record<string, string>;
  userId: string;
}

async function authedUser(): Promise<AuthContext> {
  const { res } = await registerUser();
  const cookies = extractCookies(res);
  return { cookies, userId: res.body.id };
}

function postUploadUrl(auth: AuthContext, body: Record<string, unknown>) {
  return request(app)
    .post('/api/files/upload-url')
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token)
    .send(body);
}

async function createUploadedFile(auth: AuthContext, overrides: Record<string, unknown> = {}) {
  const uploadRes = await postUploadUrl(auth, {
    name: 'test.txt',
    mimeType: 'text/plain',
    size: 1024,
    ...overrides,
  });
  const fileId = uploadRes.body.fileId;

  // Confirm the file
  await request(app)
    .patch(`/api/files/${fileId}/confirm`)
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token);

  return fileId;
}

describe('Upload Lifecycle', () => {
  beforeEach(() => {
    mockedHeadObject.mockReset();
    mockedHeadObject.mockResolvedValue({ ContentLength: 1024 } as any);
  });

  // Upload URL request → returns { fileId, uploadUrl }, file record is pending
  describe('POST /api/files/upload-url', () => {
    it('returns fileId and uploadUrl, file record is pending', async () => {
      const auth = await authedUser();

      const res = await postUploadUrl(auth, {
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 5000,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('fileId');
      expect(res.body).toHaveProperty('uploadUrl');

      // Verify the DB record is pending
      const file = await prisma.file.findUnique({ where: { id: res.body.fileId } });
      expect(file).not.toBeNull();
      expect(file!.uploadStatus).toBe('pending');
      expect(file!.name).toBe('photo.jpg');
    });

    // Upload URL with file size > 100 MB → 400
    it('rejects file size > 100 MB with 400', async () => {
      const auth = await authedUser();

      const res = await postUploadUrl(auth, {
        name: 'huge.zip',
        mimeType: 'application/zip',
        size: 101 * 1024 * 1024,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/100 MB/i);
    });

    // Upload URL when quota would be exceeded → 413
    it('rejects when quota would be exceeded with 413', async () => {
      const auth = await authedUser();

      // Set user's storageUsed to near the limit
      await prisma.user.update({
        where: { id: auth.userId },
        data: { storageUsed: BigInt(1073741824) - BigInt(100) }, // 100 bytes from limit
      });

      const res = await postUploadUrl(auth, {
        name: 'file.txt',
        mimeType: 'text/plain',
        size: 200, // Would exceed quota
      });

      expect(res.status).toBe(413);
      expect(res.body.error).toMatch(/quota/i);
    });

    // Upload URL with trashed parentId → 400
    it('rejects trashed parentId with 400', async () => {
      const auth = await authedUser();

      // Create a trashed folder
      const folder = await prisma.file.create({
        data: {
          name: 'Trashed Folder',
          isFolder: true,
          userId: auth.userId,
          uploadStatus: 'uploaded',
          trashedAt: new Date(),
        },
      });

      const res = await postUploadUrl(auth, {
        name: 'file.txt',
        mimeType: 'text/plain',
        size: 1024,
        parentId: folder.id,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/trashed/i);
    });
  });

  // Confirm after S3 upload → status flips to uploaded, storageUsed incremented
  describe('PATCH /api/files/:id/confirm', () => {
    it('flips status to uploaded and increments storageUsed', async () => {
      const auth = await authedUser();

      const uploadRes = await postUploadUrl(auth, {
        name: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 2048,
      });

      const fileId = uploadRes.body.fileId;

      const res = await request(app)
        .patch(`/api/files/${fileId}/confirm`)
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token);

      expect(res.status).toBe(200);

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      expect(file!.uploadStatus).toBe('uploaded');

      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      expect(user!.storageUsed).toBe(BigInt(2048));
    });

    // Confirm same file again → 200 success, storageUsed not incremented twice
    it('is idempotent - does not double-increment storageUsed', async () => {
      const auth = await authedUser();

      const uploadRes = await postUploadUrl(auth, {
        name: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 2048,
      });
      const fileId = uploadRes.body.fileId;

      // First confirm
      await request(app)
        .patch(`/api/files/${fileId}/confirm`)
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token);

      // Second confirm
      const res = await request(app)
        .patch(`/api/files/${fileId}/confirm`)
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token);

      expect(res.status).toBe(200);

      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      expect(user!.storageUsed).toBe(BigInt(2048)); // Not 4096
    });

    // Confirm file that doesn't exist in S3 → 409 Conflict, status remains pending
    it('returns 409 when S3 object does not exist', async () => {
      const auth = await authedUser();

      const uploadRes = await postUploadUrl(auth, {
        name: 'missing.txt',
        mimeType: 'text/plain',
        size: 512,
      });
      const fileId = uploadRes.body.fileId;

      // Mock headObject to throw (object not found)
      mockedHeadObject.mockRejectedValueOnce(new Error('NotFound'));

      const res = await request(app)
        .patch(`/api/files/${fileId}/confirm`)
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token);

      expect(res.status).toBe(409);

      const file = await prisma.file.findUnique({ where: { id: fileId } });
      expect(file!.uploadStatus).toBe('pending');
    });
  });

  // Download returns presigned URL with correct Content-Disposition: attachment filename
  describe('GET /api/files/:id/download', () => {
    it('returns presigned URL for download', async () => {
      const auth = await authedUser();
      const fileId = await createUploadedFile(auth, { name: 'report.pdf', mimeType: 'application/pdf' });

      const res = await request(app)
        .get(`/api/files/${fileId}/download`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toContain('presigned-get-url');
    });
  });

  // Preview for JPEG → returns { url, mimeType }
  describe('GET /api/files/:id/preview', () => {
    it('returns preview for JPEG', async () => {
      const auth = await authedUser();
      const fileId = await createUploadedFile(auth, { name: 'photo.jpg', mimeType: 'image/jpeg' });

      const res = await request(app)
        .get(`/api/files/${fileId}/preview`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body.mimeType).toBe('image/jpeg');
    });

    // Preview for PDF → returns { url, mimeType }
    it('returns preview for PDF', async () => {
      const auth = await authedUser();
      const fileId = await createUploadedFile(auth, { name: 'doc.pdf', mimeType: 'application/pdf' });

      const res = await request(app)
        .get(`/api/files/${fileId}/preview`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('url');
      expect(res.body.mimeType).toBe('application/pdf');
    });

    // Preview for .zip → 400 (not previewable)
    it('rejects non-previewable .zip with 400', async () => {
      const auth = await authedUser();
      const fileId = await createUploadedFile(auth, { name: 'archive.zip', mimeType: 'application/zip' });

      const res = await request(app)
        .get(`/api/files/${fileId}/preview`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not previewable/i);
    });

    // Preview for SVG → 400 (download-only)
    it('rejects SVG with 400 (download-only)', async () => {
      const auth = await authedUser();
      const fileId = await createUploadedFile(auth, { name: 'image.svg', mimeType: 'image/svg+xml' });

      const res = await request(app)
        .get(`/api/files/${fileId}/preview`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not previewable/i);
    });
  });

  // GET /api/storage returns correct { used, limit }
  describe('GET /api/storage', () => {
    it('returns correct used and limit', async () => {
      const auth = await authedUser();

      const res = await request(app)
        .get('/api/storage')
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body.used).toBe('0');
      expect(res.body.limit).toBe('1073741824');
    });

    // GET /api/storage reflects incremented usage after upload confirm
    it('reflects incremented usage after upload confirm', async () => {
      const auth = await authedUser();
      await createUploadedFile(auth, { size: 5000 });

      const res = await request(app)
        .get('/api/storage')
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body.used).toBe('5000');
    });
  });

  // 101st upload URL request in 15 minutes → 429
  describe('Rate limiting', () => {
    it('returns 429 after 101st upload-url request', async () => {
      const auth = await authedUser();

      const results: number[] = [];
      for (let i = 0; i < 101; i++) {
        const res = await postUploadUrl(auth, {
          name: `file${i}.txt`,
          mimeType: 'text/plain',
          size: 100,
        });
        results.push(res.status);
      }

      expect(results.slice(0, 100).every(s => s === 201)).toBe(true);
      expect(results[100]).toBe(429);
    });
  });
});
