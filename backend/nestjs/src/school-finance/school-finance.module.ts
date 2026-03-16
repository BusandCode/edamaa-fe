import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminSchoolFinanceController } from './admin-school-finance.controller';
import { SchoolFinanceController } from './school-finance.controller';
import { SchoolFinanceRemindersScheduler } from './school-finance-reminders.scheduler';
import { SchoolFinanceService } from './school-finance.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SchoolFinanceController, AdminSchoolFinanceController],
  providers: [SchoolFinanceService, SchoolFinanceRemindersScheduler, PrismaService, SupabaseAuthGuard],
  exports: [SchoolFinanceService],
})
export class SchoolFinanceModule {}
