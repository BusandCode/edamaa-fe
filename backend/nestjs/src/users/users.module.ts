/**
 * UsersModule
 *
 * Feature module responsible for user-related API endpoints. Keep user
 * functionality encapsulated so it can be extended (auth, profile, roles)
 * without affecting other modules.
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, SupabaseAuthGuard],
})
export class UsersModule {}
