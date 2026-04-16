import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SchoolLibraryService } from './school-library.service';

@UseGuards(SupabaseAuthGuard)
@Controller('school-library')
export class SchoolLibraryController {
  constructor(private readonly schoolLibraryService: SchoolLibraryService) {}

  @Get()
  listLibraryOverview(@Req() request: Request) {
    return this.schoolLibraryService.listLibraryOverview(this.getAuthUser(request));
  }

  @Post('books')
  createBook(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.schoolLibraryService.createBook(this.getAuthUser(request), body);
  }

  @Patch('books/:bookId')
  updateBook(
    @Req() request: Request,
    @Param('bookId') bookId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.schoolLibraryService.updateBook(this.getAuthUser(request), bookId, body);
  }

  @Post('loans')
  checkoutBook(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.schoolLibraryService.checkoutBook(this.getAuthUser(request), body);
  }

  @Post('loans/:loanId/return')
  returnLoan(
    @Req() request: Request,
    @Param('loanId') loanId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.schoolLibraryService.returnLoan(this.getAuthUser(request), loanId, body);
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
