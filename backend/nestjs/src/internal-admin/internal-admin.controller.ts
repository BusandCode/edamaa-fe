import { Controller, Get, UseGuards } from '@nestjs/common';
import { DjangoAdminClientService } from './django-admin-client.service';
import { InternalTokenGuard } from './internal-token.guard';

@Controller('internal/admin')
@UseGuards(InternalTokenGuard)
export class InternalAdminController {
  constructor(private readonly djangoAdminClient: DjangoAdminClientService) {}

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
}
