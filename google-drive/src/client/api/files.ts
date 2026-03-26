import { api } from './client';
import type { FileItem } from '../types';

export function listFiles(parentId?: string | null, foldersOnly = false): Promise<FileItem[]> {
  const params = new URLSearchParams();
  if (parentId) params.set('parentId', parentId);
  if (foldersOnly) params.set('foldersOnly', 'true');
  const qs = params.toString();
  return api<FileItem[]>(`/api/files${qs ? `?${qs}` : ''}`);
}

export function getFile(id: string): Promise<FileItem> {
  return api<FileItem>(`/api/files/${id}`);
}

export function getFilePath(id: string): Promise<FileItem[]> {
  return api<FileItem[]>(`/api/files/${id}/path`);
}

export function searchFiles(q: string): Promise<FileItem[]> {
  return api<FileItem[]>(`/api/files/search?q=${encodeURIComponent(q)}`);
}

export function getStarredFiles(): Promise<FileItem[]> {
  return api<FileItem[]>('/api/files/starred');
}

export function getTrashedFiles(): Promise<FileItem[]> {
  return api<FileItem[]>('/api/files/trash');
}

export function createFolder(name: string, parentId?: string | null): Promise<FileItem> {
  return api<FileItem>('/api/files/folder', {
    method: 'POST',
    body: JSON.stringify({ name, parentId }),
  });
}

export function updateFile(id: string, data: { name?: string; starred?: boolean; parentId?: string | null }): Promise<FileItem> {
  return api<FileItem>(`/api/files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function trashFile(id: string): Promise<void> {
  return api(`/api/files/${id}/trash`, { method: 'PATCH' });
}

export function restoreFile(id: string): Promise<void> {
  return api(`/api/files/${id}/restore`, { method: 'PATCH' });
}

export function deleteFile(id: string): Promise<void> {
  return api(`/api/files/${id}`, { method: 'DELETE' });
}

export function bulkTrash(ids: string[]): Promise<void> {
  return api('/api/files/bulk-trash', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkRestore(ids: string[]): Promise<void> {
  return api('/api/files/bulk-restore', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkDelete(ids: string[]): Promise<void> {
  return api('/api/files/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function bulkMove(ids: string[], parentId: string | null): Promise<void> {
  return api('/api/files/bulk-move', {
    method: 'POST',
    body: JSON.stringify({ ids, parentId }),
  });
}

export function getDownloadUrl(id: string): Promise<{ url: string }> {
  return api<{ url: string }>(`/api/files/${id}/download`);
}

export function getPreviewUrl(id: string): Promise<{ url: string; mimeType: string }> {
  return api<{ url: string; mimeType: string }>(`/api/files/${id}/preview`);
}
