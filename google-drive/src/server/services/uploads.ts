import type { File } from '@prisma/client';
import { randomUUID } from 'crypto';
import path from 'path';
import prisma from '../db.js';
import { getPresignedPutUrl, headObject } from '../s3.js';

export interface CreatePendingUploadInput {
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  parentId?: string | null;
}

export interface CreatePendingUploadResult {
  file: File;
  uploadUrl: string;
}

export type ConfirmPendingUploadResult =
  | 'confirmed'
  | 'already-confirmed'
  | 'not-found'
  | 'invalid-state'
  | 'missing-object'
  | 'metadata-mismatch';

export async function createPendingUploadRecord(
  input: CreatePendingUploadInput,
): Promise<CreatePendingUploadResult> {
  const ext = path.extname(input.name).slice(1) || 'bin';
  const s3Key = `${input.userId}/${randomUUID()}.${ext}`;

  const file = await prisma.file.create({
    data: {
      name: input.name,
      mimeType: input.mimeType,
      size: BigInt(input.size),
      s3Key,
      uploadStatus: 'pending',
      userId: input.userId,
      parentId: input.parentId ?? null,
    },
  });

  const uploadUrl = await getPresignedPutUrl(s3Key, input.mimeType, input.size);
  return { file, uploadUrl };
}

export async function confirmPendingUpload(
  fileId: string,
  userId: string,
): Promise<ConfirmPendingUploadResult> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.userId !== userId) {
    return 'not-found';
  }

  if (file.uploadStatus === 'uploaded') {
    return 'already-confirmed';
  }

  if (file.uploadStatus !== 'pending' || file.isFolder || !file.s3Key) {
    return 'invalid-state';
  }

  let objectMetadata: Awaited<ReturnType<typeof headObject>>;
  try {
    objectMetadata = await headObject(file.s3Key);
  } catch {
    return 'missing-object';
  }

  const expectedSize = Number(file.size);
  const sizeMatches = objectMetadata.ContentLength === expectedSize;
  const typeMatches = !file.mimeType || objectMetadata.ContentType === file.mimeType;

  if (!sizeMatches || !typeMatches) {
    return 'metadata-mismatch';
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.file.updateMany({
      where: {
        id: fileId,
        userId,
        uploadStatus: 'pending',
      },
      data: {
        uploadStatus: 'uploaded',
      },
    });

    if (updated.count === 0) {
      const currentFile = await tx.file.findUnique({ where: { id: fileId } });
      if (currentFile?.userId === userId && currentFile.uploadStatus === 'uploaded') {
        return 'already-confirmed' as const;
      }

      return 'invalid-state' as const;
    }

    await tx.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: file.size } },
    });

    return 'confirmed' as const;
  });
}
