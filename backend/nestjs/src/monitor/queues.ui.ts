/**
 * Bull Board UI mount
 *
 * Exposes a simple web UI for inspecting BullMQ queues and jobs. This file
 * exports a function that mounts the dashboard onto an Express app instance.
 * Keep this logic separate from the main bootstrap so it can be enabled
 * conditionally in non-production environments if desired.
 */
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { basicAuth } from './basicAuth.middleware';

export function mountQueuesUI(app: any, redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
  const skipRedisConnect = process.env.SKIP_REDIS_CONNECT === '1';
  const disableQueuesUi = process.env.DISABLE_QUEUES_UI === '1';
  if (skipRedisConnect || disableQueuesUi) {
    return false;
  }

  // Create BullMQ Queue instances that correspond to queues used by the app.
  const redis = new IORedis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  const webhooksQueue = new Queue('webhooks', { connection: redis });

  // Create the Express adapter (mount point) and register adapters for
  // each BullMQ queue we want to monitor.
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(webhooksQueue as any)],
    serverAdapter,
  });

  // Mount the UI under /admin/queues and protect it with basic auth.
  // Credentials are read from `QUEUES_UI_USER` and `QUEUES_UI_PASS`.
  app.use('/admin/queues', basicAuth, serverAdapter.getRouter());

  return true;
}
