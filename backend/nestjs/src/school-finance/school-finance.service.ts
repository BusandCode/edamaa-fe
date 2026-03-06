import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Prisma,
  PaymentProvider,
  SchoolFeeInvoiceStatus,
  SchoolFeePaymentStatus,
  SchoolFeeReminderChannel,
  SchoolFeeReminderDispatchStatus,
  SchoolFeeReminderType,
  SchoolPayoutStatus,
  type SchoolFeeInvoice,
  type SchoolFeePayment,
  type SchoolFinanceAccount,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type SchoolFinanceDashboardResponse = {
  generatedAt: string;
  school: {
    financeAccountId: string;
    name: string;
    email: string;
    currency: string;
  };
  wallet: {
    available: number;
    pending: number;
    onHold: number;
    lifetimeGross: number;
    lifetimeNet: number;
    totalWithdrawn: number;
  };
  overview: {
    totalInvoices: number;
    outstandingAmount: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
  };
  feePlans: SchoolFeePlanItem[];
  recentInvoices: SchoolFeeInvoiceItem[];
  recentPayments: SchoolFeePaymentItem[];
  recentPayouts: SchoolPayoutItem[];
};

type SchoolFeePlanItem = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  dueDays: number | null;
  isActive: boolean;
  createdAt: string;
};

type SchoolFeeInvoiceItem = {
  id: string;
  title: string;
  description: string | null;
  studentUserId: string | null;
  studentEmail: string;
  studentName: string | null;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'canceled';
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  paymentLink: string;
};

type SchoolInvoiceStudentItem = {
  id: string | null;
  email: string;
  name: string | null;
  role: string | null;
};

type SchoolFeeInvoiceNotificationItem = {
  id: string;
  kind: 'new_invoice' | 'due_soon' | 'overdue_reminder';
  invoiceId: string;
  schoolName: string;
  title: string;
  message: string;
  amount: number;
  currency: string;
  status: SchoolFeeInvoiceItem['status'];
  dueDate: string | null;
  createdAt: string;
  isRead: boolean;
};

type SchoolFeePaymentItem = {
  id: string;
  invoiceId: string;
  payerEmail: string;
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'settled' | 'failed' | 'refunded';
  settledAt: string | null;
  createdAt: string;
};

type SchoolPayoutItem = {
  id: string;
  amount: number;
  currency: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
  requestedAt: string;
  processedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  ledgerCount?: number;
};

type SchoolPayoutLedgerItem = {
  id: string;
  payoutId: string;
  previousStatus: SchoolPayoutItem['status'] | null;
  nextStatus: SchoolPayoutItem['status'];
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
};

