/**
 * Worker process for processing queued webhook events.
 *
 * This standalone script consumes BullMQ jobs enqueued by the WebhooksService
 * and performs the actual business processing (placeholder implementation).
 *
 * Run locally with: `ts-node src/worker/worker.ts` or use the npm script
 * `npm run worker`.
 */
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { loadBackendEnv } from '../config/load-env';

loadBackendEnv();

// Use REDIS_URL env var in production; fall back to localhost in dev.
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const prisma = new PrismaClient();
type QueueJob = {
  id?: string | number;
  name: string;
  data: Record<string, any>;
};

// Create a BullMQ worker that listens to the 'webhooks' queue.
const worker = new Worker(
  'webhooks',
  async (job: QueueJob) => {
    console.log('Worker processing job', job.name, 'id', job.id);
    try {
      if (job.name === 'stripe-event') {
        const { event, webhookEventId } = job.data;
        // Placeholder: do business processing for Stripe events.
        console.log('Processing Stripe event:', event?.type || '<unknown>');

        // Example: mark the persisted webhook event as processed.
        if (webhookEventId) {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: { processed: true },
          });
        }
      } else if (job.name === 'mux-event') {
        const { payload, webhookEventId } = job.data;
        console.log('Processing Mux event:', payload?.type || '<unknown>');
        // Placeholder: process media event, update media records, etc.
        if (webhookEventId) {
          await prisma.webhookEvent.update({
            where: { id: webhookEventId },
            data: { processed: true },
          });
        }
      } else {
        console.log('Unknown job type:', job.name);
      }
    } catch (err: any) {
      console.error('Error processing job', job.name, err);
      throw err;
    }
  },
  { connection }
);

worker.on('completed', (job: QueueJob) => {
  console.log('Job completed', job?.id, job?.name);
});

worker.on('failed', (job: QueueJob, err: unknown) => {
  console.error('Job failed', job?.id, job?.name, err);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('Worker started, listening for jobs on `webhooks` queue');
