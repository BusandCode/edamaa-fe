/**
 * WebhooksModule
 *
 * Groups webhook controllers and services. Webhooks often have different
 * security and throughput characteristics than regular APIs, so keep them
 * grouped and small for clarity and testing.
 */
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
})
export class WebhooksModule {}
