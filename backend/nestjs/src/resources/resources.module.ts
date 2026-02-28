import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService, SupabaseAuthGuard],
})
export class ResourcesModule {}
