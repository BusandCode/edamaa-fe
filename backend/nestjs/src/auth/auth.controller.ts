import {
  Controller,
  Get,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly prisma: PrismaService
  ) {}

  @Get('health')
  health() {
    return {
      provider: 'supabase',
      configured: this.supabaseService.isConfigured(),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        status: 'ok',
        provider: 'supabase',
        configured: this.supabaseService.isConfigured(),
        databaseReady: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Database is unavailable.';
      throw new ServiceUnavailableException({
        status: 'degraded',
        provider: 'supabase',
        configured: this.supabaseService.isConfigured(),
        databaseReady: false,
        message,
      });
    }
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
