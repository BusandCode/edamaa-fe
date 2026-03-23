/**
 * Root application module.
 *
 * This module wires together small feature modules. Keep this file focused on
 * high-level composition — business logic belongs in feature modules.
 */
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma.service';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { InternalAdminModule } from './internal-admin/internal-admin.module';
import { LearningProgressModule } from './learning-progress/learning-progress.module';
import { StudentAnalyticsModule } from './student-analytics/student-analytics.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ResourcesModule } from './resources/resources.module';
import { SchoolFinanceModule } from './school-finance/school-finance.module';
import { SchoolScheduleModule } from './school-schedule/school-schedule.module';
import { AccountRolesModule } from './account-roles/account-roles.module';
import { ExamsModule } from './exams/exams.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { CloudflareRealtimeKitModule } from './cloudflare-realtimekit/cloudflare-realtimekit.module';

@Module({
  // Feature modules are registered here so Nest can compose the app.
  imports: [
    UsersModule,
    WebhooksModule,
    RealtimeModule,
    AuthModule,
    SupabaseModule,
    InternalAdminModule,
    LearningProgressModule,
    StudentAnalyticsModule,
    PaymentsModule,
    SubscriptionsModule,
    ResourcesModule,
    SchoolFinanceModule,
    SchoolScheduleModule,
    AccountRolesModule,
    ExamsModule,
    AssignmentsModule,
    CloudflareRealtimeKitModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
