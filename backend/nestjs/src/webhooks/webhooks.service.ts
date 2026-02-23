/**
 * WebhooksService
 *
 * Minimal service for handling webhook payloads. In production, this service
 * should verify signatures (Stripe, Mux), persist events, and enqueue any
 * heavy work to background jobs.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Stripe from 'stripe';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma.service';

/**
 * WebhooksService
 *
 * Verifies and handles webhook payloads. For Stripe we validate the
 * signature and for Mux we should similarly validate its signature. Events
 * are persisted via Prisma and enqueued for background processing with
 * BullMQ so the HTTP response is fast and idempotent.
 */
@Injectable()
export class WebhooksService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly stripe: Stripe;
  private readonly skipQueueConnect = process.env.SKIP_QUEUE_CONNECT === '1' || process.env.SKIP_REDIS_CONNECT === '1';
  private readonly queueName = 'webhooks';
  private queue: Queue | null = null;
  private redis: IORedis | null = null;

  constructor(private readonly prisma: PrismaService) {
    // Initialize Stripe client for server-side operations. We only use the
    // webhook secret below so public key is not strictly required here.
    this.stripe = new Stripe(process.env.STRIPE_API_KEY || 'sk_test_placeholder', { apiVersion: '2022-11-15' });

    if (this.skipQueueConnect) {
      this.logger.warn('Skipping webhook queue init (SKIP_QUEUE_CONNECT=1 or SKIP_REDIS_CONNECT=1)');
      return;
    }

    // Keep queue wiring strict but fail-fast: we do not want endless reconnect
    // noise when Redis is intentionally unavailable in local smoke runs.
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new IORedis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.queue = new Queue(this.queueName, { connection: this.redis });
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
    }

    await this.safeQuit(this.redis);
  }

  /**
   * Handle a Stripe event using raw body and signature verification.
   * Persist the event and enqueue a background job for processing.
   */
  async handleStripeEvent(rawBody: Buffer | string, signature?: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured; skipping verification');
    }

    try {
      // Construct the Stripe Event object using the raw request body and the
      // signature header. This ensures the payload is authentic.
      const bodyText = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const event = webhookSecret
        ? this.stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret)
        : JSON.parse(bodyText);

      // Persist a copy of the event for auditing and retry safety. Capture
      // the database id so background workers can reference the record and
      // mark it processed after handling.
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: 'stripe',
          eventType: (event as any)?.type || '',
          signature: signature || '',
          payload: event as any,
        },
      });

      const queued = await this.enqueueEvent('stripe-event', {
        event,
        webhookEventId: created.id,
      });

      if (queued) {
        this.logger.log(`Enqueued Stripe event id=${created.id} type=${(event as any)?.type}`);
      }

      return { received: true, webhookEventId: created.id, queued };
    } catch (err: any) {
      this.logger.error('Error handling Stripe webhook', err?.message || err);
      throw err;
    }
  }

  /**
   * Handle a Mux event: persist and enqueue for processing. Signature
   * verification should be added similarly using Mux webhook secret.
   */
  async handleMuxEvent(payload: any, signature?: string) {
    try {
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: 'mux',
          eventType: payload?.type || '',
          signature: signature || '',
          payload,
        },
      });

      const queued = await this.enqueueEvent('mux-event', {
        payload,
        webhookEventId: created.id,
      });

      if (queued) {
        this.logger.log(`Enqueued Mux event id=${created.id} type=${payload?.type}`);
      }

      return { received: true, webhookEventId: created.id, queued };
    } catch (err: any) {
      this.logger.error('Error handling Mux webhook', err?.message || err);
      throw err;
    }
  }

  private async enqueueEvent(name: string, payload: Record<string, unknown>) {
    if (!this.queue) {
      if (this.skipQueueConnect) {
        // Local smoke mode intentionally disables Redis-backed jobs.
        this.logger.warn(`Queue disabled; skipping ${name} enqueue`);
        return false;
      }
      throw new Error('Webhook queue is unavailable');
    }

    await this.queue.add(name, payload, {
      attempts: 3,
      removeOnComplete: 100,
      removeOnFail: 1000,
    });
    return true;
  }

  private async safeQuit(client: IORedis | null) {
    if (!client) {
      return;
    }

    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}
