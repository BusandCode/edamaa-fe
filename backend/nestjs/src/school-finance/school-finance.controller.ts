import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SchoolFinanceService } from './school-finance.service';

type CreateFeePlanBody = {
  title?: string;
  description?: string;
  amount?: number;
  dueDays?: number | null;
};

type CreateInvoiceBody = {
  feePlanId?: string;
  title?: string;
  description?: string;
  amount?: number;
  studentEmail?: string;
  studentName?: string;
  dueDate?: string | null;
};

type PayInvoiceBody = {
  successUrl?: string;
  cancelUrl?: string;
};

type SyncInvoiceCheckoutBody = {
  checkoutSessionId?: string;
};

type UpdateWithdrawalStatusBody = {
  status?: string;
  failureReason?: string;
  note?: string;
};

type CreateWithdrawalBody = {
  amount?: number;
};

@UseGuards(SupabaseAuthGuard)
@Controller('school-finance')
export class SchoolFinanceController {
  constructor(private readonly schoolFinanceService: SchoolFinanceService) {}

  @Get('me/dashboard')
  getMyDashboard(@Req() request: Request) {
    return this.schoolFinanceService.getSchoolDashboardForAuthUser(this.getAuthUser(request));
  }

  @Post('me/fee-plans')
  createFeePlan(@Req() request: Request, @Body() body: CreateFeePlanBody) {
    return this.schoolFinanceService.createFeePlanForAuthUser(this.getAuthUser(request), {
      title: body.title,
      description: body.description,
      amount: body.amount,
      dueDays: body.dueDays,
    });
  }

  @Get('me/invoices')
  listMyInvoices(@Req() request: Request, @Query('status') status?: string) {
    return this.schoolFinanceService.listSchoolInvoicesForAuthUser(this.getAuthUser(request), {
      status,
    });
  }

  @Post('me/invoices')
  createInvoice(@Req() request: Request, @Body() body: CreateInvoiceBody) {
    return this.schoolFinanceService.createInvoiceForAuthUser(this.getAuthUser(request), {
      feePlanId: body.feePlanId,
      title: body.title,
      description: body.description,
      amount: body.amount,
      studentEmail: body.studentEmail,
      studentName: body.studentName,
      dueDate: body.dueDate,
    });
  }

  @Get('invoices/me')
  listMyStudentInvoices(@Req() request: Request) {
    return this.schoolFinanceService.listStudentInvoicesForAuthUser(this.getAuthUser(request));
  }

  @Post('invoices/:invoiceId/pay')
  payInvoice(
    @Req() request: Request,
    @Param('invoiceId') invoiceId: string,
    @Body() body: PayInvoiceBody
  ) {
    return this.schoolFinanceService.payInvoiceForAuthUser(this.getAuthUser(request), {
      invoiceId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });
  }

  @Post('invoices/payments/sync')
  syncInvoiceCheckout(@Req() request: Request, @Body() body: SyncInvoiceCheckoutBody) {
    return this.schoolFinanceService.syncInvoiceCheckoutForAuthUser(this.getAuthUser(request), {
      checkoutSessionId: body.checkoutSessionId,
    });
  }

  @Get('invoices/payments/:checkoutSessionId/status')
  getInvoiceCheckoutStatus(@Req() request: Request, @Param('checkoutSessionId') checkoutSessionId: string) {
    return this.schoolFinanceService.getInvoiceCheckoutStatusForAuthUser(
      this.getAuthUser(request),
      checkoutSessionId
    );
  }

  @Get('me/withdrawals')
  listWithdrawals(@Req() request: Request) {
    return this.schoolFinanceService.listWithdrawalsForAuthUser(this.getAuthUser(request));
  }

  @Post('me/withdrawals')
  createWithdrawal(@Req() request: Request, @Body() body: CreateWithdrawalBody) {
    return this.schoolFinanceService.createWithdrawalForAuthUser(this.getAuthUser(request), {
      amount: body.amount,
    });
  }

  @Post('me/withdrawals/:payoutId/status')
  updateWithdrawalStatus(
    @Req() request: Request,
    @Param('payoutId') payoutId: string,
    @Body() body: UpdateWithdrawalStatusBody
  ) {
    return this.schoolFinanceService.advanceWithdrawalStatusForAuthUser(this.getAuthUser(request), {
      payoutId,
      status: body.status,
      failureReason: body.failureReason,
      note: body.note,
    });
  }

  @Get('me/withdrawals/:payoutId/ledger')
  getWithdrawalLedger(@Req() request: Request, @Param('payoutId') payoutId: string) {
    return this.schoolFinanceService.getWithdrawalLedgerForAuthUser(this.getAuthUser(request), payoutId);
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
