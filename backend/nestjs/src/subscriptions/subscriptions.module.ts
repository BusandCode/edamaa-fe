import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService, SupabaseAuthGuard],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
