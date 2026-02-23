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

  @Sse('stream')
  stream(@Query('channel') channel?: string): Observable<MessageEvent> {
    return this.realtimeService.stream(channel);
  }
}
