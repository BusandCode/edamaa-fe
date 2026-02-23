import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class DjangoAdminClientService {
  // Normalize trailing slash once so endpoint paths can be simple and consistent.
  private readonly baseUrl = (process.env.DJANGO_INTERNAL_API_URL || 'http://localhost:8000/admin-api').replace(/\/+$/, '');
  private readonly internalToken = process.env.INTERNAL_API_TOKEN || '';

  isConfigured() {
    return Boolean(this.internalToken && this.baseUrl);
  }

  async health() {
    return this.get('/health/');
  }

  async webhookAnalytics() {
    return this.get('/analytics/webhooks/');
  }

  async userRoleAnalytics() {
    return this.get('/analytics/user-roles/');
  }

  private async get(path: string) {
    if (!this.internalToken) {
      throw new InternalServerErrorException('INTERNAL_API_TOKEN is not configured');
    }

    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Service-to-service auth: never expose Django admin APIs publicly.
        'X-Internal-Token': this.internalToken,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`Django admin API request failed (${response.status}): ${body}`);
    }

    return response.json();
  }
}
