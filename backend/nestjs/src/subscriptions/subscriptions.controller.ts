import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

type CreateCheckoutBody = {
  actor?: string;
  interval?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type SyncCheckoutBody = {
  actor?: string;
  sessionId?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me/status')
  getMyStatus(@Req() request: Request, @Query('actor') actor?: string) {
    return this.subscriptionsService.getTeachingSubscriptionStatusForAuthUser(
      this.getAuthUser(request),
      actor
    );
  }

  @Post('me/checkout')
  createCheckout(@Req() request: Request, @Body() body: CreateCheckoutBody) {
    return this.subscriptionsService.createTeachingSubscriptionCheckoutForAuthUser(
      this.getAuthUser(request),
      {
        actor: body.actor,
        interval: body.interval,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      }
    );
  }

  @Post('me/sync')
  syncCheckout(@Req() request: Request, @Body() body: SyncCheckoutBody) {
    return this.subscriptionsService.syncTeachingSubscriptionCheckoutForAuthUser(
      this.getAuthUser(request),
      {
        actor: body.actor,
        sessionId: body.sessionId,
      }
    );
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
