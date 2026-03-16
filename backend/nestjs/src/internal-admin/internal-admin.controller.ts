import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DjangoAdminClientService } from './django-admin-client.service';
import { InternalTokenGuard } from './internal-token.guard';
import { SchoolFinanceService } from '../school-finance/school-finance.service';

type UpdatePayoutStatusBody = {
  status?: string;
  failureReason?: string;
  note?: string;
  processedBy?: string;
};

@Controller('internal/admin')
@UseGuards(InternalTokenGuard)
export class InternalAdminController {
  constructor(
    private readonly djangoAdminClient: DjangoAdminClientService,
    private readonly schoolFinanceService: SchoolFinanceService
  ) {}

  @Get('proxy-health')
  proxyHealth() {
    return {
      provider: 'django-admin-api',
      configured: this.djangoAdminClient.isConfigured(),
    };
  }

  @Get('health')
  async health() {
    return this.djangoAdminClient.health();
  }

  @Get('analytics/webhooks')
  async webhookAnalytics() {
    return this.djangoAdminClient.webhookAnalytics();
  }

  @Get('analytics/user-roles')
  async userRoleAnalytics() {
    return this.djangoAdminClient.userRoleAnalytics();
  }

  @Get('school-finance/payouts')
  async listSchoolFinancePayoutQueue(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.schoolFinanceService.listPayoutQueueForInternalAdmin({
      status,
      search,
      page: typeof page === 'string' && page.trim() ? Number(page) : undefined,
      limit: typeof limit === 'string' && limit.trim() ? Number(limit) : undefined,
    });
  }

  @Post('school-finance/payouts/:payoutId/status')
  async updateSchoolFinancePayoutStatus(
    @Param('payoutId') payoutId: string,
    @Body() body: UpdatePayoutStatusBody
  ) {
    return this.schoolFinanceService.advancePayoutStatusForInternalAdmin({
      payoutId,
      status: body.status,
      failureReason: body.failureReason,
      note: body.note,
      processedBy: body.processedBy,
    });
  }

  @Get('school-finance/payouts/:payoutId/ledger')
  async getSchoolFinancePayoutLedger(@Param('payoutId') payoutId: string) {
    return this.schoolFinanceService.getWithdrawalLedgerForInternalAdmin(payoutId);
  }
}
