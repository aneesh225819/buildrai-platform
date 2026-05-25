import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

if (!BUCKET_NAME) {
  console.warn('⚠️  AWS_S3_BUCKET_NAME is not set in environment variables');
}

/**
 * Upload a file to S3
 */
export async function uploadFile(
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

/**
 * Upload project files to S3
 */
export async function uploadProjectFiles(
  projectId: string,
  files: { path: string; content: string }[]
): Promise<string[]> {
  const uploadPromises = files.map(async (file) => {
    const key = `projects/${projectId}/${file.path}`;
    return uploadFile(key, file.content, getContentType(file.path));
  });

  return Promise.all(uploadPromises);
}

/**
 * Get a file from S3
 */
export async function getFile(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body?.transformToString() || '';
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Delete all files for a project
 */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  const prefix = `projects/${projectId}/`;

  // List all objects with the prefix
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const listResponse = await s3Client.send(listCommand);

  if (!listResponse.Contents || listResponse.Contents.length === 0) {
    return;
  }

  // Delete all objects
  const deletePromises = listResponse.Contents.map((object) => {
    if (object.Key) {
      return deleteFile(object.Key);
    }
  });

  await Promise.all(deletePromises);
}

/**
 * Generate a presigned URL for temporary access
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload project export (ZIP file)
 */
export async function uploadProjectExport(
  projectId: string,
  zipBuffer: Buffer
): Promise<{ url: string; key: string }> {
  const key = `exports/${projectId}/export-${Date.now()}.zip`;
  const url = await uploadFile(key, zipBuffer, 'application/zip');

  return { url, key };
}

/**
 * Helper: Get content type from file extension
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    js: 'application/javascript',
    jsx: 'application/javascript',
    ts: 'application/typescript',
    tsx: 'application/typescript',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    md: 'text/markdown',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

export default s3Client;
