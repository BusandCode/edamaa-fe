import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { InternalTokenGuard } from '../internal-admin/internal-token.guard';
import { LearningProgressModule } from '../learning-progress/learning-progress.module';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { StudentAnalyticsController } from './student-analytics.controller';
import { StudentAnalyticsService } from './student-analytics.service';

@Module({
  imports: [LearningProgressModule, SupabaseModule],
  controllers: [StudentAnalyticsController],
  providers: [StudentAnalyticsService, PrismaService, SupabaseAuthGuard, InternalTokenGuard],
})
export class StudentAnalyticsModule {}
