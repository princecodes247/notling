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

export const uploadMediaFile = createServerFn({ method: 'POST' })
  .validator((input: UploadMediaInput) => input)
  .handler(async ({ data }: { data: UploadMediaInput }): Promise<UploadMediaOutput> => {
    const { uploadToStorage } = await import('./r2');
    const { saveUploadRecord } = await import('./uploads.db');

    const uploaded = await uploadToStorage(data);
    const recorded = await saveUploadRecord({
      fileName: data.fileName,
      fileType: data.fileType,
      url: uploaded.url,
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
  .validator(() => {})
  .handler(async () => {
    const { fetchRecentUploads } = await import('./uploads.db');
    return fetchRecentUploads(20);
  });
