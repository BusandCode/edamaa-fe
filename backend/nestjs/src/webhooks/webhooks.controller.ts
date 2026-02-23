/**
 * WebhooksController
 *
 * Exposes endpoints for external webhook providers. Keep handlers minimal and
 * idempotent — webhooks may be retried. Always verify provider signatures
 * before taking sensitive actions.
 */
import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // POST /webhooks/stripe
  // Note: Stripe requires the raw request body (exact bytes) to verify
  // signatures. We configured express.raw() for this route in main.ts so
  // `req.body` will be a Buffer containing the raw payload.
  @Post('stripe')
  async stripe(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    const body = (req as any).body;
    const rawBody = Buffer.isBuffer(body) ? body : typeof body === 'string' ? body : JSON.stringify(body || {});
    return this.webhooksService.handleStripeEvent(rawBody, signature);
  }

  // POST /webhooks/mux
  // Mux signature verification is similar; for the scaffold we accept JSON
  // and enqueue the payload for background processing.
  @Post('mux')
  async mux(@Body() body: any, @Headers('mux-signature') signature: string) {
    return this.webhooksService.handleMuxEvent(body, signature);
  }
}
