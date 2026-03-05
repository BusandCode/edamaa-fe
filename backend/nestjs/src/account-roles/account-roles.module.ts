import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AccountRolesController } from './account-roles.controller';
import { AccountRolesService } from './account-roles.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AccountRolesController],
  providers: [AccountRolesService, PrismaService, SupabaseAuthGuard],
  exports: [AccountRolesService],
})
export class AccountRolesModule {}
