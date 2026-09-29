import { Queue, Worker, Job } from 'bullmq';
import { db } from '~/db';
import { databaseProperties, databaseItems, pages, databases } from '~/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { invalidateDatabaseCaches } from '~/server/databases.db';

export interface ImportMappingItem {
  columnName: string;
  targetPropertyId: string;
  newPropertyName?: string;
  newPropertyType?: string;
}

export interface ImportJobData {
  databaseId: string;
  mappings: ImportMappingItem[];
  rows: Array<Record<string, any>>;
}

export interface ImportJobProgress {
  processedRows: number;
  totalRows: number;
  currentChunk: number;
  totalChunks: number;
}

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisConnectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const QUEUE_NAME = 'database-import-queue';

let importQueueInstance: Queue<ImportJobData, any, string> | null = null;
let importWorkerInstance: Worker<ImportJobData, any, string> | null = null;

export function getImportQueue(): Queue<ImportJobData, any, string> {
  if (!importQueueInstance) {
    importQueueInstance = new Queue<ImportJobData, any, string>(QUEUE_NAME, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600, // keep completed jobs for 1 hour for status polling
          count: 500,
        },
        removeOnFail: {
          age: 86400, // keep failed jobs for 24 hours
          count: 500,
        },
      },
    });
  }
  return importQueueInstance;
}

/**
 * Worker processor for large database imports
 */
async function processImportJob(job: Job<ImportJobData, any, string>) {
  const { databaseId, mappings, rows } = job.data;

  // 1. Verify database exists
  const [database] = await db
    .select()
    .from(databases)
    .where(eq(databases.id, databaseId))
    .limit(1);

  if (!database) {
    throw new Error(`Database ${databaseId} not found`);
  }

  // 2. Create any missing new properties
  const newPropertyMappings = mappings.filter(
    (m) => m.targetPropertyId === '__NEW__' && m.newPropertyName?.trim()
  );

  if (newPropertyMappings.length > 0) {
    const existingProps = await db
      .select()
      .from(databaseProperties)
      .where(eq(databaseProperties.databaseId, databaseId));

    const existingNames = new Set(existingProps.map((p) => p.name.trim().toLowerCase()));
    let maxOrder = existingProps.reduce((max, p) => Math.max(max, p.order), -1);

    for (const mapping of newPropertyMappings) {
      const propName = mapping.newPropertyName!.trim();
      if (!existingNames.has(propName.toLowerCase())) {
        maxOrder++;
        await db.insert(databaseProperties).values({
          id: randomUUID(),
          databaseId,
          name: propName,
          type: (mapping.newPropertyType as any) || 'text',
          order: maxOrder,
        });
        existingNames.add(propName.toLowerCase());
      }
    }
  }

  // 3. Load latest database properties to build column map
  const allCurrentProps = await db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, databaseId))
    .orderBy(databaseProperties.order);

  const titleProp = allCurrentProps.find((p) => p.type === 'title');
  const propByName = new Map(allCurrentProps.map((p) => [p.name.trim().toLowerCase(), p]));
  const propById = new Map(allCurrentProps.map((p) => [p.id, p]));

  const colToPropMap: Record<string, { propertyId: string; type: string; isTitle: boolean }> = {};
  for (const mapping of mappings) {
    const { columnName, targetPropertyId, newPropertyName } = mapping;
    if (!targetPropertyId || targetPropertyId === '__SKIP__') continue;

    if (targetPropertyId === '__TITLE__') {
      colToPropMap[columnName] = {
        propertyId: titleProp ? titleProp.id : '__TITLE__',
        type: 'title',
        isTitle: true,
      };
    } else if (targetPropertyId === '__NEW__') {
      const propName = (newPropertyName || columnName).trim().toLowerCase();
      const createdProp = propByName.get(propName);
      if (createdProp) {
        colToPropMap[columnName] = {
          propertyId: createdProp.id,
          type: createdProp.type,
          isTitle: createdProp.type === 'title',
        };
      }
    } else {
      const existingProp = propById.get(targetPropertyId);
      if (existingProp) {
        colToPropMap[columnName] = {
          propertyId: existingProp.id,
          type: existingProp.type,
          isTitle: existingProp.type === 'title',
        };
      }
    }
  }

  // 4. Determine item starting order
  const [lastItem] = await db
    .select({ order: databaseItems.order })
    .from(databaseItems)
    .where(eq(databaseItems.databaseId, databaseId))
    .orderBy(desc(databaseItems.order))
    .limit(1);
  let itemOrder = (lastItem?.order ?? -1) + 1;

  const TRANSACTION_BATCH_SIZE = 500;
  const totalRows = rows.length;
  const totalChunks = Math.max(1, Math.ceil(totalRows / TRANSACTION_BATCH_SIZE));

  // Initial Progress State
  await job.updateProgress({
    processedRows: 0,
    totalRows,
    currentChunk: 0,
    totalChunks,
  });

  // 5. Batch insert items in SQL transactions
  for (let i = 0; i < totalRows; i += TRANSACTION_BATCH_SIZE) {
    const chunk = rows.slice(i, i + TRANSACTION_BATCH_SIZE);
    const chunkIdx = Math.floor(i / TRANSACTION_BATCH_SIZE);

    const pagesToInsert: Array<{
      id: string;
      workspaceId: string;
      parentId: string | null;
      title: string;
      icon: null;
      visibility: 'workspace';
      order: number;
    }> = [];

    const itemsToInsert: Array<{
      id: string;
      databaseId: string;
      pageId: string;
      title: string;
      properties: Record<string, any>;
      order: number;
    }> = [];

    for (const row of chunk) {
      let rowTitle = '';
      const properties: Record<string, any> = {};

      for (const [colName, mapInfo] of Object.entries(colToPropMap)) {
        const rawValue = row[colName];
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          continue;
        }

        if (mapInfo.isTitle) {
          rowTitle = String(rawValue).trim();
          if (mapInfo.propertyId && mapInfo.propertyId !== '__TITLE__') {
            properties[mapInfo.propertyId] = rowTitle;
          }
          continue;
        }

        // Format property values by type
        let formattedValue: any = rawValue;
        if (mapInfo.type === 'number') {
          const num = Number(String(rawValue).replace(/[\$,%]/g, ''));
          formattedValue = !isNaN(num) ? num : null;
        } else if (mapInfo.type === 'checkbox') {
          const lower = String(rawValue).toLowerCase().trim();
          formattedValue = ['true', 'yes', '1', '✓'].includes(lower);
        } else if (mapInfo.type === 'multi_select') {
          if (Array.isArray(rawValue)) {
            formattedValue = rawValue.map((v) => String(v).trim()).filter(Boolean);
          } else {
            formattedValue = String(rawValue)
              .split(/[,;]/)
              .map((v) => v.trim())
              .filter(Boolean);
          }
        } else if (mapInfo.type === 'select') {
          formattedValue = String(rawValue).trim();
        } else if (mapInfo.type === 'date') {
          const parsedDate = new Date(rawValue);
          formattedValue = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : String(rawValue).trim();
        } else {
          formattedValue = String(rawValue).trim();
        }

        properties[mapInfo.propertyId] = formattedValue;
      }

      const itemId = randomUUID();
      const pageId = randomUUID();
      const finalTitle = rowTitle || 'Untitled';

      pagesToInsert.push({
        id: pageId,
        workspaceId: database.workspaceId,
        parentId: database.pageId || null,
        title: finalTitle,
        icon: null,
        visibility: 'workspace',
        order: itemOrder,
      });

      itemsToInsert.push({
        id: itemId,
        databaseId,
        pageId,
        title: finalTitle,
        properties,
        order: itemOrder,
      });

      itemOrder++;
    }

    if (pagesToInsert.length > 0 && itemsToInsert.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(pages).values(pagesToInsert);
        await tx.insert(databaseItems).values(itemsToInsert);
      });
    }

    const processedRows = Math.min(totalRows, i + chunk.length);
    await job.updateProgress({
      processedRows,
      totalRows,
      currentChunk: chunkIdx + 1,
      totalChunks,
    });
  }

  // 6. Invalidate caches
  await invalidateDatabaseCaches(databaseId, database.workspaceId, database.pageId).catch(() => {});

  return {
    success: true,
    totalRows,
    databaseId,
  };
}

