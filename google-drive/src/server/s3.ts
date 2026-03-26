import { S3Client, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export function getBucket(): string {
  return env.S3_BUCKET_NAME;
}

export async function getPresignedPutUrl(key: string, contentType: string, contentLength: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function getPresignedGetUrl(key: string, disposition: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ResponseContentDisposition: disposition,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function headObject(key: string) {
  const command = new HeadObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return s3Client.send(command);
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return s3Client.send(command);
}
