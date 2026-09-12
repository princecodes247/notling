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

export async function uploadToStorage(input: {
  fileName: string;
  fileType: string;
  base64Data: string;
}): Promise<{ url: string; key: string }> {
  const { fileName, fileType, base64Data } = input;

  // Clean base64 string
  const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  const extension = path.extname(fileName) || getExtensionFromMime(fileType);
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
