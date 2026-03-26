import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server/app';
import prisma from '../src/server/db';
import { registerUser, extractCookies, cookieHeader } from './helpers/auth';
import { Readable } from 'stream';

vi.mock('../src/server/s3', () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-put-url'),
  getPresignedGetUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-get-url'),
  headObject: vi.fn().mockResolvedValue({ ContentLength: 1024, ContentType: 'text/plain' }),
  deleteObject: vi.fn().mockResolvedValue({}),
  getObjectStream: vi.fn().mockImplementation(() => {
    return Promise.resolve(Readable.from(Buffer.from('file content')));
  }),
}));

import { deleteObject } from '../src/server/s3';
const mockedDeleteObject = vi.mocked(deleteObject);

interface AuthContext {
  cookies: Record<string, string>;
  userId: string;
}

async function authedUser(): Promise<AuthContext> {
  const { res } = await registerUser();
  const cookies = extractCookies(res);
  return { cookies, userId: res.body.id };
}

async function createUploadedFileRecord(auth: AuthContext, name: string, parentId?: string | null, size = 1024) {
  const file = await prisma.file.create({
    data: {
      name,
      mimeType: 'text/plain',
      size: BigInt(size),
      s3Key: `${auth.userId}/${name}`,
      uploadStatus: 'uploaded',
      userId: auth.userId,
      parentId: parentId || null,
    },
  });
  return file;
}

async function createFolder(auth: AuthContext, name: string, parentId?: string) {
  const folder = await prisma.file.create({
    data: {
      name,
      isFolder: true,
      uploadStatus: 'uploaded',
      userId: auth.userId,
      parentId: parentId || null,
    },
  });
  return folder;
}

