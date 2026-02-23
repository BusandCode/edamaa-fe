/**
 * UsersController
 *
 * Defines HTTP routes for user operations. Controllers should handle request
 * validation and mapping, then delegate to services for business logic.
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users — list users (simple example; add pagination in real app)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // POST /users — create a user. Keep payload minimal for scaffold.
  @Post()
  async create(@Body() body: { email: string; name?: string; role?: string }) {
    const { email, name, role } = body;
    return this.usersService.create({ email, name, role });
  }
}
