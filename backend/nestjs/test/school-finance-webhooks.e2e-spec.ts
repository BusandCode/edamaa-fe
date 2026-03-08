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
