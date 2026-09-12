import { db } from '~/db';
import { uploads } from '~/db/schema';
import { desc } from 'drizzle-orm';

export interface RecordUploadInput {
  userId?: string | null;
  fileName: string;
  fileType: string;
  url: string;
  sizeBytes?: number;
}

export async function saveUploadRecord(input: RecordUploadInput) {
  try {
    const [inserted] = await db
      .insert(uploads)
      .values({
        userId: input.userId || null,
        fileName: input.fileName,
        fileType: input.fileType,
        url: input.url,
        sizeBytes: input.sizeBytes || null,
      })
      .returning();
    return inserted;
  } catch (err) {
    console.error('Failed to save upload record to DB:', err);
    return null;
  }
}

export async function fetchRecentUploads(limit: number = 20) {
  try {
    const records = await db
      .select()
      .from(uploads)
      .orderBy(desc(uploads.createdAt))
      .limit(limit);
    return records;
  } catch (err) {
    console.error('Failed to fetch recent uploads from DB:', err);
    return [];
  }
}
