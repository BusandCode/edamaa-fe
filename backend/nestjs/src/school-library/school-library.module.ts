import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { SchoolLibraryController } from './school-library.controller';
import { SchoolLibraryService } from './school-library.service';

@Module({
  imports: [SupabaseModule],
  controllers: [SchoolLibraryController],
  providers: [SchoolLibraryService, SupabaseAuthGuard],
  exports: [SchoolLibraryService],
})
export class SchoolLibraryModule {}
