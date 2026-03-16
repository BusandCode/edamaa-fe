import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SchoolScheduleController } from './school-schedule.controller';
import { SchoolScheduleService } from './school-schedule.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SchoolScheduleController],
  providers: [SchoolScheduleService, PrismaService, SupabaseAuthGuard],
})
export class SchoolScheduleModule {}
