import { db } from '~/db';
import { uploads } from '~/db/schema';
import { desc, eq, sum } from 'drizzle-orm';

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

export async function getUserStorageUsage(userId: string): Promise<number> {
  try {
    const result = await db
      .select({ total: sum(uploads.sizeBytes) })
      .from(uploads)
      .where(eq(uploads.userId, userId));
    const totalBytes = result[0]?.total ? Number(result[0].total) : 0;
    return totalBytes;
  } catch (err) {
    console.error('Failed to query user storage usage:', err);
    return 0;
  }
}

export async function fetchRecentUploads(userId?: string | null, limit: number = 20) {
  try {
    if (userId) {
      return await db
        .select()
        .from(uploads)
        .where(eq(uploads.userId, userId))
        .orderBy(desc(uploads.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(uploads)
      .orderBy(desc(uploads.createdAt))
      .limit(limit);
  } catch (err) {
    console.error('Failed to fetch recent uploads from DB:', err);
    return [];
  }
}
