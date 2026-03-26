export interface User {
  id: string;
  email: string;
  storageUsed?: string;
  storageLimit?: string;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  size: string;
  isFolder: boolean;
  starred: boolean;
  s3Key: string | null;
  uploadStatus: string;
  parentId: string | null;
  userId: string;
  trashedAt: string | null;
  trashedByAncestorId: string | null;
  createdAt: string;
  updatedAt: string;
}
