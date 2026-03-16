/**
 * UsersController
 *
 * Defines HTTP routes for user operations. Controllers should handle request
 * validation and mapping, then delegate to services for business logic.
 */
import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users — list users (simple example; add pagination in real app)
  @Get()
  async findAll(@Req() request: Request) {
    return this.usersService.findAllForAuthUser(this.getAuthUser(request));
  }

  // GET /users/directory/tutors — school/admin tutor list
  @Get('directory/tutors')
  async listTutorDirectory(@Req() request: Request, @Query('search') search?: string) {
    return this.usersService.listTutorDirectoryForAuthUser(this.getAuthUser(request), {
      search,
    });
  }

  // POST /users — create a user. Keep payload minimal for scaffold.
  @Post()
  async create(@Body() body: { email: string; name?: string; role?: string }) {
    const { email, name, role } = body;
    return this.usersService.create({ email, name, role });
  }

  private getAuthUser(request: Request) {
    const authUser = ((request as any).user || null) as
      | {
          id?: string | null;
          email?: string | null;
          role?: string | null;
          app_metadata?: Record<string, unknown> | null;
          user_metadata?: Record<string, unknown> | null;
        }
      | null;

    const metadataRoleCandidates = [
      authUser?.role,
      this.readString(authUser?.app_metadata?.role),
      this.readString(authUser?.user_metadata?.role),
      this.readString(authUser?.user_metadata?.account_role),
      this.readString(authUser?.user_metadata?.user_type),
      this.readString(authUser?.app_metadata?.user_type),
      this.readArrayFirstString(authUser?.app_metadata?.roles),
      this.readArrayFirstString(authUser?.user_metadata?.roles),
    ];

    const resolvedRole =
      metadataRoleCandidates.find(
        (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
      ) || null;

    return {
      id: authUser?.id ?? null,
      email: authUser?.email ?? null,
      name:
        (typeof authUser?.user_metadata?.full_name === 'string' &&
          (authUser?.user_metadata?.full_name as string).trim()) ||
        null,
      role: resolvedRole,
    };
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private readArrayFirstString(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      return '';
    }
    const first = value[0];
    return typeof first === 'string' ? first : '';
  }
}