type SchoolFeeReminderDispatchItem = {
  id: string;
  invoiceId: string;
  invoiceTitle: string;
  studentEmail: string;
  reminderType: 'due_soon' | 'overdue';
  channel: 'in_app' | 'email';
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  reminderDate: string;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

type ReminderEmailProvider = 'resend' | 'log';

type ReminderEmailProcessingSummary = {
  provider: ReminderEmailProvider | 'disabled';
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
};

type CreateFeePlanInput = {
  title?: string;
  description?: string;
  amount?: number;
  dueDays?: number | null;
};

type CreateInvoiceInput = {
  feePlanId?: string;
  title?: string;
  description?: string;
  amount?: number;
  studentUserId?: string;
  studentEmail?: string;
  studentName?: string;
  dueDate?: string | null;
};

type ListSchoolInvoicesInput = {
  status?: string;
};

type ListReminderDispatchesInput = {
  reminderType?: string;
  channel?: string;
  status?: string;
  limit?: number;
};

type PayInvoiceInput = {
  invoiceId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type SyncInvoiceCheckoutInput = {
  checkoutSessionId?: string;
};

type CreateWithdrawalInput = {
  amount?: number;
};

type AdvanceWithdrawalStatusInput = {
  payoutId?: string;
  status?: string;
  failureReason?: string;
  note?: string;
};

type InvoicePaymentResponse = {
  mode: 'checkout' | 'settled';
  checkoutUrl: string | null;
  checkoutSessionId: string | null;
  message: string;
  invoice: SchoolFeeInvoiceItem;
  payment: SchoolFeePaymentItem | null;
  wallet: SchoolFinanceDashboardResponse['wallet'];
};

const INVOICE_STATUS_FROM_PRISMA: Record<
  SchoolFeeInvoiceStatus,
  SchoolFeeInvoiceItem['status']
> = {
  [SchoolFeeInvoiceStatus.DRAFT]: 'draft',
  [SchoolFeeInvoiceStatus.PENDING]: 'pending',
  [SchoolFeeInvoiceStatus.PARTIALLY_PAID]: 'partially_paid',
  [SchoolFeeInvoiceStatus.PAID]: 'paid',
  [SchoolFeeInvoiceStatus.OVERDUE]: 'overdue',
  [SchoolFeeInvoiceStatus.CANCELED]: 'canceled',
};

const INVOICE_STATUS_TO_PRISMA: Record<
  Exclude<SchoolFeeInvoiceItem['status'], 'partially_paid'>,
  SchoolFeeInvoiceStatus
> = {
  draft: SchoolFeeInvoiceStatus.DRAFT,
  pending: SchoolFeeInvoiceStatus.PENDING,
  paid: SchoolFeeInvoiceStatus.PAID,
  overdue: SchoolFeeInvoiceStatus.OVERDUE,
  canceled: SchoolFeeInvoiceStatus.CANCELED,
};

const PAYMENT_STATUS_FROM_PRISMA: Record<
  SchoolFeePaymentStatus,
  SchoolFeePaymentItem['status']
> = {
  [SchoolFeePaymentStatus.PENDING]: 'pending',
  [SchoolFeePaymentStatus.SETTLED]: 'settled',
  [SchoolFeePaymentStatus.FAILED]: 'failed',
  [SchoolFeePaymentStatus.REFUNDED]: 'refunded',
};

const PAYOUT_STATUS_FROM_PRISMA: Record<
  SchoolPayoutStatus,
  SchoolPayoutItem['status']
> = {
  [SchoolPayoutStatus.REQUESTED]: 'requested',
  [SchoolPayoutStatus.PROCESSING]: 'processing',
  [SchoolPayoutStatus.PAID]: 'paid',
  [SchoolPayoutStatus.FAILED]: 'failed',
  [SchoolPayoutStatus.CANCELED]: 'canceled',
};

const REMINDER_TYPE_FROM_PRISMA: Record<
  SchoolFeeReminderType,
  SchoolFeeReminderDispatchItem['reminderType']
> = {
  [SchoolFeeReminderType.DUE_SOON]: 'due_soon',
  [SchoolFeeReminderType.OVERDUE]: 'overdue',
};

const REMINDER_CHANNEL_FROM_PRISMA: Record<
  SchoolFeeReminderChannel,
  SchoolFeeReminderDispatchItem['channel']
> = {
  [SchoolFeeReminderChannel.IN_APP]: 'in_app',
  [SchoolFeeReminderChannel.EMAIL]: 'email',
};

const REMINDER_DISPATCH_STATUS_FROM_PRISMA: Record<
  SchoolFeeReminderDispatchStatus,
  SchoolFeeReminderDispatchItem['status']
> = {
  [SchoolFeeReminderDispatchStatus.QUEUED]: 'queued',
  [SchoolFeeReminderDispatchStatus.SENT]: 'sent',
  [SchoolFeeReminderDispatchStatus.FAILED]: 'failed',
  [SchoolFeeReminderDispatchStatus.SKIPPED]: 'skipped',
};

@Injectable()
export class SchoolFinanceService {
  private readonly logger = new Logger(SchoolFinanceService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const stripeKey = (process.env.STRIPE_API_KEY || '').trim();
    const hasLiveStripeKey = Boolean(stripeKey) && !stripeKey.includes('placeholder');

    this.stripe = hasLiveStripeKey
      ? new Stripe(stripeKey, {
          apiVersion: '2022-11-15',
        })
      : null;
  }

  async getSchoolDashboardForAuthUser(authUser: AuthUser): Promise<SchoolFinanceDashboardResponse> {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
      await this.refreshOverdueInvoicesForAccount(account.id);

      const [plans, invoices, recentPayments, recentPayouts] = await Promise.all([
        this.prisma.schoolFeePlan.findMany({
          where: { accountId: account.id },
          orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.schoolFeeInvoice.findMany({
          where: { accountId: account.id },
          orderBy: [{ createdAt: 'desc' }],
          take: 60,
        }),
        this.prisma.schoolFeePayment.findMany({
          where: { accountId: account.id },
          orderBy: [{ createdAt: 'desc' }],
          take: 30,
        }),
        this.prisma.schoolPayout.findMany({
          where: { accountId: account.id },
          orderBy: [{ createdAt: 'desc' }],
          take: 20,
        }),
      ]);

      const outstandingMinor = invoices
        .filter((invoice) =>
          invoice.status === SchoolFeeInvoiceStatus.PENDING ||
          invoice.status === SchoolFeeInvoiceStatus.OVERDUE ||
          invoice.status === SchoolFeeInvoiceStatus.PARTIALLY_PAID
        )
        .reduce((sum, invoice) => sum + invoice.amountMinor, 0);

      return {
        generatedAt: new Date().toISOString(),
        school: {
          financeAccountId: account.publicId,
          name: schoolUser.name || displayName,
          email: schoolUser.email,
          currency: account.currency,
        },
        wallet: this.mapWallet(account),
        overview: {
          totalInvoices: invoices.length,
          outstandingAmount: this.toNaira(outstandingMinor),
          paidInvoices: invoices.filter((invoice) => invoice.status === SchoolFeeInvoiceStatus.PAID).length,
          pendingInvoices: invoices.filter((invoice) => invoice.status === SchoolFeeInvoiceStatus.PENDING).length,
          overdueInvoices: invoices.filter((invoice) => invoice.status === SchoolFeeInvoiceStatus.OVERDUE).length,
        },
        feePlans: plans.map((plan) => this.mapPlan(plan)),
        recentInvoices: invoices.slice(0, 20).map((invoice) => this.mapInvoice(invoice)),
        recentPayments: recentPayments.map((payment) => this.mapPayment(payment)),
        recentPayouts: recentPayouts.map((payout) => this.mapPayout(payout)),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn(
          'School finance store is unavailable. Returning an empty dashboard response instead.'
        );
        return this.createEmptyDashboardResponse(email, displayName);
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async createFeePlanForAuthUser(authUser: AuthUser, input: CreateFeePlanInput) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
      const title = String(input.title || '').trim();
      const amountMinor = this.parseAmountToMinor(input.amount, 'Fee plan amount');
      const dueDays = this.normalizeDueDays(input.dueDays);

      if (!title) {
        throw new BadRequestException('Fee plan title is required.');
      }

      const created = await this.prisma.schoolFeePlan.create({
        data: {
          publicId: this.createPublicId('FPL', schoolUser.id),
          accountId: account.id,
          title,
          description: this.normalizeOptionalText(input.description),
          amountMinor,
          currency: account.currency,
          dueDays,
          isActive: true,
        },
      });

      return {
        plan: this.mapPlan(created),
        message: 'Fee plan created successfully.',
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'create a fee plan');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async createInvoiceForAuthUser(authUser: AuthUser, input: CreateInvoiceInput) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);

      const resolvedStudent = await this.resolveInvoiceStudentTarget({
        studentUserId: input.studentUserId,
        studentEmail: input.studentEmail,
        studentName: input.studentName,
      });

      const selectedPlan = input.feePlanId
        ? await this.prisma.schoolFeePlan.findFirst({
            where: {
              accountId: account.id,
              publicId: String(input.feePlanId).trim(),
            },
          })
        : null;

      if (input.feePlanId && !selectedPlan) {
        throw new NotFoundException('Fee plan not found.');
      }

      const title = String(input.title || selectedPlan?.title || '').trim();
      if (!title) {
        throw new BadRequestException('Invoice title is required.');
      }

      const amountMinor = selectedPlan
        ? this.parseAmountToMinor(input.amount ?? this.toNaira(selectedPlan.amountMinor), 'Invoice amount')
        : this.parseAmountToMinor(input.amount, 'Invoice amount');

      const dueAt = this.parseDate(input.dueDate);
      const initialStatus =
        dueAt && dueAt.getTime() < Date.now()
          ? SchoolFeeInvoiceStatus.OVERDUE
          : SchoolFeeInvoiceStatus.PENDING;
      const created = await this.prisma.schoolFeeInvoice.create({
        data: {
          publicId: this.createPublicId('INV', schoolUser.id),
          accountId: account.id,
          planId: selectedPlan?.id || null,
          studentUserId: resolvedStudent.userId,
          studentEmail: resolvedStudent.email,
          studentName: resolvedStudent.name,
          title,
          description: this.normalizeOptionalText(input.description || selectedPlan?.description || ''),
          amountMinor,
          currency: account.currency,
          status: initialStatus,
          dueAt,
        },
      });

      return {
        invoice: this.mapInvoice(created),
        message: 'Invoice created and ready for student payment.',
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'create an invoice');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async listSchoolStudentsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);

    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);

      const recentInvoiceStudents = await this.prisma.schoolFeeInvoice.findMany({
        where: { accountId: account.id },
        select: {
          studentUserId: true,
          studentEmail: true,
          studentName: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 300,
      });

      const invoiceStudentUserIds = Array.from(
        new Set(
          recentInvoiceStudents
            .map((invoice) => invoice.studentUserId)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
        )
      );

      const students = await this.prisma.user.findMany({
        where: {
          OR: [
            {
              role: {
                equals: 'student',
                mode: 'insensitive',
              },
            },
            ...(invoiceStudentUserIds.length > 0
              ? [
                  {
                    id: {
                      in: invoiceStudentUserIds,
                    },
                  },
                ]
              : []),
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        take: 500,
      });

      const studentsByEmail = new Map<string, SchoolInvoiceStudentItem>();
      students.forEach((student) => {
        const normalizedEmail = this.normalizeEmail(student.email);
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          return;
        }

        studentsByEmail.set(normalizedEmail, {
          id: String(student.id),
          email: normalizedEmail,
          name: this.normalizeOptionalText(student.name),
          role: this.normalizeOptionalText(student.role),
        });
      });

      // Keep invoice-only students in picker results so schools can still target
      // historical records even if those users are not currently in the user list.
      recentInvoiceStudents.forEach((invoice) => {
        const normalizedEmail = this.normalizeEmail(invoice.studentEmail);
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
          return;
        }

        const existing = studentsByEmail.get(normalizedEmail);
        if (!existing) {
          studentsByEmail.set(normalizedEmail, {
            id: typeof invoice.studentUserId === 'number' ? String(invoice.studentUserId) : null,
            email: normalizedEmail,
            name: this.normalizeOptionalText(invoice.studentName),
            role: 'student',
          });
          return;
        }

        if (!existing.name && invoice.studentName) {
          existing.name = this.normalizeOptionalText(invoice.studentName);
        }
        if (!existing.id && typeof invoice.studentUserId === 'number') {
          existing.id = String(invoice.studentUserId);
        }
      });

      const sorted = Array.from(studentsByEmail.values()).sort((a, b) => {
        const aLabel = `${a.name || ''} ${a.email}`.toLowerCase();
        const bLabel = `${b.name || ''} ${b.email}`.toLowerCase();
        return aLabel.localeCompare(bLabel);
      });

      return {
        students: sorted.slice(0, 400),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Returning empty school student picker.');
        return { students: [] };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async listSchoolInvoicesForAuthUser(authUser: AuthUser, input: ListSchoolInvoicesInput = {}) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
      await this.refreshOverdueInvoicesForAccount(account.id);
      const normalizedStatus = this.normalizeInvoiceStatus(input.status);

      const invoices = await this.prisma.schoolFeeInvoice.findMany({
        where: {
          accountId: account.id,
          ...(normalizedStatus ? { status: normalizedStatus } : {}),
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 80,
      });

      return {
        invoices: invoices.map((invoice) => this.mapInvoice(invoice)),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Returning empty school invoices list.');
        return { invoices: [] };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async listReminderDispatchesForAuthUser(
    authUser: AuthUser,
    input: ListReminderDispatchesInput = {}
  ) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);

    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
      const reminderType = this.normalizeReminderType(input.reminderType);
      const reminderChannel = this.normalizeReminderChannel(input.channel);
      const reminderStatus = this.normalizeReminderDispatchStatus(input.status);
      const limit = this.normalizeReminderDispatchLimit(input.limit);

      const dispatches = await this.prisma.schoolFeeReminderDispatch.findMany({
        where: {
          accountId: account.id,
          ...(reminderType ? { reminderType } : {}),
          ...(reminderChannel ? { channel: reminderChannel } : {}),
          ...(reminderStatus ? { status: reminderStatus } : {}),
        },
        include: {
          invoice: {
            select: {
              publicId: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
      });

      return {
        generatedAt: new Date().toISOString(),
        total: dispatches.length,
        dispatches: dispatches.map((dispatch) =>
          this.mapReminderDispatch(dispatch, dispatch.invoice?.publicId || '', dispatch.invoice?.title || 'Invoice')
        ),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Returning empty reminder dispatch list.');
        return {
          generatedAt: new Date().toISOString(),
          total: 0,
          dispatches: [] as SchoolFeeReminderDispatchItem[],
        };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async runReminderSweepForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);

    const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
    const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
    return this.dispatchScheduledInvoiceReminders({
      accountId: account.id,
      initiatedBy: email,
    });
  }

  async processQueuedReminderEmailsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);

    const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
    const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
    return this.processQueuedReminderEmails({
      accountId: account.id,
      initiatedBy: email,
    });
  }

  async dispatchScheduledInvoiceReminders(input: {
    now?: Date;
    accountId?: number;
    initiatedBy?: string;
  } = {}) {
    const now = input.now || new Date();
    const dueSoonWindowMs = this.resolveReminderDueSoonWindowMs();
    const dueSoonCutoff = new Date(now.getTime() + dueSoonWindowMs);
    const reminderDateToday = this.toUtcDateBucket(now);
    const emailDispatchEnabled = this.isReminderEmailDispatchEnabled();

    try {
      await this.refreshOverdueInvoicesGlobal(now, input.accountId);

      const invoices = await this.prisma.schoolFeeInvoice.findMany({
        where: {
          ...(typeof input.accountId === 'number' ? { accountId: input.accountId } : {}),
          status: {
            in: [SchoolFeeInvoiceStatus.PENDING, SchoolFeeInvoiceStatus.OVERDUE],
          },
          dueAt: {
            not: null,
            lte: dueSoonCutoff,
          },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: 600,
      });

      let dueSoonInApp = 0;
      let dueSoonEmail = 0;
      let overdueInApp = 0;
      let overdueEmail = 0;

      for (const invoice of invoices) {
        if (!invoice.dueAt) {
          continue;
        }

        const normalizedStudentEmail = this.normalizeEmail(invoice.studentEmail);
        if (!normalizedStudentEmail || !normalizedStudentEmail.includes('@')) {
          continue;
        }

        const isOverdue = invoice.dueAt.getTime() <= now.getTime();
        const isDueSoon = invoice.dueAt.getTime() > now.getTime() && invoice.dueAt.getTime() <= dueSoonCutoff.getTime();

        if (isDueSoon) {
          const dueSoonReminderDate = this.toUtcDateBucket(invoice.dueAt);
          const inAppCreated = await this.createReminderDispatchIfMissing({
            invoice,
            studentEmail: normalizedStudentEmail,
            reminderType: SchoolFeeReminderType.DUE_SOON,
            channel: SchoolFeeReminderChannel.IN_APP,
            reminderDate: dueSoonReminderDate,
            status: SchoolFeeReminderDispatchStatus.SENT,
            sentAt: now,
            metadata: {
              initiatedBy: input.initiatedBy || 'scheduler',
              reason: 'due-soon-window',
              dueAt: invoice.dueAt.toISOString(),
            },
          });
          if (inAppCreated) {
            dueSoonInApp += 1;
          }

          const emailCreated = await this.createReminderDispatchIfMissing({
            invoice,
            studentEmail: normalizedStudentEmail,
            reminderType: SchoolFeeReminderType.DUE_SOON,
            channel: SchoolFeeReminderChannel.EMAIL,
            reminderDate: dueSoonReminderDate,
            status: emailDispatchEnabled
              ? SchoolFeeReminderDispatchStatus.QUEUED
              : SchoolFeeReminderDispatchStatus.SKIPPED,
            sentAt: emailDispatchEnabled ? null : now,
            failureReason: emailDispatchEnabled
              ? null
              : 'Email reminder delivery is disabled in the backend environment.',
            metadata: {
              initiatedBy: input.initiatedBy || 'scheduler',
              reason: 'due-soon-window',
              dueAt: invoice.dueAt.toISOString(),
            },
          });
          if (emailCreated) {
            dueSoonEmail += 1;
          }
        }

        if (isOverdue) {
          const inAppCreated = await this.createReminderDispatchIfMissing({
            invoice,
            studentEmail: normalizedStudentEmail,
            reminderType: SchoolFeeReminderType.OVERDUE,
            channel: SchoolFeeReminderChannel.IN_APP,
            reminderDate: reminderDateToday,
            status: SchoolFeeReminderDispatchStatus.SENT,
            sentAt: now,
            metadata: {
              initiatedBy: input.initiatedBy || 'scheduler',
              reason: 'overdue-daily',
              dueAt: invoice.dueAt.toISOString(),
            },
          });
          if (inAppCreated) {
            overdueInApp += 1;
          }

          const emailCreated = await this.createReminderDispatchIfMissing({
            invoice,
            studentEmail: normalizedStudentEmail,
            reminderType: SchoolFeeReminderType.OVERDUE,
            channel: SchoolFeeReminderChannel.EMAIL,
            reminderDate: reminderDateToday,
            status: emailDispatchEnabled
              ? SchoolFeeReminderDispatchStatus.QUEUED
              : SchoolFeeReminderDispatchStatus.SKIPPED,
            sentAt: emailDispatchEnabled ? null : now,
            failureReason: emailDispatchEnabled
              ? null
              : 'Email reminder delivery is disabled in the backend environment.',
            metadata: {
              initiatedBy: input.initiatedBy || 'scheduler',
              reason: 'overdue-daily',
              dueAt: invoice.dueAt.toISOString(),
            },
          });
          if (emailCreated) {
            overdueEmail += 1;
          }
        }
      }

      const emailDelivery = await this.processQueuedReminderEmails({
        accountId: input.accountId,
        initiatedBy: input.initiatedBy || 'scheduler',
      });

      return {
        generatedAt: new Date().toISOString(),
        accountId: input.accountId || null,
        scannedInvoices: invoices.length,
        dueSoonInApp,
        dueSoonEmail,
        overdueInApp,
        overdueEmail,
        emailDispatchEnabled,
        emailProvider: emailDelivery.provider,
        emailAttempted: emailDelivery.attempted,
        emailSent: emailDelivery.sent,
        emailFailed: emailDelivery.failed,
        emailSkipped: emailDelivery.skipped,
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Skipping reminder dispatch sweep.');
        return {
          generatedAt: new Date().toISOString(),
          accountId: input.accountId || null,
          scannedInvoices: 0,
          dueSoonInApp: 0,
          dueSoonEmail: 0,
          overdueInApp: 0,
          overdueEmail: 0,
          emailDispatchEnabled,
          emailProvider: 'disabled',
          emailAttempted: 0,
          emailSent: 0,
          emailFailed: 0,
          emailSkipped: 0,
          skipped: true,
        };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async listStudentInvoicesForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const studentUser = await this.resolveOrCreateUser(email, displayName, 'student');
      await this.refreshOverdueInvoicesForStudent(email, studentUser.id);
      const invoices = await this.prisma.schoolFeeInvoice.findMany({
        where: {
          OR: [
            {
              studentUserId: studentUser.id,
            },
            {
              studentEmail: {
                equals: email,
                mode: 'insensitive',
              },
            },
          ],
          status: {
            in: [
              SchoolFeeInvoiceStatus.PENDING,
              SchoolFeeInvoiceStatus.OVERDUE,
              SchoolFeeInvoiceStatus.PARTIALLY_PAID,
              SchoolFeeInvoiceStatus.PAID,
            ],
          },
        },
        include: {
          account: {
            include: {
              schoolUser: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      });

      return {
        invoices: invoices.map((invoice) => ({
          ...this.mapInvoice(invoice),
          schoolName: invoice.account.schoolUser.name || invoice.account.schoolUser.email,
          schoolFinanceAccountId: invoice.account.publicId,
        })),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Returning empty student invoices list.');
        return { invoices: [] };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async listStudentInvoiceNotificationsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);

    try {
      const invoicesPayload = await this.listStudentInvoicesForAuthUser(authUser);
      const readIds = await this.getReadInvoiceNotificationIds(email);
      const notifications = invoicesPayload.invoices
        .flatMap((invoice) =>
          this.toStudentInvoiceNotificationItems(
            {
              ...invoice,
              schoolName: invoice.schoolName || 'School',
            },
            readIds
          )
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        generatedAt: new Date().toISOString(),
        unreadCount: notifications.filter((notification) => !notification.isRead).length,
        notifications,
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn(
          'School finance store is unavailable. Returning empty student invoice notifications.'
        );
        return {
          generatedAt: new Date().toISOString(),
          unreadCount: 0,
          notifications: [] as SchoolFeeInvoiceNotificationItem[],
        };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async markStudentInvoiceNotificationAsReadForAuthUser(authUser: AuthUser, notificationId: string) {
    const email = this.requireEmail(authUser);
    const normalizedNotificationId = String(notificationId || '').trim();
    if (!normalizedNotificationId) {
      throw new BadRequestException('Notification id is required.');
    }

    const notificationsPayload = await this.listStudentInvoiceNotificationsForAuthUser(authUser);
    const targetNotification = notificationsPayload.notifications.find(
      (notification) => notification.id === normalizedNotificationId
    );
    if (!targetNotification) {
      throw new NotFoundException('Notification not found.');
    }

    await this.markInvoiceNotificationRead(email, targetNotification);

    return {
      notificationId: normalizedNotificationId,
      isRead: true,
      unreadCount: notificationsPayload.notifications.filter(
        (notification) => notification.id !== normalizedNotificationId && !notification.isRead
      ).length,
    };
  }

  async markAllStudentInvoiceNotificationsAsReadForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const notificationsPayload = await this.listStudentInvoiceNotificationsForAuthUser(authUser);
    await this.markInvoiceNotificationsRead(email, notificationsPayload.notifications);

    return {
      updated: notificationsPayload.notifications.length,
      unreadCount: 0,
    };
  }

  async payInvoiceForAuthUser(authUser: AuthUser, input: PayInvoiceInput): Promise<InvoicePaymentResponse> {
    const payerEmail = this.requireEmail(authUser);
    const payerRole = this.normalizeRole(authUser.role);
    const invoicePublicId = String(input.invoiceId || '').trim();
    if (!invoicePublicId) {
      throw new BadRequestException('Invoice id is required.');
    }
    try {
      const invoice = await this.prisma.schoolFeeInvoice.findUnique({
        where: { publicId: invoicePublicId },
        include: {
          account: {
            include: {
              schoolUser: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const payerDisplayName = this.normalizeDisplayName(authUser.name, payerEmail);
      const payerUser = await this.resolveOrCreateUser(payerEmail, payerDisplayName, payerRole || 'student');

      const payerCanPay =
        this.normalizeEmail(invoice.studentEmail) === payerEmail ||
        invoice.studentUserId === payerUser.id ||
        this.isSchoolRole(payerRole);

      if (!payerCanPay) {
        throw new ForbiddenException('You can only pay invoices assigned to your account.');
      }

      if (invoice.status === SchoolFeeInvoiceStatus.PAID) {
        const latestPayment = await this.prisma.schoolFeePayment.findFirst({
          where: { invoiceId: invoice.id },
          orderBy: [{ createdAt: 'desc' }],
        });

        return {
          mode: 'settled',
          checkoutUrl: null,
          checkoutSessionId: null,
          message: 'This invoice is already paid.',
          invoice: this.mapInvoice(invoice),
          payment: latestPayment ? this.mapPayment(latestPayment) : null,
          wallet: this.mapWallet(invoice.account),
        };
      }

      if (this.stripe) {
        const appBaseUrl = this.resolveAppBaseUrl();
        const checkoutBasePath = this.isSchoolRole(payerRole) ? '/school-finance' : '/payments';
        const successUrl =
          this.normalizeHttpUrl(input.successUrl) ||
          `${appBaseUrl}${checkoutBasePath}?school_fee=1&checkout=success&session_id={CHECKOUT_SESSION_ID}&invoice=${encodeURIComponent(
            invoice.publicId
          )}`;
        const cancelUrl =
          this.normalizeHttpUrl(input.cancelUrl) ||
          `${appBaseUrl}${checkoutBasePath}?school_fee=1&checkout=cancel&invoice=${encodeURIComponent(
            invoice.publicId
          )}`;

        const checkoutSession = await this.stripe.checkout.sessions.create({
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: payerEmail,
          metadata: {
            financeType: 'school_fee_invoice',
            invoicePublicId: invoice.publicId,
            schoolFinanceAccountId: invoice.account.publicId,
            schoolUserId: String(invoice.account.schoolUserId),
            payerUserId: String(payerUser.id),
            payerEmail,
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: invoice.currency.toLowerCase(),
                unit_amount: invoice.amountMinor,
                product_data: {
                  name: invoice.title,
                  description:
                    invoice.description ||
                    `School fee payment for ${invoice.account.schoolUser.name || invoice.account.schoolUser.email}`,
                },
              },
            },
          ],
        });

        if (!checkoutSession.id) {
          throw new BadRequestException('Unable to initialize checkout session.');
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.schoolFeeInvoice.update({
            where: { id: invoice.id },
            data: {
              status:
                invoice.status === SchoolFeeInvoiceStatus.OVERDUE
                  ? SchoolFeeInvoiceStatus.OVERDUE
                  : SchoolFeeInvoiceStatus.PENDING,
              stripeCheckoutSessionId: checkoutSession.id,
            },
          });

          const existingPayment = await tx.schoolFeePayment.findFirst({
            where: { providerReference: checkoutSession.id },
          });

          if (!existingPayment) {
            const breakdown = this.calculateFeeBreakdown(invoice.amountMinor);
            await tx.schoolFeePayment.create({
              data: {
                publicId: this.createPublicId('PAY', invoice.account.schoolUserId),
                accountId: invoice.accountId,
                invoiceId: invoice.id,
                payerUserId: payerUser.id,
                payerEmail,
                grossAmountMinor: invoice.amountMinor,
                platformFeeMinor: breakdown.platformFeeMinor,
                processingFeeMinor: breakdown.processingFeeMinor,
                netAmountMinor: breakdown.netAmountMinor,
                currency: invoice.currency,
                provider: PaymentProvider.STRIPE,
                providerReference: checkoutSession.id,
                status: SchoolFeePaymentStatus.PENDING,
                metadata: {
                  source: 'checkout',
                },
              },
            });
          }
        });

        return {
          mode: 'checkout',
          checkoutUrl: checkoutSession.url || null,
          checkoutSessionId: checkoutSession.id,
          message: checkoutSession.url
            ? 'Checkout session created successfully.'
            : 'Checkout created, but Stripe did not return a redirect URL.',
          invoice: this.mapInvoice(invoice),
          payment: null,
          wallet: this.mapWallet(invoice.account),
        };
      }

      const settled = await this.settleInvoicePayment({
        invoicePublicId: invoice.publicId,
        payerEmail,
        payerUserId: payerUser.id,
        provider: PaymentProvider.LOCAL,
        providerReference: `LOCAL-${invoice.publicId}-${Date.now()}`,
        metadata: {
          source: 'local',
        },
      });

      return {
        mode: 'settled',
        checkoutUrl: null,
        checkoutSessionId: null,
        message: 'Payment completed successfully.',
        invoice: this.mapInvoice(settled.invoice),
        payment: settled.payment ? this.mapPayment(settled.payment) : null,
        wallet: this.mapWallet(settled.account),
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'pay a school invoice');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async syncInvoiceCheckoutForAuthUser(authUser: AuthUser, input: SyncInvoiceCheckoutInput) {
    const stripe = this.requireStripeClient();
    const payerEmail = this.requireEmail(authUser);
    const checkoutSessionId = String(input.checkoutSessionId || '').trim();

    if (!checkoutSessionId) {
      throw new BadRequestException('Checkout session id is required.');
    }

    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ['payment_intent'],
      });
      this.assertSchoolFinanceCheckoutSession(checkoutSession);

      const metadataPayerEmail = this.normalizeEmail(String(checkoutSession.metadata?.payerEmail || ''));
      const payerRole = this.normalizeRole(authUser.role);
      const canSync = metadataPayerEmail === payerEmail || this.isSchoolRole(payerRole);
      if (!canSync) {
        throw new ForbiddenException('This checkout session does not belong to the authenticated user.');
      }

      const settled = await this.settleInvoiceCheckoutSession(
        checkoutSession,
        metadataPayerEmail || payerEmail,
        'sync'
      );

      return {
        message: 'Checkout payment synced successfully.',
        invoice: this.mapInvoice(settled.invoice),
        payment: settled.payment ? this.mapPayment(settled.payment) : null,
        wallet: this.mapWallet(settled.account),
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'sync a checkout payment');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async getInvoiceCheckoutStatusForAuthUser(authUser: AuthUser, checkoutSessionIdInput: string) {
    const stripe = this.requireStripeClient();
    const requesterEmail = this.requireEmail(authUser);
    const checkoutSessionId = String(checkoutSessionIdInput || '').trim();

    if (!checkoutSessionId) {
      throw new BadRequestException('Checkout session id is required.');
    }

    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ['payment_intent'],
      });
      this.assertSchoolFinanceCheckoutSession(checkoutSession);

      const metadataPayerEmail = this.normalizeEmail(String(checkoutSession.metadata?.payerEmail || ''));
      const requesterRole = this.normalizeRole(authUser.role);
      const canView = metadataPayerEmail === requesterEmail || this.isSchoolRole(requesterRole);
      if (!canView) {
        throw new ForbiddenException(
          'This checkout session is not linked to the authenticated account.'
        );
      }

      const invoicePublicId = String(checkoutSession.metadata?.invoicePublicId || '').trim();
      if (!invoicePublicId) {
        throw new BadRequestException('Invoice reference is missing in checkout metadata.');
      }

      const [invoice, payment] = await Promise.all([
        this.prisma.schoolFeeInvoice.findUnique({
          where: { publicId: invoicePublicId },
        }),
        this.prisma.schoolFeePayment.findFirst({
          where: {
            OR: [
              { providerReference: checkoutSession.id || checkoutSessionId },
              {
                invoice: {
                  publicId: invoicePublicId,
                },
              },
            ],
          },
          orderBy: [{ createdAt: 'desc' }],
        }),
      ]);

      const isSettled =
        invoice?.status === SchoolFeeInvoiceStatus.PAID ||
        payment?.status === SchoolFeePaymentStatus.SETTLED;
      const source =
        payment?.metadata && typeof payment.metadata === 'object'
          ? String((payment.metadata as Record<string, unknown>).source || '').trim()
          : '';

      return {
        checkoutSessionId: checkoutSession.id || checkoutSessionId,
        paymentStatus: checkoutSession.payment_status,
        isSettled: Boolean(isSettled),
        needsManualSync:
          checkoutSession.payment_status === 'paid' &&
          !isSettled &&
          source !== 'webhook',
        reconciliationSource: source || null,
        invoice: invoice ? this.mapInvoice(invoice) : null,
        payment: payment ? this.mapPayment(payment) : null,
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'check checkout status');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async createWithdrawalForAuthUser(authUser: AuthUser, input: CreateWithdrawalInput) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);
      const amountMinor = this.parseAmountToMinor(input.amount, 'Withdrawal amount');

      if (amountMinor > account.availableMinor) {
        throw new BadRequestException('Withdrawal amount exceeds available balance.');
      }

      const payout = await this.prisma.$transaction(async (tx) => {
        const lockedAccount = await tx.schoolFinanceAccount.findUnique({
          where: { id: account.id },
        });

        if (!lockedAccount) {
          throw new NotFoundException('School finance account was not found.');
        }

        if (amountMinor > lockedAccount.availableMinor) {
          throw new BadRequestException('Withdrawal amount exceeds available balance.');
        }

        const created = await tx.schoolPayout.create({
          data: {
            publicId: this.createPublicId('WDR', schoolUser.id),
            accountId: lockedAccount.id,
            amountMinor,
            currency: lockedAccount.currency,
            status: SchoolPayoutStatus.REQUESTED,
            provider: PaymentProvider.LOCAL,
            metadata: {
              note: 'Withdrawal request queued for processing.',
            },
          },
        });

        await tx.schoolFinanceAccount.update({
          where: { id: lockedAccount.id },
          data: {
            availableMinor: {
              decrement: amountMinor,
            },
            onHoldMinor: {
              increment: amountMinor,
            },
          },
        });

        await this.createPayoutLedgerEntryTx(tx, {
          accountId: lockedAccount.id,
          payoutId: created.id,
          amountMinor,
          currency: lockedAccount.currency,
          previousStatus: null,
          nextStatus: SchoolPayoutStatus.REQUESTED,
          note: 'Withdrawal requested and moved to hold balance.',
          metadata: {
            source: 'withdrawal-request',
          },
        });

        return created;
      });

      const refreshedAccount = await this.prisma.schoolFinanceAccount.findUnique({
        where: { id: account.id },
      });

      if (!refreshedAccount) {
        throw new NotFoundException('School finance account was not found.');
      }

      const ledgerCount = await this.prisma.schoolPayoutLedgerEntry.count({
        where: { payoutId: payout.id },
      });

      return {
        payout: {
          ...this.mapPayout(payout),
          ledgerCount,
        },
        wallet: this.mapWallet(refreshedAccount),
        message:
          'Withdrawal request received. Funds are on hold while payout moves through processing.',
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'request a withdrawal');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async advanceWithdrawalStatusForAuthUser(authUser: AuthUser, input: AdvanceWithdrawalStatusInput) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const payoutPublicId = String(input.payoutId || '').trim();

    if (!payoutPublicId) {
      throw new BadRequestException('Payout id is required.');
    }

    const targetStatus = this.normalizePayoutStatusInput(input.status);
    const normalizedFailureReason = this.normalizeOptionalText(input.failureReason);
    const normalizedNote = this.normalizeOptionalText(input.note);

    if (targetStatus === SchoolPayoutStatus.FAILED && !normalizedFailureReason) {
      throw new BadRequestException('Please add a reason when marking a payout as failed.');
    }

    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);

      const outcome = await this.prisma.$transaction(async (tx) => {
        const payout = await tx.schoolPayout.findFirst({
          where: {
            publicId: payoutPublicId,
            accountId: account.id,
          },
        });

        if (!payout) {
          throw new NotFoundException('Payout request could not be found.');
        }

        if (payout.status === targetStatus) {
          const currentAccount = await tx.schoolFinanceAccount.findUnique({
            where: { id: account.id },
          });
          if (!currentAccount) {
            throw new NotFoundException('School finance account was not found.');
          }

          return {
            payout,
            account: currentAccount,
            changed: false,
          };
        }

        this.assertValidPayoutStatusTransition(payout.status, targetStatus);

        const accountDelta = this.buildAccountDeltaForPayoutTransition(
          payout.status,
          targetStatus,
          payout.amountMinor
        );

        const mergedMetadata = {
          ...(payout.metadata && typeof payout.metadata === 'object'
            ? (payout.metadata as Record<string, unknown>)
            : {}),
          manualTransition: true,
          note: normalizedNote || undefined,
        };

        const updatedPayout = await tx.schoolPayout.update({
          where: { id: payout.id },
          data: {
            status: targetStatus,
            processedAt: this.shouldSetPayoutProcessedAt(targetStatus) ? new Date() : null,
            failureReason:
              targetStatus === SchoolPayoutStatus.FAILED
                ? normalizedFailureReason
                : targetStatus === SchoolPayoutStatus.CANCELED
                ? normalizedFailureReason || null
                : null,
            metadata:
              Object.keys(mergedMetadata).length > 0
                ? (mergedMetadata as Prisma.InputJsonValue)
                : undefined,
          },
        });

        const updatedAccount = accountDelta
          ? await tx.schoolFinanceAccount.update({
              where: { id: account.id },
              data: accountDelta,
            })
          : await tx.schoolFinanceAccount.findUnique({
              where: { id: account.id },
            });

        if (!updatedAccount) {
          throw new NotFoundException('School finance account was not found.');
        }

        await this.createPayoutLedgerEntryTx(tx, {
          accountId: account.id,
          payoutId: payout.id,
          amountMinor: payout.amountMinor,
          currency: payout.currency,
          previousStatus: payout.status,
          nextStatus: targetStatus,
          note: this.buildPayoutLedgerNote(targetStatus, normalizedNote),
          metadata: {
            source: 'manual-status-update',
            failureReason: normalizedFailureReason || undefined,
          },
        });

        return {
          payout: updatedPayout,
          account: updatedAccount,
          changed: true,
        };
      });

      const ledgerCount = await this.prisma.schoolPayoutLedgerEntry.count({
        where: {
          payout: {
            publicId: payoutPublicId,
            accountId: account.id,
          },
        },
      });

      return {
        payout: {
          ...this.mapPayout(outcome.payout),
          ledgerCount,
        },
        wallet: this.mapWallet(outcome.account),
        message: outcome.changed
          ? 'Payout status updated successfully.'
          : 'Payout is already in the selected status.',
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'update payout status');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async getWithdrawalLedgerForAuthUser(authUser: AuthUser, payoutPublicIdInput: string) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const payoutPublicId = String(payoutPublicIdInput || '').trim();

    if (!payoutPublicId) {
      throw new BadRequestException('Payout id is required.');
    }

    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);

      const payout = await this.prisma.schoolPayout.findFirst({
        where: {
          publicId: payoutPublicId,
          accountId: account.id,
        },
      });

      if (!payout) {
        throw new NotFoundException('Payout request could not be found.');
      }

      const ledgerEntries = await this.prisma.schoolPayoutLedgerEntry.findMany({
        where: {
          payoutId: payout.id,
          accountId: account.id,
        },
        orderBy: [{ createdAt: 'asc' }],
      });

      return {
        payout: {
          ...this.mapPayout(payout),
          ledgerCount: ledgerEntries.length,
        },
        ledger: ledgerEntries.map((entry) => this.mapPayoutLedgerEntry(entry, payout.publicId)),
      };
    } catch (error) {
      this.throwIfFinanceWorkspaceUnavailable(error, 'load payout ledger');
      throw this.rethrowUnexpectedError(error);
    }
  }

  async listWithdrawalsForAuthUser(authUser: AuthUser) {
    const email = this.requireEmail(authUser);
    const normalizedRole = this.normalizeRole(authUser.role);
    this.assertSchoolRole(normalizedRole);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    try {
      const schoolUser = await this.resolveOrCreateUser(email, displayName, 'school');
      const account = await this.getOrCreateSchoolFinanceAccount(schoolUser.id);

      const payouts = await this.prisma.schoolPayout.findMany({
        where: { accountId: account.id },
        orderBy: [{ createdAt: 'desc' }],
        take: 60,
        include: {
          _count: {
            select: {
              ledgerEntries: true,
            },
          },
        },
      });

      return {
        payouts: payouts.map((payout) => ({
          ...this.mapPayout(payout),
          ledgerCount: payout._count.ledgerEntries,
        })),
        wallet: this.mapWallet(account),
      };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn('School finance store is unavailable. Returning empty withdrawals list.');
        return {
          payouts: [],
          wallet: this.createEmptyWallet(),
        };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  async handleStripeWebhookEvent(event: unknown) {
    try {
      const stripeEvent = event as Stripe.Event;
      if (!stripeEvent || typeof stripeEvent !== 'object') {
        return { handled: false, reason: 'invalid-event' };
      }

      if (
        stripeEvent.type !== 'checkout.session.completed' &&
        stripeEvent.type !== 'checkout.session.async_payment_succeeded'
      ) {
        return { handled: false, reason: 'unsupported-event' };
      }

      const session = stripeEvent.data?.object as Stripe.Checkout.Session | undefined;
      const financeType = String(session?.metadata?.financeType || '').trim();
      if (!session || financeType !== 'school_fee_invoice') {
        return { handled: false, reason: 'not-school-finance-session' };
      }

      if (session.payment_status !== 'paid') {
        return { handled: false, reason: 'payment-not-paid' };
      }

      await this.settleInvoiceCheckoutSession(
        session,
        this.normalizeEmail(String(session.metadata?.payerEmail || '')) ||
          this.normalizeEmail(session.customer_details?.email || ''),
        'webhook',
        stripeEvent.id
      );

      return { handled: true, reason: 'settled' };
    } catch (error) {
      if (this.isFinanceWorkspaceUnavailableError(error)) {
        this.logger.warn(
          'Stripe webhook for school finance ignored because the school finance store is unavailable.'
        );
        return { handled: false, reason: 'finance-store-unavailable' };
      }

      throw this.rethrowUnexpectedError(error);
    }
  }

  private assertSchoolFinanceCheckoutSession(checkoutSession: Stripe.Checkout.Session) {
    if (checkoutSession.mode !== 'payment') {
      throw new BadRequestException('This checkout session is not a payment session.');
    }

    const financeType = String(checkoutSession.metadata?.financeType || '').trim();
    if (financeType !== 'school_fee_invoice') {
      throw new BadRequestException('This checkout session is not linked to a school fee invoice.');
    }
  }

  private async settleInvoiceCheckoutSession(
    checkoutSession: Stripe.Checkout.Session,
    payerEmail: string,
    source: 'sync' | 'webhook',
    eventId?: string
  ) {
    this.assertSchoolFinanceCheckoutSession(checkoutSession);

    if (checkoutSession.payment_status !== 'paid') {
      throw new BadRequestException('Payment is not completed yet.');
    }

    const invoicePublicId = String(checkoutSession.metadata?.invoicePublicId || '').trim();
    if (!invoicePublicId) {
      throw new BadRequestException('Invoice reference is missing in checkout metadata.');
    }

    return this.settleInvoicePayment({
      invoicePublicId,
      payerEmail,
      payerUserId: null,
      provider: PaymentProvider.STRIPE,
      providerReference: checkoutSession.id || `stripe-session-${invoicePublicId}`,
      stripePaymentIntentId:
        typeof checkoutSession.payment_intent === 'string'
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id || null,
      grossAmountMinor:
        typeof checkoutSession.amount_total === 'number' && checkoutSession.amount_total > 0
          ? checkoutSession.amount_total
          : undefined,
      metadata: {
        source,
        ...(eventId ? { eventId } : {}),
      },
    });
  }

  private async settleInvoicePayment(input: {
    invoicePublicId: string;
    payerEmail: string;
    payerUserId: number | null;
    provider: PaymentProvider;
    providerReference: string;
    stripePaymentIntentId?: string | null;
    grossAmountMinor?: number;
    metadata?: Record<string, unknown>;
  }) {
    const invoicePublicId = String(input.invoicePublicId || '').trim();
    const providerReference = String(input.providerReference || '').trim();
    if (!invoicePublicId) {
      throw new BadRequestException('Invoice reference is required for settlement.');
    }
    if (!providerReference) {
      throw new BadRequestException('Provider reference is required for settlement.');
    }

    const payerEmail = this.normalizeEmail(input.payerEmail || '');
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.schoolFeeInvoice.findUnique({
        where: { publicId: invoicePublicId },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found.');
      }

      const account = await tx.schoolFinanceAccount.findUnique({
        where: { id: invoice.accountId },
      });

      if (!account) {
        throw new NotFoundException('School finance account not found.');
      }

      const existingByReference = await tx.schoolFeePayment.findUnique({
        where: { providerReference },
      });

      if (invoice.status === SchoolFeeInvoiceStatus.PAID) {
        if (existingByReference) {
          return {
            invoice,
            payment: existingByReference,
            account,
          };
        }

        const latest = await tx.schoolFeePayment.findFirst({
          where: {
            invoiceId: invoice.id,
            status: SchoolFeePaymentStatus.SETTLED,
          },
          orderBy: [{ createdAt: 'desc' }],
        });

        return {
          invoice,
          payment: latest || null,
          account,
        };
      }

      const grossAmountMinor =
        typeof input.grossAmountMinor === 'number' && input.grossAmountMinor > 0
          ? Math.round(input.grossAmountMinor)
          : invoice.amountMinor;
      const breakdown = this.calculateFeeBreakdown(grossAmountMinor);

      const payment =
        existingByReference ||
        (await tx.schoolFeePayment.create({
          data: {
            publicId: this.createPublicId('PAY', account.schoolUserId),
            accountId: account.id,
            invoiceId: invoice.id,
            payerUserId: input.payerUserId,
            payerEmail: payerEmail || invoice.studentEmail,
            grossAmountMinor,
            platformFeeMinor: breakdown.platformFeeMinor,
            processingFeeMinor: breakdown.processingFeeMinor,
            netAmountMinor: breakdown.netAmountMinor,
            currency: invoice.currency,
            provider: input.provider,
            providerReference,
            status: SchoolFeePaymentStatus.PENDING,
          },
        }));

      const settledPayment =
        payment.status === SchoolFeePaymentStatus.SETTLED
          ? payment
          : await (async () => {
              const mergedMetadata = {
                ...(payment.metadata && typeof payment.metadata === 'object'
                  ? (payment.metadata as Record<string, unknown>)
                  : {}),
                ...(input.metadata || {}),
              };

              return tx.schoolFeePayment.update({
                where: { id: payment.id },
                data: {
                  payerUserId: input.payerUserId || payment.payerUserId || null,
                  payerEmail: payerEmail || payment.payerEmail || invoice.studentEmail,
                  grossAmountMinor,
                  platformFeeMinor: breakdown.platformFeeMinor,
                  processingFeeMinor: breakdown.processingFeeMinor,
                  netAmountMinor: breakdown.netAmountMinor,
                  provider: input.provider,
                  providerReference,
                  status: SchoolFeePaymentStatus.SETTLED,
                  settledAt: now,
                  metadata:
                    Object.keys(mergedMetadata).length > 0 ? (mergedMetadata as any) : undefined,
                },
              });
            })();

      const settledInvoice = await tx.schoolFeeInvoice.update({
        where: { id: invoice.id },
        data: {
          status: SchoolFeeInvoiceStatus.PAID,
          paidAt: now,
          stripeCheckoutSessionId:
            input.provider === PaymentProvider.STRIPE ? providerReference : invoice.stripeCheckoutSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId || invoice.stripePaymentIntentId,
        },
      });

      const updatedAccount = await tx.schoolFinanceAccount.update({
        where: { id: account.id },
        data: {
          availableMinor: {
            increment: settledPayment.netAmountMinor,
          },
          lifetimeGrossMinor: {
            increment: settledPayment.grossAmountMinor,
          },
          lifetimeNetMinor: {
            increment: settledPayment.netAmountMinor,
          },
        },
      });

      return {
        invoice: settledInvoice,
        payment: settledPayment,
        account: updatedAccount,
      };
    });
  }

  private createEmptyDashboardResponse(email: string, displayName: string): SchoolFinanceDashboardResponse {
    return {
      generatedAt: new Date().toISOString(),
      school: {
        financeAccountId: 'SFA-PENDING-SETUP',
        name: displayName,
        email,
        currency: 'NGN',
      },
      wallet: this.createEmptyWallet(),
      overview: {
        totalInvoices: 0,
        outstandingAmount: 0,
        paidInvoices: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
      },
      feePlans: [],
      recentInvoices: [],
      recentPayments: [],
      recentPayouts: [],
    };
  }

  private createEmptyWallet(): SchoolFinanceDashboardResponse['wallet'] {
    return {
      available: 0,
      pending: 0,
      onHold: 0,
      lifetimeGross: 0,
      lifetimeNet: 0,
      totalWithdrawn: 0,
    };
  }

  private isFinanceWorkspaceUnavailableError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Missing-table / missing-column errors usually mean the latest school finance
      // migration was not applied in the current database yet.
      if (!['P1014', 'P2021', 'P2022'].includes(error.code)) {
        return false;
      }

      const details = `${error.message} ${JSON.stringify(error.meta || {})}`.toLowerCase();
      return (
        details.includes('schoolfinanceaccount') ||
        details.includes('schoolfeeplan') ||
        details.includes('schoolfeeinvoice') ||
        details.includes('studentuserid') ||
        details.includes('schoolfeepayment') ||
        details.includes('schoolpayout') ||
        details.includes('schoolpayoutledgerentry')
      );
    }

    if (error instanceof Error) {
      const details = error.message.toLowerCase();
      return (
        details.includes("can't reach database server") ||
        details.includes('connection refused') ||
        details.includes('failed to connect')
      );
    }

    return false;
  }

  private throwIfFinanceWorkspaceUnavailable(error: unknown, attemptedAction: string) {
    if (!this.isFinanceWorkspaceUnavailableError(error)) {
      return;
    }

    this.logger.warn(
      `School finance store is unavailable while trying to ${attemptedAction}. Returning setup guidance instead.`
    );
    throw new ServiceUnavailableException(
      'School fees service is temporarily unavailable. Confirm your database is running and school finance tables are initialized, then retry.'
    );
  }

  private rethrowUnexpectedError(error: unknown): never {
    if (error instanceof Error) {
      throw error;
    }

    throw new InternalServerErrorException('An unexpected school finance error occurred.');
  }

  private mapWallet(account: SchoolFinanceAccount): SchoolFinanceDashboardResponse['wallet'] {
    return {
      available: this.toNaira(account.availableMinor),
      pending: this.toNaira(account.pendingMinor),
      onHold: this.toNaira(account.onHoldMinor),
      lifetimeGross: this.toNaira(account.lifetimeGrossMinor),
      lifetimeNet: this.toNaira(account.lifetimeNetMinor),
      totalWithdrawn: this.toNaira(account.totalWithdrawnMinor),
    };
  }

  private mapPlan(plan: {
    publicId: string;
    title: string;
    description: string | null;
    amountMinor: number;
    currency: string;
    dueDays: number | null;
    isActive: boolean;
    createdAt: Date;
  }): SchoolFeePlanItem {
    return {
      id: plan.publicId,
      title: plan.title,
      description: plan.description,
      amount: this.toNaira(plan.amountMinor),
      currency: plan.currency,
      dueDays: plan.dueDays,
      isActive: plan.isActive,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  private mapInvoice(invoice: {
    publicId: string;
    title: string;
    description: string | null;
    studentUserId: number | null;
    studentEmail: string;
    studentName: string | null;
    amountMinor: number;
    currency: string;
    status: SchoolFeeInvoiceStatus;
    dueAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
  }): SchoolFeeInvoiceItem {
    return {
      id: invoice.publicId,
      title: invoice.title,
      description: invoice.description,
      studentUserId:
        typeof invoice.studentUserId === 'number' && Number.isFinite(invoice.studentUserId)
          ? String(invoice.studentUserId)
          : null,
      studentEmail: invoice.studentEmail,
      studentName: invoice.studentName,
      amount: this.toNaira(invoice.amountMinor),
      currency: invoice.currency,
      status: INVOICE_STATUS_FROM_PRISMA[invoice.status],
      dueDate: invoice.dueAt ? invoice.dueAt.toISOString() : null,
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      createdAt: invoice.createdAt.toISOString(),
      paymentLink: `/school-finance/pay/${encodeURIComponent(invoice.publicId)}`,
    };
  }

  private mapPayment(payment: SchoolFeePayment): SchoolFeePaymentItem {
    return {
      id: payment.publicId,
      invoiceId: String(payment.invoiceId),
      payerEmail: payment.payerEmail,
      grossAmount: this.toNaira(payment.grossAmountMinor),
      platformFee: this.toNaira(payment.platformFeeMinor),
      processingFee: this.toNaira(payment.processingFeeMinor),
      netAmount: this.toNaira(payment.netAmountMinor),
      currency: payment.currency,
      status: PAYMENT_STATUS_FROM_PRISMA[payment.status],
      settledAt: payment.settledAt ? payment.settledAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private mapPayout(payout: {
    publicId: string;
    amountMinor: number;
    currency: string;
    status: SchoolPayoutStatus;
    requestedAt: Date;
    processedAt: Date | null;
    failureReason: string | null;
    createdAt: Date;
  }): SchoolPayoutItem {
    return {
      id: payout.publicId,
      amount: this.toNaira(payout.amountMinor),
      currency: payout.currency,
      status: PAYOUT_STATUS_FROM_PRISMA[payout.status],
      requestedAt: payout.requestedAt.toISOString(),
      processedAt: payout.processedAt ? payout.processedAt.toISOString() : null,
      failureReason: payout.failureReason,
      createdAt: payout.createdAt.toISOString(),
    };
  }

  private mapReminderDispatch(
    dispatch: {
      publicId: string;
      studentEmail: string;
      reminderType: SchoolFeeReminderType;
      channel: SchoolFeeReminderChannel;
      status: SchoolFeeReminderDispatchStatus;
      reminderDate: Date;
      sentAt: Date | null;
      failureReason: string | null;
      createdAt: Date;
    },
    invoicePublicId: string,
    invoiceTitle: string
  ): SchoolFeeReminderDispatchItem {
    return {
      id: dispatch.publicId,
      invoiceId: invoicePublicId,
      invoiceTitle,
      studentEmail: dispatch.studentEmail,
      reminderType: REMINDER_TYPE_FROM_PRISMA[dispatch.reminderType],
      channel: REMINDER_CHANNEL_FROM_PRISMA[dispatch.channel],
      status: REMINDER_DISPATCH_STATUS_FROM_PRISMA[dispatch.status],
      reminderDate: dispatch.reminderDate.toISOString(),
      sentAt: dispatch.sentAt ? dispatch.sentAt.toISOString() : null,
      failureReason: dispatch.failureReason,
      createdAt: dispatch.createdAt.toISOString(),
    };
  }

  private mapPayoutLedgerEntry(
    entry: {
      publicId: string;
      previousStatus: SchoolPayoutStatus | null;
      nextStatus: SchoolPayoutStatus;
      amountMinor: number;
      currency: string;
      note: string | null;
      createdAt: Date;
    },
    payoutPublicId: string
  ): SchoolPayoutLedgerItem {
    return {
      id: entry.publicId,
      payoutId: payoutPublicId,
      previousStatus: entry.previousStatus ? PAYOUT_STATUS_FROM_PRISMA[entry.previousStatus] : null,
      nextStatus: PAYOUT_STATUS_FROM_PRISMA[entry.nextStatus],
      amount: this.toNaira(entry.amountMinor),
      currency: entry.currency,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private normalizePayoutStatusInput(value: string | undefined) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'requested') {
      return SchoolPayoutStatus.REQUESTED;
    }
    if (normalized === 'processing') {
      return SchoolPayoutStatus.PROCESSING;
    }
    if (normalized === 'paid') {
      return SchoolPayoutStatus.PAID;
    }
    if (normalized === 'failed') {
      return SchoolPayoutStatus.FAILED;
    }
    if (normalized === 'canceled') {
      return SchoolPayoutStatus.CANCELED;
    }

    throw new BadRequestException(
      'Payout status must be one of: requested, processing, paid, failed, canceled.'
    );
  }

  private assertValidPayoutStatusTransition(
    previous: SchoolPayoutStatus,
    next: SchoolPayoutStatus
  ) {
    if (previous === next) {
      return;
    }

    if (previous === SchoolPayoutStatus.REQUESTED) {
      if (
        next === SchoolPayoutStatus.PROCESSING ||
        next === SchoolPayoutStatus.PAID ||
        next === SchoolPayoutStatus.FAILED ||
        next === SchoolPayoutStatus.CANCELED
      ) {
        return;
      }
    }

    if (previous === SchoolPayoutStatus.PROCESSING) {
      if (
        next === SchoolPayoutStatus.PAID ||
        next === SchoolPayoutStatus.FAILED ||
        next === SchoolPayoutStatus.CANCELED
      ) {
        return;
      }
    }

    throw new BadRequestException(
      `Payout cannot move from ${PAYOUT_STATUS_FROM_PRISMA[previous]} to ${
        PAYOUT_STATUS_FROM_PRISMA[next]
      }.`
    );
  }

  private buildAccountDeltaForPayoutTransition(
    previous: SchoolPayoutStatus,
    next: SchoolPayoutStatus,
    amountMinor: number
  ): Prisma.SchoolFinanceAccountUpdateInput | null {
    const isTerminalTarget =
      next === SchoolPayoutStatus.PAID ||
      next === SchoolPayoutStatus.FAILED ||
      next === SchoolPayoutStatus.CANCELED;
    const wasTerminal =
      previous === SchoolPayoutStatus.PAID ||
      previous === SchoolPayoutStatus.FAILED ||
      previous === SchoolPayoutStatus.CANCELED;

    if (!isTerminalTarget || wasTerminal) {
      return null;
    }

    if (next === SchoolPayoutStatus.PAID) {
      return {
        onHoldMinor: {
          decrement: amountMinor,
        },
        totalWithdrawnMinor: {
          increment: amountMinor,
        },
      };
    }

    return {
      onHoldMinor: {
        decrement: amountMinor,
      },
      availableMinor: {
        increment: amountMinor,
      },
    };
  }

  private shouldSetPayoutProcessedAt(status: SchoolPayoutStatus) {
    return (
      status === SchoolPayoutStatus.PAID ||
      status === SchoolPayoutStatus.FAILED ||
      status === SchoolPayoutStatus.CANCELED
    );
  }

  private buildPayoutLedgerNote(status: SchoolPayoutStatus, customNote: string | null) {
    if (customNote) {
      return customNote;
    }

    if (status === SchoolPayoutStatus.PROCESSING) {
      return 'Payout moved into processing.';
    }
    if (status === SchoolPayoutStatus.PAID) {
      return 'Payout completed and funds moved out of hold balance.';
    }
    if (status === SchoolPayoutStatus.FAILED) {
      return 'Payout failed and funds were returned to available balance.';
    }
    if (status === SchoolPayoutStatus.CANCELED) {
      return 'Payout was canceled and funds were returned to available balance.';
    }
    return 'Payout status updated.';
  }

  private async createPayoutLedgerEntryTx(
    tx: Prisma.TransactionClient,
    input: {
      accountId: number;
      payoutId: number;
      amountMinor: number;
      currency: string;
      previousStatus: SchoolPayoutStatus | null;
      nextStatus: SchoolPayoutStatus;
      note?: string | null;
      metadata?: Record<string, unknown>;
    }
  ) {
    const mergedMetadata = {
      ...(input.metadata || {}),
    };

    await tx.schoolPayoutLedgerEntry.create({
      data: {
        publicId: this.createPublicId('WDL', input.accountId),
        accountId: input.accountId,
        payoutId: input.payoutId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        amountMinor: input.amountMinor,
        currency: input.currency,
        note: input.note || null,
        metadata:
          Object.keys(mergedMetadata).length > 0
            ? (mergedMetadata as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  private async refreshOverdueInvoicesForAccount(accountId: number) {
    await this.prisma.schoolFeeInvoice.updateMany({
      where: {
        accountId,
        status: SchoolFeeInvoiceStatus.PENDING,
        dueAt: {
          not: null,
          lt: new Date(),
        },
      },
      data: {
        status: SchoolFeeInvoiceStatus.OVERDUE,
      },
    });
  }

  private async refreshOverdueInvoicesGlobal(now: Date, accountId?: number) {
    await this.prisma.schoolFeeInvoice.updateMany({
      where: {
        ...(typeof accountId === 'number' ? { accountId } : {}),
        status: SchoolFeeInvoiceStatus.PENDING,
        dueAt: {
          not: null,
          lt: now,
        },
      },
      data: {
        status: SchoolFeeInvoiceStatus.OVERDUE,
      },
    });
  }

  private async refreshOverdueInvoicesForStudent(studentEmail: string, studentUserId: number | null) {
    const normalizedEmail = this.normalizeEmail(studentEmail);
    const targetFilters: Prisma.SchoolFeeInvoiceWhereInput[] = [];

    if (typeof studentUserId === 'number' && Number.isFinite(studentUserId)) {
      targetFilters.push({ studentUserId });
    }

    if (normalizedEmail) {
      targetFilters.push({
        studentEmail: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      });
    }

    if (targetFilters.length === 0) {
      return;
    }

    await this.prisma.schoolFeeInvoice.updateMany({
      where: {
        OR: targetFilters,
        status: SchoolFeeInvoiceStatus.PENDING,
        dueAt: {
          not: null,
          lt: new Date(),
        },
      },
      data: {
        status: SchoolFeeInvoiceStatus.OVERDUE,
      },
    });
  }

  private async createReminderDispatchIfMissing(input: {
    invoice: {
      id: number;
      publicId: string;
      accountId: number;
    };
    studentEmail: string;
    reminderType: SchoolFeeReminderType;
    channel: SchoolFeeReminderChannel;
    reminderDate: Date;
    status: SchoolFeeReminderDispatchStatus;
    sentAt?: Date | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.schoolFeeReminderDispatch.create({
        data: {
          publicId: this.createPublicId('RMD', input.invoice.accountId),
          invoiceId: input.invoice.id,
          invoicePublicId: input.invoice.publicId,
          accountId: input.invoice.accountId,
          studentEmail: input.studentEmail,
          reminderType: input.reminderType,
          channel: input.channel,
          status: input.status,
          reminderDate: input.reminderDate,
          sentAt: input.sentAt ?? null,
          failureReason: input.failureReason ?? null,
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
        },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }

      throw error;
    }
  }

  private async processQueuedReminderEmails(input: {
    accountId?: number;
    initiatedBy?: string;
  } = {}): Promise<ReminderEmailProcessingSummary> {
    if (!this.isReminderEmailDispatchEnabled()) {
      return {
        provider: 'disabled',
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
    }

    const provider = this.resolveReminderEmailProvider();
    const batchSize = this.resolveReminderEmailBatchSize();
    const queuedDispatches = await this.prisma.schoolFeeReminderDispatch.findMany({
      where: {
        ...(typeof input.accountId === 'number' ? { accountId: input.accountId } : {}),
        channel: SchoolFeeReminderChannel.EMAIL,
        status: SchoolFeeReminderDispatchStatus.QUEUED,
      },
      include: {
        invoice: {
          include: {
            account: {
              include: {
                schoolUser: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
      take: batchSize,
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const dispatch of queuedDispatches) {
      const normalizedEmail = this.normalizeEmail(dispatch.studentEmail);
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        await this.prisma.schoolFeeReminderDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: SchoolFeeReminderDispatchStatus.SKIPPED,
            sentAt: new Date(),
            failureReason: 'Student email is missing or invalid for reminder delivery.',
            metadata: this.mergeReminderDispatchMetadata(dispatch.metadata, {
              initiatedBy: input.initiatedBy || 'scheduler',
              outcome: 'skipped_invalid_email',
            }),
          },
        });
        skipped += 1;
        continue;
      }

      const invoice = dispatch.invoice;
      const schoolName = invoice.account.schoolUser.name || invoice.account.schoolUser.email || 'School';

      try {
        const providerResponse = await this.sendReminderEmail({
          provider,
          toEmail: normalizedEmail,
          subject: this.buildReminderEmailSubject({
            reminderType: dispatch.reminderType,
            schoolName,
            invoiceTitle: invoice.title,
          }),
          text: this.buildReminderEmailText({
            reminderType: dispatch.reminderType,
            schoolName,
            studentEmail: normalizedEmail,
            invoiceTitle: invoice.title,
            invoiceAmountMinor: invoice.amountMinor,
            currency: invoice.currency,
            dueAt: invoice.dueAt,
            paymentLink: `/school-finance/pay/${encodeURIComponent(invoice.publicId)}`,
          }),
        });

        await this.prisma.schoolFeeReminderDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: SchoolFeeReminderDispatchStatus.SENT,
            sentAt: new Date(),
            failureReason: null,
            metadata: this.mergeReminderDispatchMetadata(dispatch.metadata, {
              initiatedBy: input.initiatedBy || 'scheduler',
              provider: providerResponse.provider,
              providerMessageId: providerResponse.providerMessageId || null,
              outcome: 'sent',
            }),
          },
        });
        sent += 1;
      } catch (error) {
        const reason = this.truncateText(
          error instanceof Error ? error.message : 'Email dispatch failed.',
          500
        );
        await this.prisma.schoolFeeReminderDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: SchoolFeeReminderDispatchStatus.FAILED,
            sentAt: null,
            failureReason: reason,
            metadata: this.mergeReminderDispatchMetadata(dispatch.metadata, {
              initiatedBy: input.initiatedBy || 'scheduler',
              provider,
              outcome: 'failed',
              failureReason: reason,
            }),
          },
        });
        failed += 1;
      }
    }

    return {
      provider,
      attempted: queuedDispatches.length,
      sent,
      failed,
      skipped,
    };
  }

  private async sendReminderEmail(input: {
    provider: ReminderEmailProvider;
    toEmail: string;
    subject: string;
    text: string;
  }) {
    if (input.provider === 'log') {
      this.logger.log(
        `Reminder email (log provider) to ${input.toEmail}: ${input.subject}`
      );
      return {
        provider: 'log' as const,
        providerMessageId: null,
      };
    }

    if (input.provider === 'resend') {
      return this.sendReminderEmailWithResend(input);
    }

    throw new BadRequestException('Unsupported reminder email provider.');
  }

  private async sendReminderEmailWithResend(input: {
    toEmail: string;
    subject: string;
    text: string;
  }) {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      throw new BadRequestException(
        'RESEND_API_KEY is required when SCHOOL_FEE_REMINDER_EMAIL_PROVIDER=resend.'
      );
    }

    const controller = new AbortController();
    const timeoutMs = this.resolveReminderEmailTimeoutMs();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.resolveReminderEmailFrom(),
          reply_to: this.resolveReminderEmailReplyTo() || undefined,
          to: [input.toEmail],
          subject: input.subject,
          text: input.text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(
          `Resend API request failed (${response.status}): ${this.truncateText(
            responseBody || 'no response body',
            300
          )}`
        );
      }

      const payload = (await response.json()) as { id?: string };
      return {
        provider: 'resend' as const,
        providerMessageId: String(payload.id || '').trim() || null,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private buildReminderEmailSubject(input: {
    reminderType: SchoolFeeReminderType;
    schoolName: string;
    invoiceTitle: string;
  }) {
    if (input.reminderType === SchoolFeeReminderType.OVERDUE) {
      return `${input.schoolName}: overdue payment reminder for ${input.invoiceTitle}`;
    }
    return `${input.schoolName}: payment due soon for ${input.invoiceTitle}`;
  }

  private buildReminderEmailText(input: {
    reminderType: SchoolFeeReminderType;
    schoolName: string;
    studentEmail: string;
    invoiceTitle: string;
    invoiceAmountMinor: number;
    currency: string;
    dueAt: Date | null;
    paymentLink: string;
  }) {
    const dueLabel = input.dueAt
      ? input.dueAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'No due date set';

    const amountLabel = `${input.currency} ${this.toNaira(input.invoiceAmountMinor).toLocaleString()}`;
    const opening =
      input.reminderType === SchoolFeeReminderType.OVERDUE
        ? `Your payment for "${input.invoiceTitle}" is overdue.`
        : `Your payment for "${input.invoiceTitle}" is due soon.`;

    return [
      `Hello,`,
      '',
      `${input.schoolName} sent you a school fee reminder.`,
      opening,
      `Amount: ${amountLabel}`,
      `Due date: ${dueLabel}`,
      '',
      `Pay here: ${this.resolveAppBaseUrl()}${input.paymentLink}`,
      '',
      `If you already paid, please ignore this message.`,
      '',
      `- Edamaa`,
    ].join('\n');
  }

  private mergeReminderDispatchMetadata(
    existing: Prisma.JsonValue | null | undefined,
    patch: Record<string, unknown>
  ): Prisma.InputJsonValue {
    const baseline =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    return {
      ...baseline,
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue;
  }

  private normalizeReminderType(value: string | undefined): SchoolFeeReminderType | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized === 'due_soon' || normalized === 'due-soon') {
      return SchoolFeeReminderType.DUE_SOON;
    }
    if (normalized === 'overdue') {
      return SchoolFeeReminderType.OVERDUE;
    }

    throw new BadRequestException('Reminder type must be one of: due_soon, overdue.');
  }

  private normalizeReminderChannel(value: string | undefined): SchoolFeeReminderChannel | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized === 'in_app' || normalized === 'in-app' || normalized === 'inapp') {
      return SchoolFeeReminderChannel.IN_APP;
    }
    if (normalized === 'email') {
      return SchoolFeeReminderChannel.EMAIL;
    }

    throw new BadRequestException('Reminder channel must be one of: in_app, email.');
  }

  private normalizeReminderDispatchStatus(
    value: string | undefined
  ): SchoolFeeReminderDispatchStatus | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized === 'queued') {
      return SchoolFeeReminderDispatchStatus.QUEUED;
    }
    if (normalized === 'sent') {
      return SchoolFeeReminderDispatchStatus.SENT;
    }
    if (normalized === 'failed') {
      return SchoolFeeReminderDispatchStatus.FAILED;
    }
    if (normalized === 'skipped') {
      return SchoolFeeReminderDispatchStatus.SKIPPED;
    }

    throw new BadRequestException('Reminder status must be one of: queued, sent, failed, skipped.');
  }

  private normalizeReminderDispatchLimit(value: number | string | undefined) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 80;
    }

    return Math.min(200, Math.max(1, Math.round(parsed)));
  }

  private resolveReminderDueSoonWindowMs() {
    const fromEnv = Number(process.env.SCHOOL_FEE_DUE_SOON_WINDOW_HOURS || '');
    const hours = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 72;
    return Math.round(hours * 60 * 60 * 1000);
  }

  private isReminderEmailDispatchEnabled() {
    const value = String(process.env.SCHOOL_FEE_REMINDER_EMAIL_ENABLED || '').trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes' || value === 'on';
  }

  private resolveReminderEmailProvider(): ReminderEmailProvider {
    const value = String(process.env.SCHOOL_FEE_REMINDER_EMAIL_PROVIDER || '')
      .trim()
      .toLowerCase();
    if (!value || value === 'resend') {
      return 'resend';
    }
    if (value === 'log') {
      return 'log';
    }
    throw new BadRequestException('SCHOOL_FEE_REMINDER_EMAIL_PROVIDER must be "resend" or "log".');
  }

  private resolveReminderEmailBatchSize() {
    const fromEnv = Number(process.env.SCHOOL_FEE_REMINDER_EMAIL_BATCH_SIZE || '');
    if (!Number.isFinite(fromEnv)) {
      return 40;
    }
    return Math.min(200, Math.max(1, Math.round(fromEnv)));
  }

  private resolveReminderEmailTimeoutMs() {
    const fromEnv = Number(process.env.SCHOOL_FEE_REMINDER_EMAIL_TIMEOUT_MS || '');
    if (!Number.isFinite(fromEnv) || fromEnv < 1000) {
      return 15000;
    }
    return Math.round(fromEnv);
  }

  private resolveReminderEmailFrom() {
    const value = String(process.env.SCHOOL_FEE_REMINDER_EMAIL_FROM || '').trim();
    return value || 'Edamaa <reminders@edamaa.app>';
  }

  private resolveReminderEmailReplyTo() {
    const value = String(process.env.SCHOOL_FEE_REMINDER_EMAIL_REPLY_TO || '').trim();
    return value || '';
  }

  private toUtcDateBucket(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
  }

  private truncateText(value: string, maxLength: number) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  private normalizeInvoiceStatus(value: string | undefined): SchoolFeeInvoiceStatus | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    if (normalized === 'partially_paid') {
      return SchoolFeeInvoiceStatus.PARTIALLY_PAID;
    }

    if (
      normalized === 'draft' ||
      normalized === 'pending' ||
      normalized === 'paid' ||
      normalized === 'overdue' ||
      normalized === 'canceled'
    ) {
      return INVOICE_STATUS_TO_PRISMA[normalized];
    }

    throw new BadRequestException(
      'Status must be one of: draft, pending, partially_paid, paid, overdue, canceled.'
    );
  }

  private parseAmountToMinor(value: number | undefined, label: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }

    return Math.round(parsed * 100);
  }

  private normalizeDueDays(value: number | null | undefined) {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('dueDays must be zero or a positive number.');
    }

    return Math.round(parsed);
  }

  private parseDate(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid dueDate value.');
    }

    return parsed;
  }

  private normalizeOptionalText(value: string | undefined | null) {
    const normalized = String(value || '').trim();
    return normalized ? normalized : null;
  }

  private calculateFeeBreakdown(grossAmountMinor: number) {
    const platformFeeBps = this.resolveBasisPoints('SCHOOL_FEE_PLATFORM_FEE_BPS', 500);
    const processingFeeBps = this.resolveBasisPoints('SCHOOL_FEE_PROCESSING_FEE_BPS', 150);

    const platformFeeMinor = Math.max(0, Math.round((grossAmountMinor * platformFeeBps) / 10000));
    const processingFeeMinor = Math.max(0, Math.round((grossAmountMinor * processingFeeBps) / 10000));
    const netAmountMinor = Math.max(0, grossAmountMinor - platformFeeMinor - processingFeeMinor);

    return {
      grossAmountMinor,
      platformFeeMinor,
      processingFeeMinor,
      netAmountMinor,
    };
  }

  private resolveBasisPoints(envKey: string, fallbackBps: number) {
    const fromEnv = Number(process.env[envKey] || '');
    if (!Number.isFinite(fromEnv) || fromEnv < 0) {
      return fallbackBps;
    }

    return Math.round(fromEnv);
  }

  private requireStripeClient() {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe checkout is not configured yet. Set STRIPE_API_KEY on the backend.'
      );
    }

    return this.stripe;
  }

  private requireEmail(authUser: AuthUser) {
    const email = this.normalizeEmail(authUser.email || '');
    if (!email || !email.includes('@')) {
      throw new UnauthorizedException('Authenticated user email is required.');
    }
    return email;
  }

  private assertSchoolRole(role: string) {
    if (!this.isSchoolRole(role)) {
      throw new ForbiddenException('Only school accounts can access this finance workspace.');
    }
  }

  private isSchoolRole(role: string) {
    return (
      role === 'school' ||
      role === 'school-admin' ||
      role === 'school-owner' ||
      role === 'admin'
    );
  }

  private normalizeRole(value: string | null | undefined) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }

  private normalizeDisplayName(name: string | null | undefined, email: string) {
    const normalized = String(name || '').trim();
    if (normalized) {
      return normalized;
    }

    const emailPrefix = email.split('@')[0] || 'School User';
    return emailPrefix
      .split(/[._-]+/g)
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }

  private normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
  }

  private normalizeOptionalNumericId(value: string | number | null | undefined, label: string) {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${label} is invalid.`);
    }

    return parsed;
  }

  private async resolveInvoiceStudentTarget(input: {
    studentUserId?: string;
    studentEmail?: string;
    studentName?: string;
  }) {
    const requestedStudentUserId = this.normalizeOptionalNumericId(input.studentUserId, 'Student');
    const requestedStudentEmail = this.normalizeEmail(input.studentEmail || '');
    const requestedStudentName = this.normalizeOptionalText(input.studentName);
    let resolvedStudentUser:
      | {
          id: number;
          email: string;
          name: string | null;
          role: string;
        }
      | null = null;

    if (requestedStudentUserId) {
      resolvedStudentUser = await this.prisma.user.findUnique({
        where: { id: requestedStudentUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      if (!resolvedStudentUser) {
        throw new NotFoundException('Selected student account was not found.');
      }

      if (
        requestedStudentEmail &&
        this.normalizeEmail(resolvedStudentUser.email) !== requestedStudentEmail
      ) {
        throw new BadRequestException(
          'Selected student does not match the provided email. Pick one student record.'
        );
      }
    }

    if (!resolvedStudentUser && requestedStudentEmail) {
      resolvedStudentUser = await this.prisma.user.findFirst({
        where: {
          email: {
            equals: requestedStudentEmail,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    }

    const resolvedEmail = this.normalizeEmail(resolvedStudentUser?.email || requestedStudentEmail);
    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      throw new BadRequestException('Choose a student or enter a valid student email.');
    }

    const resolvedName =
      requestedStudentName ||
      this.normalizeOptionalText(resolvedStudentUser?.name || '') ||
      (await this.resolveStudentNameByEmail(resolvedEmail));

    return {
      userId: resolvedStudentUser?.id || null,
      email: resolvedEmail,
      name: resolvedName,
    };
  }

  private async getReadInvoiceNotificationIds(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return new Set<string>();
    }

    const reads = await this.prisma.schoolFeeInvoiceNotificationRead.findMany({
      where: {
        userEmail: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        notificationId: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 600,
    });

    return new Set(reads.map((entry) => entry.notificationId));
  }

  private async markInvoiceNotificationRead(
    email: string,
    notification: SchoolFeeInvoiceNotificationItem
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return;
    }

    await this.prisma.schoolFeeInvoiceNotificationRead.upsert({
      where: {
        userEmail_notificationId: {
          userEmail: normalizedEmail,
          notificationId: notification.id,
        },
      },
      update: {
        invoicePublicId: notification.invoiceId,
        kind: notification.kind,
        readAt: new Date(),
      },
      create: {
        publicId: this.createPublicId('NTR', 0),
        userEmail: normalizedEmail,
        notificationId: notification.id,
        invoicePublicId: notification.invoiceId,
        kind: notification.kind,
      },
    });
  }

  private async markInvoiceNotificationsRead(
    email: string,
    notifications: SchoolFeeInvoiceNotificationItem[]
  ) {
    const unreadNotifications = notifications.filter((notification) => !notification.isRead);
    if (unreadNotifications.length === 0) {
      return;
    }

    await Promise.all(
      unreadNotifications.map((notification) =>
        this.markInvoiceNotificationRead(email, notification)
      )
    );
  }

  private toStudentInvoiceNotificationItems(
    invoice: SchoolFeeInvoiceItem & {
      schoolName: string;
    },
    readIds: Set<string>
  ): SchoolFeeInvoiceNotificationItem[] {
    const notifications: SchoolFeeInvoiceNotificationItem[] = [];
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const now = new Date();
    const isOutstanding = invoice.status !== 'paid' && invoice.status !== 'canceled';
    const isOverdue = Boolean(
      dueDate && dueDate.getTime() < now.getTime() && isOutstanding
    );

    notifications.push(
      this.buildStudentInvoiceNotification(invoice, 'new_invoice', readIds, {
        title: `${invoice.schoolName} posted a new invoice`,
        message: `${invoice.title} - ₦${invoice.amount.toLocaleString()}${
          dueDate ? ` • Due ${dueDate.toLocaleDateString()}` : ''
        }`,
        createdAt: invoice.createdAt,
      })
    );

    if (!isOverdue && this.isInvoiceDueSoon(dueDate, now) && isOutstanding) {
      notifications.push(
        this.buildStudentInvoiceNotification(invoice, 'due_soon', readIds, {
          title: `${invoice.title} is due soon`,
          message: `Please pay ₦${invoice.amount.toLocaleString()} before ${dueDate?.toLocaleDateString()} to avoid overdue penalties.`,
          createdAt: new Date(
            Math.max(new Date(invoice.createdAt).getTime(), dueDate!.getTime() - 1000)
          ).toISOString(),
        })
      );
    }

    if (isOverdue) {
      notifications.push(
        this.buildStudentInvoiceNotification(invoice, 'overdue_reminder', readIds, {
          title: `${invoice.title} is overdue`,
          message: `Your payment of ₦${invoice.amount.toLocaleString()} is overdue. Please settle this invoice as soon as possible.`,
          createdAt: (dueDate || new Date(invoice.createdAt)).toISOString(),
        })
      );
    }

    return notifications;
  }

  private buildStudentInvoiceNotification(
    invoice: SchoolFeeInvoiceItem & {
      schoolName: string;
    },
    kind: SchoolFeeInvoiceNotificationItem['kind'],
    readIds: Set<string>,
    input: {
      title: string;
      message: string;
      createdAt: string;
    }
  ): SchoolFeeInvoiceNotificationItem {
    const id = this.buildInvoiceNotificationId(invoice.id, kind);
    const isLegacyRead = kind === 'new_invoice' && readIds.has(invoice.id);

    return {
      id,
      kind,
      invoiceId: invoice.id,
      schoolName: invoice.schoolName,
      title: input.title,
      message: input.message,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: input.createdAt,
      isRead: isLegacyRead || readIds.has(id),
    };
  }

  private buildInvoiceNotificationId(invoiceId: string, kind: SchoolFeeInvoiceNotificationItem['kind']) {
    return `${invoiceId}:${kind}`;
  }

  private isInvoiceDueSoon(dueDate: Date | null, now: Date) {
    if (!dueDate) {
      return false;
    }

    const deltaMs = dueDate.getTime() - now.getTime();
    const dueSoonWindowMs = 1000 * 60 * 60 * 24 * 3;
    return deltaMs > 0 && deltaMs <= dueSoonWindowMs;
  }

  private async resolveStudentNameByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return null;
    }

    const student = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
      },
    });

    return this.normalizeOptionalText(student?.name || '');
  }

  private async resolveOrCreateUser(email: string, displayName: string, defaultRole: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      const needsRoleUpgrade =
        defaultRole === 'school' &&
        !this.isSchoolRole(this.normalizeRole(existing.role));

      if (needsRoleUpgrade) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { role: 'school' },
        });
      }

      return existing;
    }

    try {
      return await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          role: defaultRole || 'student',
        },
      });
    } catch (error) {
      // Parallel requests can race on first user creation.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentUser = await this.prisma.user.findFirst({
          where: {
            email: {
              equals: normalizedEmail,
              mode: 'insensitive',
            },
          },
        });

        if (concurrentUser) {
          return concurrentUser;
        }
      }

      throw error;
    }
  }

  private async getOrCreateSchoolFinanceAccount(schoolUserId: number) {
    const existing = await this.prisma.schoolFinanceAccount.findUnique({
      where: { schoolUserId },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prisma.schoolFinanceAccount.create({
        data: {
          publicId: this.createPublicId('SFA', schoolUserId),
          schoolUserId,
          currency: 'NGN',
        },
      });
    } catch (error) {
      // Parallel dashboard requests can race on first account creation.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentAccount = await this.prisma.schoolFinanceAccount.findUnique({
          where: { schoolUserId },
        });
        if (concurrentAccount) {
          return concurrentAccount;
        }
      }

      throw error;
    }
  }

  private createPublicId(prefix: string, userId: number) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `${prefix}-${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }

  private toNaira(amountMinor: number) {
    return Math.round(amountMinor / 100);
  }

  private normalizeHttpUrl(urlValue: string | undefined) {
    const value = String(urlValue || '').trim();
    if (!value) {
      return '';
    }

    return /^https?:\/\//i.test(value) ? value : '';
  }

  private resolveAppBaseUrl() {
    const envBase =
      this.normalizeHttpUrl(process.env.PAYMENTS_APP_BASE_URL) ||
      this.normalizeHttpUrl(process.env.FRONTEND_APP_URL);
    return (envBase || 'http://127.0.0.1:5173').replace(/\/+$/, '');
  }
}
