import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, SupabaseAuthGuard, PrismaService],
})
export class AssignmentsModule {}
