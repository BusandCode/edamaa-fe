import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchoolFinanceService } from './school-finance.service';

@Injectable()
export class SchoolFinanceRemindersScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchoolFinanceRemindersScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(private readonly schoolFinanceService: SchoolFinanceService) {}

  onModuleInit() {
    if (!this.isSchedulerEnabled()) {
      this.logger.log('School fee reminder scheduler is disabled (SCHOOL_FEE_REMINDERS_ENABLED=0).');
      return;
    }

    const intervalMs = this.resolveIntervalMs();
    this.logger.log(`School fee reminder scheduler started (${intervalMs}ms interval).`);

    void this.runSweep('startup');
    this.intervalHandle = setInterval(() => {
      void this.runSweep('interval');
    }, intervalMs);

    if (typeof this.intervalHandle.unref === 'function') {
      this.intervalHandle.unref();
    }
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async runSweep(trigger: 'startup' | 'interval') {
    try {
      const result = await this.schoolFinanceService.dispatchScheduledInvoiceReminders({
        initiatedBy: `scheduler:${trigger}`,
      });
      this.logger.log(
        `Reminder sweep (${trigger}) scanned=${result.scannedInvoices} dueSoon(in_app/email)=${result.dueSoonInApp}/${result.dueSoonEmail} overdue(in_app/email)=${result.overdueInApp}/${result.overdueEmail} email(provider/attempted/sent/failed/skipped/retry/exhausted)=${result.emailProvider}/${result.emailAttempted}/${result.emailSent}/${result.emailFailed}/${result.emailSkipped}/${result.emailQueuedForRetry}/${result.emailExhausted}`
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Reminder sweep (${trigger}) failed: ${reason}`);
    }
  }

  private isSchedulerEnabled() {
    const value = String(process.env.SCHOOL_FEE_REMINDERS_ENABLED || '').trim().toLowerCase();
    if (!value) {
      return true;
    }
    return !['0', 'false', 'no', 'off'].includes(value);
  }

  private resolveIntervalMs() {
    const fromEnv = Number(process.env.SCHOOL_FEE_REMINDERS_INTERVAL_MS || '');
    if (!Number.isFinite(fromEnv) || fromEnv < 30_000) {
      return 5 * 60 * 1000;
    }
    return Math.round(fromEnv);
  }
}
