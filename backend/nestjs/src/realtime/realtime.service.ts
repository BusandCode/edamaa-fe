import { Injectable, Logger, MessageEvent, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import IORedis from 'ioredis';
import { Observable, Subject, filter } from 'rxjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type RealtimeEnvelope = {
  channel: string;
  event: string;
  payload: unknown;
  publishedAt: string;
};

type CallSignalFilters = {
  channel?: string;
  event?: string;
  studentId?: number;
  reasons?: string[];
  limit?: number;
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
  private callSignalPersistenceBackoffUntil = 0;

  constructor(private readonly prisma: PrismaService) {}

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
    const envelope: RealtimeEnvelope = {
      channel,
      event,
      payload,
      publishedAt: new Date().toISOString(),
    };

    // Persist call signaling events for analytics and missed-call recovery.
    void this.persistCallSignalEvent(envelope);

    // Prefer Redis pub/sub when available so messages fan out across instances.
    if (this.redisReady && this.publisher) {
      await this.publisher.publish(channel, JSON.stringify(envelope));
      return envelope;
    }

    // Local dev fallback: keep realtime usable even when Redis is offline.
    this.events$.next({ data: envelope });
    return envelope;
  }

  async listCallSignalEvents(filters: CallSignalFilters) {
    const take = Math.min(Math.max(filters.limit ?? 50, 1), 200);

    const where: Prisma.CallSignalEventWhereInput = {
      channel: filters.channel,
      event: filters.event,
      studentId: filters.studentId,
      reason:
        Array.isArray(filters.reasons) && filters.reasons.length > 0
          ? { in: filters.reasons }
          : undefined,
    };

    try {
      return await this.prisma.callSignalEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      });
    } catch (error) {
      this.logger.warn(`Unable to read persisted call signals (${(error as Error).message})`);
      return [];
    }
  }

  stream(channel?: string): Observable<MessageEvent> {
    if (!channel) {
      return this.events$.asObservable();
    }

    return this.events$.pipe(
      filter((event) => {
        const data = event.data;
        return (
          !!data &&
          typeof data === 'object' &&
          'channel' in data &&
          typeof (data as RealtimeEnvelope).channel === 'string' &&
          (data as RealtimeEnvelope).channel === channel
        );
      })
    );
  }

  status() {
    const usingRedis = this.redisReady;
    return {
      provider: usingRedis ? 'redis' : 'in-memory',
      mode: usingRedis ? 'pubsub' : 'local',
      ok: true,
      redisReady: usingRedis,
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

  private async persistCallSignalEvent(envelope: RealtimeEnvelope) {
    if (Date.now() < this.callSignalPersistenceBackoffUntil) {
      return;
    }

    if (envelope.channel !== 'signal:student-communication') {
      return;
    }

    if (envelope.event !== 'call.start' && envelope.event !== 'call.end') {
      return;
    }

    const payload =
      envelope.payload && typeof envelope.payload === 'object'
        ? (envelope.payload as Record<string, unknown>)
        : null;

    if (!payload) {
      return;
    }

    const eventId = typeof payload.eventId === 'string' ? payload.eventId : null;
    const callId = typeof payload.callId === 'string' ? payload.callId : null;
    const mode = payload.mode === 'video' ? 'video' : payload.mode === 'audio' ? 'audio' : null;
    const reason = typeof payload.reason === 'string' ? payload.reason : null;
    const senderRole = typeof payload.role === 'string' ? payload.role : null;
    const senderLabel = typeof payload.senderLabel === 'string' ? payload.senderLabel : null;
    const studentId = Number(payload.studentId);
    const durationSeconds = Number(payload.durationSeconds);
    const publishedAtDate = new Date(envelope.publishedAt);

    const baseCreateData: Prisma.CallSignalEventCreateInput = {
      eventId,
      channel: envelope.channel,
      event: envelope.event,
      callId,
      studentId: Number.isFinite(studentId) ? studentId : null,
      senderRole,
      senderLabel,
      mode,
      reason,
      durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds)) : null,
      payload: payload as Prisma.InputJsonValue,
      publishedAt: Number.isFinite(publishedAtDate.getTime()) ? publishedAtDate : new Date(),
    };

    try {
      if (eventId) {
        await this.prisma.callSignalEvent.upsert({
          where: { eventId },
          create: baseCreateData,
          update: {},
        });
        return;
      }

      await this.prisma.callSignalEvent.create({
        data: baseCreateData,
      });
    } catch (error) {
      this.callSignalPersistenceBackoffUntil = Date.now() + 60_000;
      this.logger.warn(
        `Call signal persistence paused for 60s after database error (${(error as Error).message})`
      );
    }
  }
}
