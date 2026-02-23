import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Get('health')
  health() {
    return {
      provider: 'supabase',
      configured: this.supabaseService.isConfigured(),
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() request: Request) {
    return {
      provider: 'supabase',
      user: (request as any).user || null,
    };
  }
}
