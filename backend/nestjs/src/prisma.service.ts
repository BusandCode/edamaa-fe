/**
 * PrismaService
 *
 * Lightweight wrapper around Prisma Client. Export a single instance that can
 * be injected into Nest services. Keeping DB access centralized makes it
 * easier to add logging, tracing, or graceful shutdown behavior later.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly skipConnect = process.env.SKIP_PRISMA_CONNECT === '1';

  // Called when Nest starts the module; connect to the database here
  async onModuleInit() {
    if (this.skipConnect) {
      // Local smoke checks for the internal bridge do not require DB access.
      // Allow boot without Postgres when this explicit flag is enabled.
      // eslint-disable-next-line no-console
      console.warn('Prisma connect skipped (SKIP_PRISMA_CONNECT=1)');
      return;
    }
    await this.$connect();
  }

  // Called when Nest destroys the module; disconnect gracefully
  async onModuleDestroy() {
    if (this.skipConnect) {
      return;
    }
    await this.$disconnect();
  }
}