export function initImportWorker(): Worker<ImportJobData, any, string> {
  if (!importWorkerInstance) {
    importWorkerInstance = new Worker<ImportJobData, any, string>(
      QUEUE_NAME,
      processImportJob,
      {
        connection: redisConnectionOptions,
        concurrency: 2,
      }
    );

    importWorkerInstance.on('completed', (job) => {
      console.log(`[BullMQ] Import job ${job.id} completed (${job.data.rows.length} rows)`);
    });

    importWorkerInstance.on('failed', (job, err) => {
      console.error(`[BullMQ] Import job ${job?.id} failed:`, err.message);
    });
  }

  return importWorkerInstance;
}

// Auto-initialize worker in Node/Bun server context
if (typeof window === 'undefined') {
  try {
    initImportWorker();
  } catch (err: any) {
    console.warn('[BullMQ] Could not initialize background worker:', err.message);
  }
}

/**
 * Enqueue a new database import job
 */
export async function enqueueImportJob(data: ImportJobData): Promise<{ jobId: string }> {
  const queue = getImportQueue();
  const job = await queue.add('import-data', data);
  return { jobId: job.id! };
}

/**
 * Get current progress & status of an import job
 */
export async function getImportJobStatus(jobId: string): Promise<{
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: ImportJobProgress;
  result?: any;
  error?: string;
}> {
  const queue = getImportQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return {
      status: 'unknown',
      progress: { processedRows: 0, totalRows: 0, currentChunk: 0, totalChunks: 0 },
      error: 'Job not found',
    };
  }

  const state = await job.getState();
  const progress = (job.progress as ImportJobProgress) || {
    processedRows: 0,
    totalRows: job.data.rows.length,
    currentChunk: 0,
    totalChunks: Math.ceil(job.data.rows.length / 500),
  };

  return {
    status: state as any,
    progress,
    result: job.returnvalue,
    error: job.failedReason,
  };
}
