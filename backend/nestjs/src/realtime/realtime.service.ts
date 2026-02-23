import { Injectable, Logger, MessageEvent, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import IORedis from 'ioredis';
import { Observable, Subject } from 'rxjs';

type RealtimeEnvelope = {
  channel: string;
  event: string;
  payload: unknown;
  publishedAt: string;
};

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  private readonly skipRedisConnect = process.env.SKIP_REDIS_CONNECT === '1';
  private readonly initTimeoutMs = Number(process.env.REDIS_INIT_TIMEOUT_MS || '4000');
  private publisher: IORedis | null = null;
  private subscriber: IORedis | null = null;
  private redisReady = false;
  private readonly events$ = new Subject<MessageEvent>();

  async onModuleInit() {
    if (this.skipRedisConnect) {
      this.logger.warn('Skipping Redis realtime init (SKIP_REDIS_CONNECT=1)');
      return;
    }

    this.publisher = new IORedis(this.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.subscriber = new IORedis(this.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    try {
      await this.withTimeout(this.publisher.connect(), 'publisher connect');
      await this.withTimeout(this.subscriber.connect(), 'subscriber connect');
      await this.withTimeout(this.subscriber.psubscribe('signal:*'), 'subscriber psubscribe');

      this.subscriber.on('pmessage', (_pattern, channel, message) => {
        let parsed: unknown = message;
        try {
          parsed = JSON.parse(message);
        } catch {
          parsed = { channel, event: 'raw', payload: message, publishedAt: new Date().toISOString() };
        }

        // Nest MessageEvent requires `data` to be string or object.
        const messageData = this.toMessageEventData(parsed);
        this.events$.next({ data: messageData });
        this.logger.debug(`Forwarded realtime message on ${channel}`);
      });

      this.redisReady = true;
    } catch (error) {
      this.logger.warn(`Redis realtime unavailable; continuing without pub/sub (${(error as Error).message})`);
      this.redisReady = false;
      await this.safeQuit(this.subscriber);
      await this.safeQuit(this.publisher);
      this.subscriber = null;
      this.publisher = null;
    }
  }

  async publish(channel: string, event: string, payload: unknown) {
    if (!this.redisReady || !this.publisher) {
      throw new ServiceUnavailableException('Realtime Redis is unavailable');
    }

    const envelope: RealtimeEnvelope = {
      channel,
      event,
      payload,
      publishedAt: new Date().toISOString(),
    };

    await this.publisher.publish(channel, JSON.stringify(envelope));
    return envelope;
  }

  stream(): Observable<MessageEvent> {
    return this.events$.asObservable();
  }

  status() {
    return {
      provider: 'redis',
      mode: 'pubsub',
      ok: this.redisReady,
      skipped: this.skipRedisConnect,
    };
  }

  async onModuleDestroy() {
    await this.safeQuit(this.subscriber);
    await this.safeQuit(this.publisher);
    this.events$.complete();
  }

  private async withTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timed out after ${this.initTimeoutMs}ms`)), this.initTimeoutMs);
    });
    return Promise.race([promise, timeout]);
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

  private toMessageEventData(value: unknown): string | object {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object') {
      return value;
    }

    return String(value);
  }
}
