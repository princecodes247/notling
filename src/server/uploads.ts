import { createServerFn } from '@tanstack/react-start';

export interface UploadMediaInput {
  fileName: string;
  fileType: string;
  base64Data: string;
}

export interface UploadMediaOutput {
  url: string;
  key: string;
  id?: string;
  fileName?: string;
  fileType?: string;
  createdAt?: string;
}

const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_UPLOADS_PER_WINDOW = 10;
const MAX_USER_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB total quota per user

const uploadTracker = new Map<string, number[]>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const timestamps = uploadTracker.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < UPLOAD_RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_UPLOADS_PER_WINDOW) {
    throw new Error('Upload rate limit exceeded. You can upload up to 10 files per minute.');
  }

  recent.push(now);
  uploadTracker.set(userId, recent);
}

export const uploadMediaFile = createServerFn({ method: 'POST' })
  .validator((input: UploadMediaInput) => input)
  .handler(async ({ data }: { data: UploadMediaInput }): Promise<UploadMediaOutput> => {
    const { getSessionImpl } = await import('./auth.db');
    const { uploadToStorage } = await import('./r2');
    const { saveUploadRecord, getUserStorageUsage } = await import('./uploads.db');

    // 1. Require Authentication
    let session = null;
    try {
      session = await getSessionImpl();
    } catch { }

    if (!session?.userId) {
      throw new Error('Authentication required to upload files.');
    }

    // 2. Enforce Rate Limit (10 files / minute per user)
    checkRateLimit(session.userId);

    // 3. Enforce User Storage Quota (50 MB max cumulative storage)
    const currentUsage = await getUserStorageUsage(session.userId);
    if (currentUsage >= MAX_USER_STORAGE_BYTES) {
      throw new Error('Workspace storage quota exceeded (50 MB limit reached).');
    }

    // 4. Perform Storage Upload (validates size < 10MB & MIME type)
    const uploaded = await uploadToStorage(data);

    if (currentUsage + uploaded.sizeBytes > MAX_USER_STORAGE_BYTES) {
      throw new Error('Upload cancelled: File would exceed your 50 MB total storage quota.');
    }

    // 5. Record Upload in DB with User ID & Size
    const recorded = await saveUploadRecord({
      userId: session.userId,
      fileName: data.fileName,
      fileType: data.fileType,
      url: uploaded.url,
      sizeBytes: uploaded.sizeBytes,
    });

    return {
      url: uploaded.url,
      key: uploaded.key,
      id: recorded?.id,
      fileName: data.fileName,
      fileType: data.fileType,
      createdAt: recorded?.createdAt ? recorded.createdAt.toISOString() : new Date().toISOString(),
    };
  });

export const getRecentUploads = createServerFn({ method: 'GET' })
  .validator(() => { })
  .handler(async () => {
    const { getSessionImpl } = await import('./auth.db');
    const { fetchRecentUploads } = await import('./uploads.db');

    let session = null;
    try {
      session = await getSessionImpl();
    } catch { }

    return fetchRecentUploads(session?.userId || null, 20);
  });
