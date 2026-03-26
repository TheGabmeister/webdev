import { api } from './client';

export interface UploadUrlResponse {
  fileId: string;
  uploadUrl: string;
}

export function getUploadUrl(data: {
  name: string;
  mimeType: string;
  size: number;
  parentId?: string | null;
}): Promise<UploadUrlResponse> {
  return api<UploadUrlResponse>('/api/files/upload-url', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function confirmUpload(fileId: string): Promise<void> {
  return api(`/api/files/${fileId}/confirm`, { method: 'PATCH' });
}
