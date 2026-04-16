import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CloudflareRealtimeKitService } from './cloudflare-realtimekit.service';

type ResolveSessionBody = {
  sessionId?: string;
  title?: string;
  participantRole?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('cloudflare-realtimekit')
export class CloudflareRealtimeKitController {
  constructor(private readonly cloudflareRealtimeKitService: CloudflareRealtimeKitService) {}

  @Get('status')
  getStatus() {
    return this.cloudflareRealtimeKitService.getStatus();
  }

  @Get('meetings/:sessionId')
  getMeeting(@Param('sessionId') sessionId: string) {
    return this.cloudflareRealtimeKitService.getMeetingMapping(sessionId);
  }

  @Post('session')
  resolveSession(@Req() request: Request, @Body() body: ResolveSessionBody) {
    return this.cloudflareRealtimeKitService.resolveSessionForAuthUser(this.getAuthUser(request), {
      sessionId: body.sessionId,
      title: body.title,
      participantRole: body.participantRole,
    });
  }

  private getAuthUser(request: Request) {
    const authUser = ((request as any).user || null) as
      | {
          id?: string | null;
          email?: string | null;
          user_metadata?: Record<string, unknown> | null;
        }
      | null;

    return {
      id: authUser?.id ?? null,
      email: authUser?.email ?? null,
      name:
        (typeof authUser?.user_metadata?.full_name === 'string' &&
          (authUser?.user_metadata?.full_name as string).trim()) ||
        null,
    };
  }
}
