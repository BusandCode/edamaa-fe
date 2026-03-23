import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { CloudflareRealtimeKitController } from './cloudflare-realtimekit.controller';
import { CloudflareRealtimeKitService } from './cloudflare-realtimekit.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CloudflareRealtimeKitController],
  providers: [CloudflareRealtimeKitService, PrismaService, SupabaseAuthGuard],
  exports: [CloudflareRealtimeKitService],
})
export class CloudflareRealtimeKitModule {}
