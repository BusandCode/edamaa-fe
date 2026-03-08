/**
 * WebhooksModule
 *
 * Groups webhook controllers and services. Webhooks often have different
 * security and throughput characteristics than regular APIs, so keep them
 * grouped and small for clarity and testing.
 */
import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma.service';
import { SchoolFinanceModule } from '../school-finance/school-finance.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SchoolFinanceModule, PaymentsModule, SubscriptionsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
})
export class WebhooksModule {}
