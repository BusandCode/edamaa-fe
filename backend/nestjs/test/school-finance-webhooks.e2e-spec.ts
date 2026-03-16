import { Test } from '@nestjs/testing';
import { Request } from 'express';
import { SchoolFinanceController } from '../src/school-finance/school-finance.controller';
import { SchoolFinanceService } from '../src/school-finance/school-finance.service';
import { SupabaseService } from '../src/supabase/supabase.service';
import { WebhooksController } from '../src/webhooks/webhooks.controller';
import { WebhooksService } from '../src/webhooks/webhooks.service';

describe('SchoolFinance + Webhooks (route contract)', () => {
  let schoolFinanceController: SchoolFinanceController;
  let webhooksController: WebhooksController;

  const schoolFinanceServiceMock = {
    getSchoolDashboardForAuthUser: jest.fn(),
    createFeePlanForAuthUser: jest.fn(),
    listSchoolInvoicesForAuthUser: jest.fn(),
    listReminderDispatchesForAuthUser: jest.fn(),
    getReminderDeliveryHealthForAuthUser: jest.fn(),
    recordReminderExportAuditForAuthUser: jest.fn(),
    runReminderSweepForAuthUser: jest.fn(),
    processQueuedReminderEmailsForAuthUser: jest.fn(),
    requeueFailedReminderEmailsForAuthUser: jest.fn(),
    requeueExhaustedReminderEmailsForAuthUser: jest.fn(),
    createInvoiceForAuthUser: jest.fn(),
    listStudentInvoicesForAuthUser: jest.fn(),
    payInvoiceForAuthUser: jest.fn(),
    syncInvoiceCheckoutForAuthUser: jest.fn(),
    getInvoiceCheckoutStatusForAuthUser: jest.fn(),
    listWithdrawalsForAuthUser: jest.fn(),
    createWithdrawalForAuthUser: jest.fn(),
    advanceWithdrawalStatusForAuthUser: jest.fn(),
    getWithdrawalLedgerForAuthUser: jest.fn(),
  };

  const webhooksServiceMock = {
    handleStripeEvent: jest.fn(),
    handleMuxEvent: jest.fn(),
  };

  const authRequest = {
    user: {
      id: 'test-user-id',
      email: 'school@edamaa.dev',
      role: 'school',
      user_metadata: {
        full_name: 'School Admin',
      },
      app_metadata: {
        role: 'school',
      },
    },
  } as unknown as Request;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SchoolFinanceController, WebhooksController],
      providers: [
        {
          provide: SchoolFinanceService,
          useValue: schoolFinanceServiceMock,
        },
        {
          provide: WebhooksService,
          useValue: webhooksServiceMock,
        },
        {
          provide: SupabaseService,
          useValue: {
            getUserFromAuthHeader: jest.fn().mockResolvedValue({
              id: 'test-user-id',
              email: 'school@edamaa.dev',
              role: 'school',
            }),
          },
        },
      ],
    }).compile();

    schoolFinanceController = moduleRef.get(SchoolFinanceController);
    webhooksController = moduleRef.get(WebhooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns webhook-first checkout status for school invoice payments', async () => {
    const payload = {
      checkoutSessionId: 'cs_test_123',
      paymentStatus: 'paid',
      isSettled: true,
      needsManualSync: false,
      reconciliationSource: 'webhook',
      invoice: null,
      payment: null,
    };
    schoolFinanceServiceMock.getInvoiceCheckoutStatusForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.getInvoiceCheckoutStatus(
      authRequest,
      'cs_test_123'
    );

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.getInvoiceCheckoutStatusForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
        role: 'school',
      }),
      'cs_test_123'
    );
  });

  it('updates payout lifecycle status', async () => {
    const payload = {
      payout: {
        id: 'WDR-TEST-1',
        amount: 50000,
        currency: 'NGN',
        status: 'processing',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 2,
      },
      wallet: {
        available: 150000,
        pending: 0,
        onHold: 50000,
        lifetimeGross: 400000,
        lifetimeNet: 360000,
        totalWithdrawn: 100000,
      },
      message: 'Payout status updated successfully.',
    };
    schoolFinanceServiceMock.advanceWithdrawalStatusForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.updateWithdrawalStatus(authRequest, 'WDR-TEST-1', {
      status: 'processing',
    });

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.advanceWithdrawalStatusForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
        role: 'school',
      }),
      expect.objectContaining({
        payoutId: 'WDR-TEST-1',
        status: 'processing',
      })
    );
  });

  it('returns payout ledger timeline', async () => {
    const payload = {
      payout: {
        id: 'WDR-TEST-2',
        amount: 30000,
        currency: 'NGN',
        status: 'paid',
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 3,
      },
      ledger: [
        {
          id: 'WDL-1',
          payoutId: 'WDR-TEST-2',
          previousStatus: null,
          nextStatus: 'requested',
          amount: 30000,
          currency: 'NGN',
          note: 'Withdrawal requested and moved to hold balance.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    schoolFinanceServiceMock.getWithdrawalLedgerForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.getWithdrawalLedger(authRequest, 'WDR-TEST-2');

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.getWithdrawalLedgerForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
      }),
      'WDR-TEST-2'
    );
  });

  it('passes reminder dispatch pagination filters', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      total: 42,
      page: 2,
      limit: 10,
      totalPages: 5,
      hasMore: true,
      dispatches: [],
    };
    schoolFinanceServiceMock.listReminderDispatchesForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.listMyReminderDispatches(
      authRequest,
      'due_soon',
      'email',
      'failed',
      '10',
      '2'
    );

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.listReminderDispatchesForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
        role: 'school',
      }),
      expect.objectContaining({
        reminderType: 'due_soon',
        channel: 'email',
        status: 'failed',
        limit: 10,
        page: 2,
      })
    );
  });

  it('returns reminder health summary with days filter', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      accountId: 12,
      windowDays: 7,
      windowStart: new Date(Date.now() - 7 * 86400000).toISOString(),
      email: {
        queued: 1,
        sent: 12,
        failed: 3,
        skipped: 0,
        retryableFailed: 2,
        exhausted: 1,
        attempted: 15,
        successRate: 0.8,
        failureRate: 0.2,
        retryRate: 0.1333,
        exhaustedRate: 0.0667,
      },
    };
    schoolFinanceServiceMock.getReminderDeliveryHealthForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.getMyReminderHealth(authRequest, '7');

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.getReminderDeliveryHealthForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
      }),
      expect.objectContaining({
        days: 7,
      })
    );
  });

  it('requires and forwards confirm phrase for exhausted reminder requeue', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      accountId: 12,
      selected: 4,
      requeued: 4,
      maxRetries: 4,
    };
    schoolFinanceServiceMock.requeueExhaustedReminderEmailsForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.requeueExhaustedReminderEmails(authRequest, {
      limit: 20,
      confirm: 'REQUEUE_EXHAUSTED',
    });

    expect(response).toEqual(payload);
    expect(
      schoolFinanceServiceMock.requeueExhaustedReminderEmailsForAuthUser
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
      }),
      expect.objectContaining({
        limit: 20,
        confirm: 'REQUEUE_EXHAUSTED',
      })
    );
  });

  it('records reminder export audit payload', async () => {
    const payload = {
      auditId: 'RPT-0001-ABC123',
      generatedAt: new Date().toISOString(),
      accountId: 12,
      format: 'csv',
      filters: {
        channel: 'email',
        status: 'failed',
        page: 1,
        limit: 200,
        totalExported: 64,
      },
    };
    schoolFinanceServiceMock.recordReminderExportAuditForAuthUser.mockResolvedValue(payload);

    const response = await schoolFinanceController.recordMyReminderExportAudit(authRequest, {
      format: 'csv',
      filters: payload.filters,
    });

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.recordReminderExportAuditForAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'school@edamaa.dev',
      }),
      expect.objectContaining({
        format: 'csv',
        filters: payload.filters,
      })
    );
  });

  it('school creates invoice, student pays, and school balance increases', async () => {
    const nowIso = new Date().toISOString();
    const invoice = {
      id: 'INV-0007-TST100',
      title: 'Second Term Tuition',
      description: 'Core term fee',
      studentUserId: '55',
      studentEmail: 'student@edamaa.dev',
      studentName: 'Jane Student',
      amount: 10000,
      currency: 'NGN',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      paidAt: null as string | null,
      createdAt: nowIso,
      paymentLink: '/school-finance/pay/INV-0007-TST100',
    };
    const settledPayment = {
      id: 'PAY-0007-TST900',
      invoiceId: invoice.id,
      payerEmail: invoice.studentEmail,
      grossAmount: 10000,
      platformFee: 500,
      processingFee: 150,
      netAmount: 9350,
      currency: 'NGN',
      status: 'settled',
      settledAt: nowIso,
      createdAt: nowIso,
    };
    let availableBalance = 0;

    schoolFinanceServiceMock.createInvoiceForAuthUser.mockImplementation(async () => ({
      invoice,
      message: 'Invoice created and ready for student payment.',
    }));
    schoolFinanceServiceMock.payInvoiceForAuthUser.mockImplementation(async () => {
      invoice.status = 'paid';
      invoice.paidAt = nowIso;
      availableBalance += settledPayment.netAmount;
      return {
        mode: 'settled',
        checkoutUrl: null,
        checkoutSessionId: null,
        message: 'Payment completed successfully.',
        invoice,
        payment: settledPayment,
        wallet: {
          available: availableBalance,
          pending: 0,
          onHold: 0,
          lifetimeGross: settledPayment.grossAmount,
          lifetimeNet: settledPayment.netAmount,
          totalWithdrawn: 0,
        },
      };
    });
    schoolFinanceServiceMock.getSchoolDashboardForAuthUser.mockImplementation(async () => ({
      generatedAt: nowIso,
      school: {
        financeAccountId: 'SFA-0007-TST300',
        name: 'Edamaa School',
        email: 'school@edamaa.dev',
        currency: 'NGN',
      },
      wallet: {
        available: availableBalance,
        pending: 0,
        onHold: 0,
        lifetimeGross: settledPayment.grossAmount,
        lifetimeNet: settledPayment.netAmount,
        totalWithdrawn: 0,
      },
      overview: {
        totalInvoices: 1,
        outstandingAmount: 0,
        paidInvoices: 1,
        pendingInvoices: 0,
        overdueInvoices: 0,
      },
      feePlans: [],
      recentInvoices: [invoice],
      recentPayments: [settledPayment],
      recentPayouts: [],
    }));

    const studentRequest = {
      ...authRequest,
      user: {
        ...authRequest.user,
        email: 'student@edamaa.dev',
        role: 'student',
        app_metadata: { role: 'student' },
      },
    } as unknown as Request;

    const created = await schoolFinanceController.createInvoice(authRequest, {
      title: invoice.title,
      amount: invoice.amount,
      studentUserId: invoice.studentUserId,
      studentEmail: invoice.studentEmail,
      studentName: invoice.studentName,
      dueDate: invoice.dueDate,
    });

    expect(created.invoice.id).toBe(invoice.id);
    expect(created.invoice.status).toBe('pending');

    const paid = await schoolFinanceController.payInvoice(studentRequest, invoice.id, {});
    expect(paid.mode).toBe('settled');
    expect(paid.invoice.status).toBe('paid');

    const dashboard = await schoolFinanceController.getMyDashboard(authRequest);
    expect(dashboard.wallet.available).toBe(settledPayment.netAmount);
    expect(dashboard.recentInvoices[0].status).toBe('paid');
    expect(dashboard.recentPayments).toHaveLength(1);
    expect(dashboard.recentPayments[0].invoiceId).toBe(invoice.id);
  });

  it('paid invoice balance can be withdrawn and reflected in wallet totals', async () => {
    const nowIso = new Date().toISOString();
    const requestedPayout = {
      id: 'WDR-0007-TST300',
      amount: 9350,
      currency: 'NGN',
      status: 'requested',
      requestedAt: nowIso,
      processedAt: null as string | null,
      failureReason: null as string | null,
      createdAt: nowIso,
      ledgerCount: 1,
    };

    schoolFinanceServiceMock.createWithdrawalForAuthUser.mockResolvedValue({
      payout: requestedPayout,
      wallet: {
        available: 0,
        pending: 0,
        onHold: 9350,
        lifetimeGross: 10000,
        lifetimeNet: 9350,
        totalWithdrawn: 0,
      },
      message: 'Withdrawal request received. Funds are on hold while payout moves through processing.',
    });

    schoolFinanceServiceMock.advanceWithdrawalStatusForAuthUser.mockResolvedValue({
      payout: {
        ...requestedPayout,
        status: 'paid',
        processedAt: nowIso,
        ledgerCount: 2,
      },
      wallet: {
        available: 0,
        pending: 0,
        onHold: 0,
        lifetimeGross: 10000,
        lifetimeNet: 9350,
        totalWithdrawn: 9350,
      },
      message: 'Payout status updated successfully.',
    });

    const requested = await schoolFinanceController.createWithdrawal(authRequest, {
      amount: 9350,
    });
    expect(requested.payout.status).toBe('requested');
    expect(requested.wallet.onHold).toBe(9350);

    const settled = await schoolFinanceController.updateWithdrawalStatus(authRequest, requestedPayout.id, {
      status: 'paid',
      note: 'Settled by finance ops',
    });
    expect(settled.payout.status).toBe('paid');
    expect(settled.wallet.totalWithdrawn).toBe(9350);
  });

  it('accepts Stripe webhooks and forwards payload to service', async () => {
    const payload = {
      received: true,
      webhookEventId: 17,
      queued: false,
    };
    webhooksServiceMock.handleStripeEvent.mockResolvedValue(payload);

    const rawRequest = {
      body: Buffer.from(
        JSON.stringify({
          id: 'evt_123',
          type: 'checkout.session.completed',
        })
      ),
    } as unknown as Request;

    const response = await webhooksController.stripe(rawRequest, 'sig_test_123');

    expect(response).toEqual(payload);
    expect(webhooksServiceMock.handleStripeEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      'sig_test_123'
    );
  });
});
