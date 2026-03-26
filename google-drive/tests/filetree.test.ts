import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/server/app';
import prisma from '../src/server/db';
import { registerUser, extractCookies, cookieHeader } from './helpers/auth';

vi.mock('../src/server/s3', () => ({
  getPresignedPutUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-put-url'),
  getPresignedGetUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-get-url'),
  headObject: vi.fn().mockResolvedValue({ ContentLength: 1024, ContentType: 'text/plain' }),
  deleteObject: vi.fn().mockResolvedValue({}),
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

function createFolder(auth: AuthContext, name: string, parentId?: string) {
  return request(app)
    .post('/api/files/folder')
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token)
    .send({ name, parentId });
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

function patchFile(auth: AuthContext, id: string, body: Record<string, unknown>) {
  return request(app)
    .patch(`/api/files/${id}`)
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token)
    .send(body);
}

function trashFile(auth: AuthContext, id: string) {
  return request(app)
    .patch(`/api/files/${id}/trash`)
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token);
}

function restoreFile(auth: AuthContext, id: string) {
  return request(app)
    .patch(`/api/files/${id}/restore`)
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token);
}

function deleteFile(auth: AuthContext, id: string) {
  return request(app)
    .delete(`/api/files/${id}`)
    .set('Cookie', cookieHeader(auth.cookies))
    .set('X-CSRF-Token', auth.cookies.csrf_token);
}

function listFiles(auth: AuthContext, query: Record<string, string> = {}) {
  return request(app)
    .get('/api/files')
    .query(query)
    .set('Cookie', cookieHeader(auth.cookies));
}

