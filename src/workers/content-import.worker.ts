import { Worker, type Job } from 'bullmq';
import { getBullMqConnectionOptions } from '../config/redis.js';
import { CONTENT_IMPORT_CONCURRENCY } from '../constants/content-import.js';
import {
  CONTENT_IMPORT_QUEUE,
  type ContentImportJobData,
} from '../queues/content-import.queue.js';
import { processImportJob } from '../services/content-import.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('content-import-worker');

export function createContentImportWorker(concurrency = CONTENT_IMPORT_CONCURRENCY): Worker {
  const worker = new Worker<ContentImportJobData>(
    CONTENT_IMPORT_QUEUE,
    async (job: Job<ContentImportJobData>) => {
      logger.info('Processing content import job', {
        bullJobId: job.id,
        importJobId: job.data.jobId,
        sourceType: job.data.sourceType,
      });
      await processImportJob(job.data);
    },
    {
      connection: getBullMqConnectionOptions(),
      concurrency,
    },
  );

  worker.on('failed', (job, error) => {
    logger.error('Content import job failed', {
      bullJobId: job?.id,
      importJobId: job?.data.jobId,
      error: error.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Content import job completed', {
      bullJobId: job.id,
      importJobId: job.data.jobId,
    });
  });

  return worker;
}
