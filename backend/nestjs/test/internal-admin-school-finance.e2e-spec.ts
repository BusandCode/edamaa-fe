import { Test } from '@nestjs/testing';
import { InternalAdminController } from '../src/internal-admin/internal-admin.controller';
import { DjangoAdminClientService } from '../src/internal-admin/django-admin-client.service';
import { SchoolFinanceService } from '../src/school-finance/school-finance.service';

describe('InternalAdmin school finance (route contract)', () => {
  let controller: InternalAdminController;

  const djangoAdminClientMock = {
    isConfigured: jest.fn().mockReturnValue(true),
    health: jest.fn().mockResolvedValue({ status: 'ok' }),
    webhookAnalytics: jest.fn().mockResolvedValue({ total_events: 0 }),
    userRoleAnalytics: jest.fn().mockResolvedValue({ roles: [] }),
  };

  const schoolFinanceServiceMock = {
    listPayoutQueueForInternalAdmin: jest.fn(),
    advancePayoutStatusForInternalAdmin: jest.fn(),
    getWithdrawalLedgerForInternalAdmin: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InternalAdminController],
      providers: [
        {
          provide: DjangoAdminClientService,
          useValue: djangoAdminClientMock,
        },
        {
          provide: SchoolFinanceService,
          useValue: schoolFinanceServiceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(InternalAdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists payout queue with parsed filters', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      page: 2,
      limit: 25,
      total: 9,
      totalPages: 1,
      hasMore: false,
      statusFilter: 'requested',
      search: 'edamaa',
      summary: {
        requested: 4,
        processing: 2,
        paid: 2,
        failed: 1,
        canceled: 0,
      },
      payouts: [],
    };
    schoolFinanceServiceMock.listPayoutQueueForInternalAdmin.mockResolvedValue(payload);

    const response = await controller.listSchoolFinancePayoutQueue(
      'requested',
      'edamaa',
      '2',
      '25'
    );

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.listPayoutQueueForInternalAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'requested',
        search: 'edamaa',
        page: 2,
        limit: 25,
      })
    );
  });

  it('updates payout status from internal admin', async () => {
    const payload = {
      payout: {
        id: 'WDR-0001-TST',
        amount: 50000,
        currency: 'NGN',
        status: 'paid',
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 3,
      },
      wallet: {
        available: 120000,
        pending: 0,
        onHold: 0,
        lifetimeGross: 200000,
        lifetimeNet: 185000,
        totalWithdrawn: 65000,
      },
      message: 'Payout status updated successfully by internal admin.',
    };
    schoolFinanceServiceMock.advancePayoutStatusForInternalAdmin.mockResolvedValue(payload);

    const response = await controller.updateSchoolFinancePayoutStatus('WDR-0001-TST', {
      status: 'paid',
      note: 'Approved by finance ops',
      processedBy: 'ops@edamaa.dev',
    });

    expect(response).toEqual(payload);
    expect(
      schoolFinanceServiceMock.advancePayoutStatusForInternalAdmin
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        payoutId: 'WDR-0001-TST',
        status: 'paid',
        note: 'Approved by finance ops',
        processedBy: 'ops@edamaa.dev',
      })
    );
  });

  it('returns payout ledger for internal admin', async () => {
    const payload = {
      payout: {
        id: 'WDR-0002-TST',
        amount: 30000,
        currency: 'NGN',
        status: 'processing',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 2,
      },
      school: {
        financeAccountId: 'SFA-0001-TST',
        schoolUserId: '77',
        name: 'Edamaa School',
        email: 'school@edamaa.dev',
      },
      wallet: {
        available: 80000,
        pending: 0,
        onHold: 30000,
        lifetimeGross: 150000,
        lifetimeNet: 139500,
        totalWithdrawn: 40000,
      },
      ledger: [
        {
          id: 'WDL-0001-TST',
          payoutId: 'WDR-0002-TST',
          previousStatus: null,
          nextStatus: 'requested',
          amount: 30000,
          currency: 'NGN',
          note: 'Withdrawal requested.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
    schoolFinanceServiceMock.getWithdrawalLedgerForInternalAdmin.mockResolvedValue(payload);

    const response = await controller.getSchoolFinancePayoutLedger('WDR-0002-TST');

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.getWithdrawalLedgerForInternalAdmin).toHaveBeenCalledWith(
      'WDR-0002-TST'
    );
  });
});
