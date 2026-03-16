import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SchoolFinanceService } from './school-finance.service';

type UpdateAdminPayoutStatusBody = {
  status?: string;
  failureReason?: string;
  note?: string;
  processedBy?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('admin/school-finance')
export class AdminSchoolFinanceController {
  constructor(private readonly schoolFinanceService: SchoolFinanceService) {}

  @Get('payouts')
  listPayoutQueue(
    @Req() request: Request,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.schoolFinanceService.listPayoutQueueForAdminAuthUser(
      this.getAuthUser(request),
      {
        status,
        search,
        page: typeof page === 'string' && page.trim() ? Number(page) : undefined,
        limit: typeof limit === 'string' && limit.trim() ? Number(limit) : undefined,
      }
    );
  }

  @Post('payouts/:payoutId/status')
  updatePayoutStatus(
    @Req() request: Request,
    @Param('payoutId') payoutId: string,
    @Body() body: UpdateAdminPayoutStatusBody
  ) {
    return this.schoolFinanceService.advancePayoutStatusForAdminAuthUser(
      this.getAuthUser(request),
      {
        payoutId,
        status: body.status,
        failureReason: body.failureReason,
        note: body.note,
        processedBy: body.processedBy,
      }
    );
  }

  @Get('payouts/:payoutId/ledger')
  getPayoutLedger(@Req() request: Request, @Param('payoutId') payoutId: string) {
    return this.schoolFinanceService.getWithdrawalLedgerForAdminAuthUser(
      this.getAuthUser(request),
      payoutId
    );
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
