import prisma from '../db.js';
import { headObject, deleteObject } from '../s3.js';

const STALE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

export async function reconcilePendingUploads() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  const staleUploads = await prisma.file.findMany({
    where: {
      uploadStatus: 'pending',
      createdAt: { lt: cutoff },
      isFolder: false,
    },
  });

  console.log(`Found ${staleUploads.length} stale pending uploads`);

  for (const file of staleUploads) {
    if (!file.s3Key) {
      await prisma.file.update({
        where: { id: file.id },
        data: { uploadStatus: 'failed' },
      });
      continue;
    }

    try {
      const metadata = await headObject(file.s3Key);
      const expectedSize = Number(file.size);

      if (metadata.ContentLength === expectedSize) {
        // Valid object — mark uploaded and increment quota
        await prisma.$transaction([
          prisma.file.update({
            where: { id: file.id },
            data: { uploadStatus: 'uploaded' },
          }),
          prisma.user.update({
            where: { id: file.userId },
            data: { storageUsed: { increment: file.size } },
          }),
        ]);
        console.log(`Reconciled ${file.id}: marked uploaded`);
      } else {
        // Size mismatch — mark failed and clean up S3
        await prisma.file.update({
          where: { id: file.id },
          data: { uploadStatus: 'failed' },
        });
        try { await deleteObject(file.s3Key); } catch { /* ignore */ }
        console.log(`Reconciled ${file.id}: size mismatch, marked failed`);
      }
    } catch {
      // Object doesn't exist — mark failed
      await prisma.file.update({
        where: { id: file.id },
        data: { uploadStatus: 'failed' },
      });
      console.log(`Reconciled ${file.id}: S3 object missing, marked failed`);
    }
  }

  console.log('Reconciliation complete');
}

// Run directly if invoked as a script
const isMain = process.argv[1]?.includes('reconcile');
if (isMain) {
  reconcilePendingUploads()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Reconciliation failed:', err);
      process.exit(1);
    });
}
