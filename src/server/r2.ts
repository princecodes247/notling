import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';
import path from 'node:path';

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

export const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.php', '.py', '.js', '.mjs',
  '.cjs', '.html', '.htm', '.svg', '.vbs', '.scr', '.com', '.msi', '.apk',
]);

export function isFileTypeAllowed(mimeType: string, fileName: string): { allowed: boolean; reason?: string } {
  const cleanMime = (mimeType || '').split(';')[0].trim().toLowerCase();
  const ext = path.extname(fileName || '').toLowerCase();

  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: `File extension ${ext} is blocked for security.` };
  }

  if (
    cleanMime.startsWith('image/') ||
    cleanMime.startsWith('video/') ||
    cleanMime.startsWith('audio/') ||
    cleanMime === 'application/pdf' ||
    cleanMime.startsWith('text/') ||
    cleanMime.includes('json') ||
    cleanMime.includes('zip') ||
    cleanMime.includes('document') ||
    cleanMime.includes('sheet')
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: `File type '${cleanMime || 'unknown'}' is not supported.` };
}

export async function uploadToStorage(input: {
  fileName: string;
  fileType: string;
  base64Data: string;
}): Promise<{ url: string; key: string; sizeBytes: number }> {
  const { fileName, fileType, base64Data } = input;

  // 1. Validate file type security
  const typeCheck = isFileTypeAllowed(fileType, fileName);
  if (!typeCheck.allowed) {
    throw new Error(typeCheck.reason || 'File type not allowed.');
  }

  // 2. Decode and check size
  const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`);
  }

  // Sanitize file extension and key name
  const rawExt = path.extname(fileName) || getExtensionFromMime(fileType);
  const extension = rawExt.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
  const randomId = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now();
  const fileKey = `uploads/${timestamp}-${randomId}${extension}`;

  const r2Client = getR2Client();
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (r2Client && bucketName) {
    // Upload to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: fileType || 'application/octet-stream',
    });

    await r2Client.send(command);

    const baseUrl = publicDomain
      ? publicDomain.replace(/\/$/, '')
      : `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.dev`;

    const finalUrl = `${baseUrl}/${fileKey}`;

    return {
      url: finalUrl,
      key: fileKey,
      sizeBytes: buffer.length,
    };
  } else {
    // Fallback to local server disk storage inside /public/uploads
    const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }

    const localFileName = `${timestamp}-${randomId}${extension}`;
    const localFilePath = path.join(publicUploadsDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);

    return {
      url: `/uploads/${localFileName}`,
      key: localFileName,
      sizeBytes: buffer.length,
    };
  }
}

function getExtensionFromMime(mime: string): string {
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('mp3')) return '.mp3';
  if (mime.includes('pdf')) return '.pdf';
  return '.bin';
}
