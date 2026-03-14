import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [ExamsController],
  providers: [ExamsService, SupabaseAuthGuard],
})
export class ExamsModule {}
