import { AdminSchoolFinanceController } from '../src/school-finance/admin-school-finance.controller';
import { SchoolFinanceService } from '../src/school-finance/school-finance.service';

describe('AdminSchoolFinanceController (route contract)', () => {
  let controller: AdminSchoolFinanceController;

  const schoolFinanceServiceMock = {
    listPayoutQueueForAdminAuthUser: jest.fn(),
    advancePayoutStatusForAdminAuthUser: jest.fn(),
    getWithdrawalLedgerForAdminAuthUser: jest.fn(),
  };

  beforeAll(() => {
    controller = new AdminSchoolFinanceController(
      schoolFinanceServiceMock as unknown as SchoolFinanceService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists payout queue with parsed filters for authenticated admin', async () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasMore: false,
      statusFilter: 'all',
      search: null,
      summary: {
        requested: 1,
        processing: 1,
        paid: 0,
        failed: 0,
        canceled: 0,
      },
      payouts: [],
    };
    schoolFinanceServiceMock.listPayoutQueueForAdminAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'user-admin-1',
        email: 'admin@edamaa.dev',
        app_metadata: { role: 'admin' },
        user_metadata: { full_name: 'Admin Ops' },
      },
    } as any;

    const response = await controller.listPayoutQueue(request, 'requested', 'edamaa', '2', '25');

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.listPayoutQueueForAdminAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-admin-1',
        email: 'admin@edamaa.dev',
        name: 'Admin Ops',
        role: 'admin',
      }),
      expect.objectContaining({
        status: 'requested',
        search: 'edamaa',
        page: 2,
        limit: 25,
      })
    );
  });

  it('updates payout status for authenticated admin', async () => {
    const payload = {
      payout: {
        id: 'WDR-1001',
        amount: 25000,
        currency: 'NGN',
        status: 'processing',
        requestedAt: new Date().toISOString(),
        processedAt: null,
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 2,
      },
      wallet: {
        available: 90000,
        pending: 0,
        onHold: 25000,
        lifetimeGross: 120000,
        lifetimeNet: 110000,
        totalWithdrawn: 15000,
      },
      message: 'Payout status updated successfully by internal admin.',
    };
    schoolFinanceServiceMock.advancePayoutStatusForAdminAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'user-admin-2',
        email: 'admin2@edamaa.dev',
        role: 'admin',
        user_metadata: {},
      },
    } as any;

    const response = await controller.updatePayoutStatus(request, 'WDR-1001', {
      status: 'processing',
      note: 'Moved to banking queue',
      processedBy: 'finance@edamaa.dev',
    });

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.advancePayoutStatusForAdminAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin2@edamaa.dev',
        role: 'admin',
      }),
      expect.objectContaining({
        payoutId: 'WDR-1001',
        status: 'processing',
        note: 'Moved to banking queue',
        processedBy: 'finance@edamaa.dev',
      })
    );
  });

  it('returns payout ledger for authenticated admin', async () => {
    const payload = {
      payout: {
        id: 'WDR-2002',
        amount: 50000,
        currency: 'NGN',
        status: 'paid',
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        failureReason: null,
        createdAt: new Date().toISOString(),
        ledgerCount: 3,
      },
      school: {
        financeAccountId: 'SFA-201',
        schoolUserId: '42',
        name: 'Edamaa School',
        email: 'school@edamaa.dev',
      },
      wallet: {
        available: 125000,
        pending: 0,
        onHold: 0,
        lifetimeGross: 260000,
        lifetimeNet: 239000,
        totalWithdrawn: 80000,
      },
      ledger: [],
    };
    schoolFinanceServiceMock.getWithdrawalLedgerForAdminAuthUser.mockResolvedValue(payload);

    const request = {
      user: {
        id: 'user-admin-3',
        email: 'admin3@edamaa.dev',
        role: 'admin',
      },
    } as any;

    const response = await controller.getPayoutLedger(request, 'WDR-2002');

    expect(response).toEqual(payload);
    expect(schoolFinanceServiceMock.getWithdrawalLedgerForAdminAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin3@edamaa.dev',
        role: 'admin',
      }),
      'WDR-2002'
    );
  });
});