describe('File Tree and Trash', () => {
  beforeEach(() => {
    mockedDeleteObject.mockReset();
    mockedDeleteObject.mockResolvedValue({} as any);
  });

  // --- Folder CRUD ---
  describe('POST /api/files/folder', () => {
    it('creates a folder with isFolder: true', async () => {
      const auth = await authedUser();
      const res = await createFolder(auth, 'Documents');

      expect(res.status).toBe(201);
      expect(res.body.isFolder).toBe(true);
      expect(res.body.name).toBe('Documents');
    });

    it('rejects name containing /', async () => {
      const auth = await authedUser();
      const res = await createFolder(auth, 'bad/name');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid characters/i);
    });

    it('rejects whitespace-only name', async () => {
      const auth = await authedUser();
      const res = await createFolder(auth, '   ');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/empty/i);
    });

    it('rejects trashed parentId', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Parent');
      const folderId = folderRes.body.id;

      await trashFile(auth, folderId);

      const res = await createFolder(auth, 'Child');
      // Try creating with the trashed parent
      const res2 = await request(app)
        .post('/api/files/folder')
        .set('Cookie', cookieHeader(auth.cookies))
        .set('X-CSRF-Token', auth.cookies.csrf_token)
        .send({ name: 'Child', parentId: folderId });

      expect(res2.status).toBe(400);
      expect(res2.body.error).toMatch(/trashed/i);
    });
  });

  // --- Listing ---
  describe('GET /api/files', () => {
    it('lists root with folders first, then files, alphabetical', async () => {
      const auth = await authedUser();

      await createFolder(auth, 'Zebra');
      await createFolder(auth, 'Apple');
      await createUploadedFileRecord(auth, 'notes.txt');
      await createUploadedFileRecord(auth, 'alpha.txt');

      const res = await listFiles(auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(4);
      // Folders first, alphabetical
      expect(res.body[0].name).toBe('Apple');
      expect(res.body[0].isFolder).toBe(true);
      expect(res.body[1].name).toBe('Zebra');
      expect(res.body[1].isFolder).toBe(true);
      // Files next, alphabetical
      expect(res.body[2].name).toBe('alpha.txt');
      expect(res.body[3].name).toBe('notes.txt');
    });

    it('returns only folders with foldersOnly=true', async () => {
      const auth = await authedUser();

      await createFolder(auth, 'Docs');
      await createUploadedFileRecord(auth, 'file.txt');

      const res = await listFiles(auth, { foldersOnly: 'true' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Docs');
      expect(res.body[0].isFolder).toBe(true);
    });

    it('excludes trashed children', async () => {
      const auth = await authedUser();

      await createUploadedFileRecord(auth, 'visible.txt');
      const trashedFile = await createUploadedFileRecord(auth, 'trashed.txt');
      await trashFile(auth, trashedFile.id);

      const res = await listFiles(auth);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('visible.txt');
    });
  });

  // --- Single item ---
  describe('GET /api/files/:id', () => {
    it('returns correct metadata', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'readme.txt');

      const res = await request(app)
        .get(`/api/files/${file.id}`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(file.id);
      expect(res.body.name).toBe('readme.txt');
      expect(res.body.size).toBe('1024');
    });
  });

  // --- Breadcrumbs ---
  describe('GET /api/files/:id/path', () => {
    it('returns ancestor chain from root for nested folder', async () => {
      const auth = await authedUser();

      const l1 = await createFolder(auth, 'Level 1');
      const l2 = await createFolder(auth, 'Level 2');
      // Move L2 inside L1
      await patchFile(auth, l2.body.id, { parentId: l1.body.id });

      const l3 = await createFolder(auth, 'Level 3');
      await patchFile(auth, l3.body.id, { parentId: l2.body.id });

      const res = await request(app)
        .get(`/api/files/${l3.body.id}/path`)
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Level 1');
      expect(res.body[1].name).toBe('Level 2');
    });
  });

  // --- Search ---
  describe('GET /api/files/search', () => {
    it('finds matching non-trashed items by partial filename', async () => {
      const auth = await authedUser();

      await createUploadedFileRecord(auth, 'report-2024.pdf');
      await createUploadedFileRecord(auth, 'report-2025.pdf');
      await createUploadedFileRecord(auth, 'notes.txt');

      const res = await request(app)
        .get('/api/files/search')
        .query({ q: 'report' })
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('excludes directly trashed items', async () => {
      const auth = await authedUser();

      const file = await createUploadedFileRecord(auth, 'searchable.txt');
      await trashFile(auth, file.id);

      const res = await request(app)
        .get('/api/files/search')
        .query({ q: 'searchable' })
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it('excludes items with trashedByAncestorId set', async () => {
      const auth = await authedUser();

      const folderRes = await createFolder(auth, 'Folder');
      const file = await createUploadedFileRecord(auth, 'nested-search.txt', folderRes.body.id);

      // Trash the folder → cascades to child
      await trashFile(auth, folderRes.body.id);

      const res = await request(app)
        .get('/api/files/search')
        .query({ q: 'nested-search' })
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  // --- Star/Unstar ---
  describe('Star/Unstar', () => {
    it('stars a file and it appears in starred view', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'important.txt');

      const res = await patchFile(auth, file.id, { starred: true });
      expect(res.status).toBe(200);
      expect(res.body.starred).toBe(true);

      const starredRes = await request(app)
        .get('/api/files/starred')
        .set('Cookie', cookieHeader(auth.cookies));

      expect(starredRes.body).toHaveLength(1);
      expect(starredRes.body[0].id).toBe(file.id);
    });

    it('unstars a file and it disappears from starred view', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'important.txt');

      await patchFile(auth, file.id, { starred: true });
      await patchFile(auth, file.id, { starred: false });

      const starredRes = await request(app)
        .get('/api/files/starred')
        .set('Cookie', cookieHeader(auth.cookies));

      expect(starredRes.body).toHaveLength(0);
    });
  });

  // --- Rename ---
  describe('Rename', () => {
    it('renames a file', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'old-name.txt');

      const res = await patchFile(auth, file.id, { name: 'new-name.txt' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('new-name.txt');
    });

    it('rejects rename with invalid characters', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'file.txt');

      const res = await patchFile(auth, file.id, { name: 'bad*name.txt' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid characters/i);
    });
  });

  // --- Move ---
  describe('Move', () => {
    it('moves file to different folder', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'moveme.txt');
      const folderRes = await createFolder(auth, 'Target');

      const res = await patchFile(auth, file.id, { parentId: folderRes.body.id });

      expect(res.status).toBe(200);
      expect(res.body.parentId).toBe(folderRes.body.id);
    });

    it('rejects moving folder into itself', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Self');

      const res = await patchFile(auth, folderRes.body.id, { parentId: folderRes.body.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/itself/i);
    });

    it('rejects moving folder into its own descendant', async () => {
      const auth = await authedUser();
      const parentRes = await createFolder(auth, 'Parent');
      const childRes = await createFolder(auth, 'Child');
      await patchFile(auth, childRes.body.id, { parentId: parentRes.body.id });

      const res = await patchFile(auth, parentRes.body.id, { parentId: childRes.body.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/descendant/i);
    });

    it('rejects moving into trashed folder', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'file.txt');
      const folderRes = await createFolder(auth, 'Trashed');
      await trashFile(auth, folderRes.body.id);

      const res = await patchFile(auth, file.id, { parentId: folderRes.body.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/trashed/i);
    });
  });

  // --- Trash ---
  describe('Trash', () => {
    it('trashes a file — sets trashedAt, excluded from list and search', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'deleteme.txt');

      const res = await trashFile(auth, file.id);
      expect(res.status).toBe(200);

      // Check DB
      const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(dbFile!.trashedAt).not.toBeNull();

      // Excluded from list
      const listRes = await listFiles(auth);
      expect(listRes.body.find((f: any) => f.id === file.id)).toBeUndefined();

      // Excluded from search
      const searchRes = await request(app)
        .get('/api/files/search')
        .query({ q: 'deleteme' })
        .set('Cookie', cookieHeader(auth.cookies));
      expect(searchRes.body).toHaveLength(0);
    });

    it('trashes a folder — sets trashedByAncestorId on all descendants', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Parent');
      const child = await createUploadedFileRecord(auth, 'child.txt', folderRes.body.id);
      const subfolderRes = await createFolder(auth, 'Subfolder');
      await patchFile(auth, subfolderRes.body.id, { parentId: folderRes.body.id });
      const grandchild = await createUploadedFileRecord(auth, 'grandchild.txt', subfolderRes.body.id);

      await trashFile(auth, folderRes.body.id);

      const dbChild = await prisma.file.findUnique({ where: { id: child.id } });
      expect(dbChild!.trashedByAncestorId).toBe(folderRes.body.id);

      const dbGrandchild = await prisma.file.findUnique({ where: { id: grandchild.id } });
      expect(dbGrandchild!.trashedByAncestorId).toBe(folderRes.body.id);
    });

    it('trashing a folder where child was already directly trashed — child keeps trashedAt, gains trashedByAncestorId', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Parent');
      const child = await createUploadedFileRecord(auth, 'child.txt', folderRes.body.id);

      // Directly trash the child first
      await trashFile(auth, child.id);
      const childAfterDirectTrash = await prisma.file.findUnique({ where: { id: child.id } });
      const directTrashedAt = childAfterDirectTrash!.trashedAt;

      // Now trash the parent
      await trashFile(auth, folderRes.body.id);

      const childAfter = await prisma.file.findUnique({ where: { id: child.id } });
      // Keeps its own trashedAt
      expect(childAfter!.trashedAt!.getTime()).toBe(directTrashedAt!.getTime());
      // Also gains trashedByAncestorId
      expect(childAfter!.trashedByAncestorId).toBe(folderRes.body.id);
    });
  });

  // --- Trash view ---
  describe('GET /api/files/trash', () => {
    it('returns only top-level trashed items, not inherited-trash descendants', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Folder');
      const child = await createUploadedFileRecord(auth, 'child.txt', folderRes.body.id);

      await trashFile(auth, folderRes.body.id);

      const res = await request(app)
        .get('/api/files/trash')
        .set('Cookie', cookieHeader(auth.cookies));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(folderRes.body.id);
      // Child should NOT appear (it has trashedByAncestorId, not its own trashedAt)
    });
  });

  // --- Restore ---
  describe('Restore', () => {
    it('restores a file — trashedAt cleared, reappears in list', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'restore-me.txt');
      await trashFile(auth, file.id);

      const res = await restoreFile(auth, file.id);
      expect(res.status).toBe(200);

      const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(dbFile!.trashedAt).toBeNull();

      const listRes = await listFiles(auth);
      expect(listRes.body.find((f: any) => f.id === file.id)).toBeDefined();
    });

    it('restores a folder — clears trashedByAncestorId on descendants; directly trashed children remain trashed', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Parent');
      const normalChild = await createUploadedFileRecord(auth, 'normal.txt', folderRes.body.id);
      const directlyTrashedChild = await createUploadedFileRecord(auth, 'direct-trashed.txt', folderRes.body.id);

      // Directly trash one child
      await trashFile(auth, directlyTrashedChild.id);
      // Trash parent (cascades)
      await trashFile(auth, folderRes.body.id);

      // Restore parent
      await restoreFile(auth, folderRes.body.id);

      const dbNormal = await prisma.file.findUnique({ where: { id: normalChild.id } });
      expect(dbNormal!.trashedAt).toBeNull();
      expect(dbNormal!.trashedByAncestorId).toBeNull();

      // The directly trashed child keeps its own trashedAt
      const dbDirectTrashed = await prisma.file.findUnique({ where: { id: directlyTrashedChild.id } });
      expect(dbDirectTrashed!.trashedAt).not.toBeNull();
      expect(dbDirectTrashed!.trashedByAncestorId).toBeNull();
    });

    it('restores to root if parent was permanently deleted', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'Parent');
      const file = await createUploadedFileRecord(auth, 'orphan.txt', folderRes.body.id);

      // Trash the file directly, then remove the parent folder row directly
      // (simulates parent being deleted through a separate path)
      await trashFile(auth, file.id);
      await prisma.file.delete({ where: { id: folderRes.body.id } });

      await restoreFile(auth, file.id);

      const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(dbFile!.trashedAt).toBeNull();
      expect(dbFile!.parentId).toBeNull(); // Restored to root
    });
  });

  // --- Permanent delete ---
  describe('DELETE /api/files/:id', () => {
    it('permanently deletes a file — DB row gone, S3 object deleted, storageUsed decremented', async () => {
      const auth = await authedUser();
      const file = await createUploadedFileRecord(auth, 'delete-forever.txt', null, 5000);

      // Set user storageUsed to match
      await prisma.user.update({
        where: { id: auth.userId },
        data: { storageUsed: BigInt(5000) },
      });

      const res = await deleteFile(auth, file.id);
      expect(res.status).toBe(200);

      const dbFile = await prisma.file.findUnique({ where: { id: file.id } });
      expect(dbFile).toBeNull();

      expect(mockedDeleteObject).toHaveBeenCalled();

      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      expect(user!.storageUsed).toBe(BigInt(0));
    });

    it('permanently deletes a folder — all descendants and S3 objects gone, storageUsed decremented', async () => {
      const auth = await authedUser();
      const folderRes = await createFolder(auth, 'ToDelete');
      const child1 = await createUploadedFileRecord(auth, 'child1.txt', folderRes.body.id, 2000);
      const child2 = await createUploadedFileRecord(auth, 'child2.txt', folderRes.body.id, 3000);

      await prisma.user.update({
        where: { id: auth.userId },
        data: { storageUsed: BigInt(5000) },
      });

      const res = await deleteFile(auth, folderRes.body.id);
      expect(res.status).toBe(200);

      // Folder and all children gone
      const dbFolder = await prisma.file.findUnique({ where: { id: folderRes.body.id } });
      expect(dbFolder).toBeNull();
      const dbChild1 = await prisma.file.findUnique({ where: { id: child1.id } });
      expect(dbChild1).toBeNull();
      const dbChild2 = await prisma.file.findUnique({ where: { id: child2.id } });
      expect(dbChild2).toBeNull();

      // S3 deletions called for both files
      expect(mockedDeleteObject).toHaveBeenCalledTimes(2);

      // Storage decremented
      const user = await prisma.user.findUnique({ where: { id: auth.userId } });
      expect(user!.storageUsed).toBe(BigInt(0));
    });
  });
});
