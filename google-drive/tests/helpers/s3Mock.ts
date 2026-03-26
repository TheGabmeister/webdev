import { vi } from 'vitest';

// Reusable S3 mock helpers for presigned URL generation and object checks
export function createS3Mocks() {
  const headObject = vi.fn().mockResolvedValue({
    ContentLength: 1024,
    ContentType: 'application/octet-stream',
  });

  const deleteObject = vi.fn().mockResolvedValue({});

  const getSignedUrl = vi.fn().mockResolvedValue('https://s3.example.com/presigned-url');

  return {
    headObject,
    deleteObject,
    getSignedUrl,
    reset() {
      headObject.mockReset().mockResolvedValue({
        ContentLength: 1024,
        ContentType: 'application/octet-stream',
      });
      deleteObject.mockReset().mockResolvedValue({});
      getSignedUrl.mockReset().mockResolvedValue('https://s3.example.com/presigned-url');
    },
  };
}
