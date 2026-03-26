import { api } from './client';

export interface StorageInfo {
  used: string;
  limit: string;
}

export function getStorage(): Promise<StorageInfo> {
  return api<StorageInfo>('/api/storage');
}