function parseBinaryResponse(res: any, callback: (error: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Bulk Operations', () => {
  beforeEach(() => {
    mockedDeleteObject.mockReset();
    mockedDeleteObject.mockResolvedValue({} as any);
  });

  // Bulk trash 3 files → all three have trashedAt set
  describe('POST /api/files/bulk-trash', () => {
    it('trashes 3 files — all have trashedAt set', async () => {
      const auth = await authedUser();
      const f1 = await createUploadedFileRecord(auth, 'file1.txt');
      const f2 = await createUploadedFileRecord(auth, 'file2.txt');
      const f3 = await createUploadedFileRecord(auth, 'file3.txt');

      const res = await request(app)
        .post('/api/files/bulk-trash')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [f1.id, f2.id, f3.id] });

      expect(res.status).toBe(200);

      for (const id of [f1.id, f2.id, f3.id]) {
        const file = await prisma.file.findUnique({ where: { id } });
        expect(file!.trashedAt).not.toBeNull();
      }
    });
  });

  // Bulk restore 2 trashed files → both restored
  describe('POST /api/files/bulk-restore', () => {
    it('restores 2 trashed files', async () => {
      const auth = await authedUser();
      const f1 = await createUploadedFileRecord(auth, 'file1.txt');
      const f2 = await createUploadedFileRecord(auth, 'file2.txt');

      // Trash them
      await prisma.file.updateMany({
        where: { id: { in: [f1.id, f2.id] } },
        data: { trashedAt: new Date() },
      });

      const res = await request(app)
        .post('/api/files/bulk-restore')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [f1.id, f2.id] });

      expect(res.status).toBe(200);

      for (const id of [f1.id, f2.id]) {
        const file = await prisma.file.findUnique({ where: { id } });
        expect(file!.trashedAt).toBeNull();
      }
    });

    // Bulk restore file whose parent is deleted → restored to root
    it('restores to root if parent is deleted', async () => {
      const auth = await authedUser();
      const folder = await createFolder(auth, 'Parent');
      const file = await createUploadedFileRecord(auth, 'orphan.txt', folder.id);

      await prisma.file.update({
        where: { id: file.id },
        data: { trashedAt: new Date() },
      });
      // Delete parent directly
      await prisma.file.delete({ where: { id: folder.id } });

      const res = await request(app)
        .post('/api/files/bulk-restore')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [file.id] });

      expect(res.status).toBe(200);

      const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(dbFile!.trashedAt).toBeNull();
      expect(dbFile!.parentId).toBeNull();
    });
  });

  // Bulk delete 2 files → DB rows and S3 objects gone, quota decremented
  describe('POST /api/files/bulk-delete', () => {
    it('permanently deletes 2 files — rows gone, S3 deleted, quota decremented', async () => {
      const auth = await authedUser();
      const f1 = await createUploadedFileRecord(auth, 'del1.txt', null, 2000);
      const f2 = await createUploadedFileRecord(auth, 'del2.txt', null, 3000);

      await prisma.user.update({
        where: { id: auth.userId },
        data: { storageUsed: BigInt(5000) },
      });

      const res = await request(app)
        .post('/api/files/bulk-delete')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [f1.id, f2.id] });

      expect(res.status).toBe(200);

      expect(await prisma.file.findUnique({ where: { id: f1.id } })).toBeNull();
      expect(await prisma.file.findUnique({ where: { id: f2.id } })).toBeNull();

      expect(mockedDeleteObject).toHaveBeenCalledTimes(2);

      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      expect(user!.storageUsed).toBe(BigInt(0));
    });
  });

  // Bulk move 3 files to a new folder → all three have updated parentId
  describe('POST /api/files/bulk-move', () => {
    it('moves 3 files to a new folder', async () => {
      const auth = await authedUser();
      const folder = await createFolder(auth, 'Target');
      const f1 = await createUploadedFileRecord(auth, 'move1.txt');
      const f2 = await createUploadedFileRecord(auth, 'move2.txt');
      const f3 = await createUploadedFileRecord(auth, 'move3.txt');

      const res = await request(app)
        .post('/api/files/bulk-move')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [f1.id, f2.id, f3.id], parentId: folder.id });

      expect(res.status).toBe(200);

      for (const id of [f1.id, f2.id, f3.id]) {
        const file = await prisma.file.findUnique({ where: { id } });
        expect(file!.parentId).toBe(folder.id);
      }
    });

    it('rejects moving a folder into itself', async () => {
      const auth = await authedUser();
      const folder = await createFolder(auth, 'Self');
      const file = await createUploadedFileRecord(auth, 'file.txt');

      const res = await request(app)
        .post('/api/files/bulk-move')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [folder.id, file.id], parentId: folder.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itself/i);
    });

    it('rejects moving a folder into its own descendant', async () => {
      const auth = await authedUser();
      const parent = await createFolder(auth, 'Parent');
      const child = await createFolder(auth, 'Child', parent.id);

      const res = await request(app)
        .post('/api/files/bulk-move')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [parent.id], parentId: child.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/descendant/i);
    });
  });

  // Bulk download tests
  describe('POST /api/files/bulk-download', () => {
    // Bulk download 3 files → ZIP streams with correct filenames
    it('streams a ZIP for 3 files', async () => {
      const auth = await authedUser();
      const f1 = await createUploadedFileRecord(auth, 'a.txt');
      const f2 = await createUploadedFileRecord(auth, 'b.txt');
      const f3 = await createUploadedFileRecord(auth, 'c.txt');

      const res = await request(app)
        .post('/api/files/bulk-download')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .buffer(true)
        .parse(parseBinaryResponse)
        .send({ ids: [f1.id, f2.id, f3.id] });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.includes(Buffer.from('a.txt'))).toBe(true);
      expect(res.body.includes(Buffer.from('b.txt'))).toBe(true);
      expect(res.body.includes(Buffer.from('c.txt'))).toBe(true);
    });

    // Bulk download 51 files → 400
    it('rejects more than 50 files', async () => {
      const auth = await authedUser();
      const ids: string[] = [];
      for (let i = 0; i < 51; i++) {
        const f = await createUploadedFileRecord(auth, `file${i}.txt`);
        ids.push(f.id);
      }

      const res = await request(app)
        .post('/api/files/bulk-download')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/50/);
    });

    // Bulk download over 500 MB total → 400
    it('rejects total size over 500 MB', async () => {
      const auth = await authedUser();
      const f1 = await createUploadedFileRecord(auth, 'big1.bin', null, 300 * 1024 * 1024);
      const f2 = await createUploadedFileRecord(auth, 'big2.bin', null, 300 * 1024 * 1024);

      const res = await request(app)
        .post('/api/files/bulk-download')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [f1.id, f2.id] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/500 MB/);
    });

    // Bulk download with a folder in selection → 400
    it('rejects when a folder is in selection', async () => {
      const auth = await authedUser();
      const folder = await createFolder(auth, 'Folder');
      const file = await createUploadedFileRecord(auth, 'file.txt');

      const res = await request(app)
        .post('/api/files/bulk-download')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ ids: [folder.id, file.id] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/folder/i);
    });
  });
});
