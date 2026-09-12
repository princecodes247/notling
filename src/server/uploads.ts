import { createServerFn } from '@tanstack/react-start';

export interface UploadMediaInput {
  fileName: string;
  fileType: string;
  base64Data: string;
}

export interface UploadMediaOutput {
  url: string;
  key: string;
}

export const uploadMediaFile = createServerFn({ method: 'POST' })
  .validator((input: UploadMediaInput) => input)
  .handler(async ({ data }: { data: UploadMediaInput }): Promise<UploadMediaOutput> => {
    const { uploadToStorage } = await import('./r2');
    return uploadToStorage(data);
  });
