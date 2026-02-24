import { Body, Controller, Get, MessageEvent, Post, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';

type PublishBody = {
  channel?: string;
  event?: string;
  payload?: unknown;
};

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('health')
  health() {
    return this.realtimeService.status();
  }

  @Post('signal')
  async publish(@Body() body: PublishBody) {
    const channel = body.channel || 'signal:global';
    const event = body.event || 'broadcast';
    return this.realtimeService.publish(channel, event, body.payload ?? null);
  }

  @Get('call-events')
  async callEvents(
    @Query('channel') channel?: string,
    @Query('event') event?: string,
    @Query('studentId') studentId?: string,
    @Query('reason') reason?: string | string[],
    @Query('limit') limit?: string
  ) {
    const studentIdNumber = Number(studentId);
    const parsedLimit = Number(limit);
    const reasons = Array.isArray(reason) ? reason : reason ? [reason] : undefined;

    const items = await this.realtimeService.listCallSignalEvents({
      channel,
      event,
      studentId: Number.isFinite(studentIdNumber) ? studentIdNumber : undefined,
      reasons,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });

    return {
      items,
      count: items.length,
    };
  }

  @Sse('stream')
  stream(@Query('channel') channel?: string): Observable<MessageEvent> {
    return this.realtimeService.stream(channel);
  }
}
