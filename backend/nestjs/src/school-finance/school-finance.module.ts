import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SchoolFinanceController } from './school-finance.controller';
import { SchoolFinanceService } from './school-finance.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SchoolFinanceController],
  providers: [SchoolFinanceService, PrismaService, SupabaseAuthGuard],
  exports: [SchoolFinanceService],
})
export class SchoolFinanceModule {}
