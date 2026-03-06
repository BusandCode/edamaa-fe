import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type SchoolFinanceDashboard = {
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
  feePlans: Array<{
    id: string;
    title: string;
    description: string | null;
    amount: number;
    currency: string;
    dueDays: number | null;
    isActive: boolean;
    createdAt: string;
  }>;
  recentInvoices: Array<{
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
  }>;
  recentPayments: Array<{
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
  }>;
  recentPayouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
    requestedAt: string;
    processedAt: string | null;
    failureReason: string | null;
    createdAt: string;
    ledgerCount?: number;
  }>;
};

export type SchoolFinanceStudent = {
  id: string | null;
  email: string;
  name: string | null;
  role: string | null;
};

export type SchoolInvoiceCheckoutStatus = {
  checkoutSessionId: string;
  paymentStatus: string;
  isSettled: boolean;
  needsManualSync: boolean;
  reconciliationSource: string | null;
  invoice: SchoolFinanceDashboard['recentInvoices'][number] | null;
  payment: SchoolFinanceDashboard['recentPayments'][number] | null;
};

export type SchoolPayoutLedgerEntry = {
  id: string;
  payoutId: string;
  previousStatus: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled' | null;
  nextStatus: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
};

export type SchoolFeeReminderDispatch = {
  id: string;
  invoiceId: string;
  invoiceTitle: string;
  studentEmail: string;
  reminderType: 'due_soon' | 'overdue';
  channel: 'in_app' | 'email';
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  attemptCount: number;
  nextRetryAt: string | null;
  lastError: string | null;
  reminderDate: string;
  sentAt: string | null;
  failureReason: string | null;
  createdAt: string;
};

export type SchoolFeeReminderDispatchesResponse = {
  generatedAt: string;
  total: number;
  dispatches: SchoolFeeReminderDispatch[];
};

export type SchoolFeeReminderSweepResponse = {
  generatedAt: string;
  accountId: number | null;
  scannedInvoices: number;
  dueSoonInApp: number;
  dueSoonEmail: number;
  overdueInApp: number;
  overdueEmail: number;
  emailDispatchEnabled: boolean;
  emailProvider?: 'resend' | 'log' | 'disabled';
  emailAttempted?: number;
  emailSent?: number;
  emailFailed?: number;
  emailSkipped?: number;
  emailQueuedForRetry?: number;
  emailExhausted?: number;
  skipped?: boolean;
};

export type SchoolFeeReminderRequeueResponse = {
  generatedAt: string;
  accountId: number | null;
  selected: number;
  requeued: number;
  maxRetries: number;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveApiBaseCandidates = () => {
  const candidates = new Set<string>();
  candidates.add('/api');

  if (API_BASE_URL && API_BASE_URL !== '/api') {
    candidates.add(API_BASE_URL);
  }

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').trim();
    if (isLocalhostHost(host)) {
      candidates.add(`http://${host}:3001`);
    }
  }

  candidates.add('http://127.0.0.1:3001');
  candidates.add('http://localhost:3001');
  return Array.from(candidates).map((base) => base.replace(/\/+$/, ''));
};

type LocalFinanceWorkspace = {
  dashboard: SchoolFinanceDashboard;
  payoutLedgers: Record<string, SchoolPayoutLedgerEntry[]>;
  reminderDispatches: SchoolFeeReminderDispatch[];
};

const LOCAL_FINANCE_STORAGE_KEY = 'edamaa_school_finance_local_v1';

const createLocalId = (prefix: string) =>
  `${prefix}_LOCAL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

const normalizeReminderType = (value: unknown): SchoolFeeReminderDispatch['reminderType'] => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'overdue' ? 'overdue' : 'due_soon';
};

const normalizeReminderChannel = (value: unknown): SchoolFeeReminderDispatch['channel'] => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'email' ? 'email' : 'in_app';
};

const normalizeReminderStatus = (value: unknown): SchoolFeeReminderDispatch['status'] => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'sent') {
    return 'sent';
  }
  if (normalized === 'failed') {
    return 'failed';
  }
  if (normalized === 'skipped') {
    return 'skipped';
  }
  return 'queued';
};

const normalizeLocalReminderDispatch = (value: unknown): SchoolFeeReminderDispatch => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  // Keep older locally-cached reminder objects readable after we introduced retry fields.
  const rawAttemptCount = Number(record.attemptCount);
  const attemptCount =
    Number.isFinite(rawAttemptCount) && rawAttemptCount > 0
      ? Math.round(rawAttemptCount)
      : 0;

  return {
    id: String(record.id || createLocalId('RMD')),
    invoiceId: String(record.invoiceId || ''),
    invoiceTitle: String(record.invoiceTitle || 'Invoice'),
    studentEmail: String(record.studentEmail || ''),
    reminderType: normalizeReminderType(record.reminderType),
    channel: normalizeReminderChannel(record.channel),
    status: normalizeReminderStatus(record.status),
    attemptCount,
    nextRetryAt: record.nextRetryAt ? String(record.nextRetryAt) : null,
    lastError: record.lastError ? String(record.lastError) : null,
    reminderDate: String(record.reminderDate || nowIso()),
    sentAt: record.sentAt ? String(record.sentAt) : null,
    failureReason: record.failureReason ? String(record.failureReason) : null,
    createdAt: String(record.createdAt || nowIso()),
  };
};

const extractEmailFromToken = (token?: string | null) => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return '';
  }

  const parts = normalizedToken.split('.');
  if (parts.length !== 3) {
    return '';
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: string;
    };
    return String(payload.email || '').trim().toLowerCase();
  } catch {
    return '';
  }
};

const resolveSchoolEmailForLocalFallback = () => {
  const localSession = loadPersistedLocalDevAuthSession();
  const localEmail = String(localSession?.email || '').trim().toLowerCase();
  if (localEmail) {
    return localEmail;
  }

  const tokenEmail = extractEmailFromToken(loadPersistedSupabaseAccessToken());
  if (tokenEmail) {
    return tokenEmail;
  }

  return 'school@edamaa.local';
};

const buildEmptyLocalDashboard = (email: string): SchoolFinanceDashboard => {
  const normalizedEmail = String(email || 'school@edamaa.local').trim().toLowerCase();
  const nameSeed = normalizedEmail.split('@')[0] || 'School';
  const schoolName = `${nameSeed.charAt(0).toUpperCase()}${nameSeed.slice(1)} School`;

  return {
    generatedAt: nowIso(),
    school: {
      financeAccountId: `LOCAL_${nameSeed.replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'SCHOOL'}`,
      name: schoolName,
      email: normalizedEmail,
      currency: 'NGN',
    },
    wallet: {
      available: 0,
      pending: 0,
      onHold: 0,
      lifetimeGross: 0,
      lifetimeNet: 0,
      totalWithdrawn: 0,
    },
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
};

const readLocalFinanceStore = (): Record<string, LocalFinanceWorkspace> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_FINANCE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, LocalFinanceWorkspace>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
};

const writeLocalFinanceStore = (store: Record<string, LocalFinanceWorkspace>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_FINANCE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write errors in private mode or restricted environments.
  }
};

const getLocalFinanceWorkspace = (email: string): LocalFinanceWorkspace => {
  const normalizedEmail = String(email || '').trim().toLowerCase() || 'school@edamaa.local';
  const store = readLocalFinanceStore();
  const existing = store[normalizedEmail];
  if (existing?.dashboard) {
    const normalizedExisting: LocalFinanceWorkspace = {
      dashboard: existing.dashboard,
      payoutLedgers: existing.payoutLedgers || {},
      reminderDispatches: Array.isArray((existing as LocalFinanceWorkspace).reminderDispatches)
        ? (existing as LocalFinanceWorkspace).reminderDispatches.map((dispatch) =>
            normalizeLocalReminderDispatch(dispatch)
          )
        : [],
    };
    store[normalizedEmail] = normalizedExisting;
    writeLocalFinanceStore(store);
    return normalizedExisting;
  }

  const created: LocalFinanceWorkspace = {
    dashboard: buildEmptyLocalDashboard(normalizedEmail),
    payoutLedgers: {},
    reminderDispatches: [],
  };
  store[normalizedEmail] = created;
  writeLocalFinanceStore(store);
  return created;
};

const saveLocalFinanceWorkspace = (email: string, workspace: LocalFinanceWorkspace) => {
  const normalizedEmail = String(email || '').trim().toLowerCase() || 'school@edamaa.local';
  const store = readLocalFinanceStore();
  store[normalizedEmail] = workspace;
  writeLocalFinanceStore(store);
};

const hasLocalFinanceActivity = (workspace?: LocalFinanceWorkspace | null) => {
  if (!workspace?.dashboard) {
    return false;
  }

  const dashboard = workspace.dashboard;
  return (
    dashboard.feePlans.length > 0 ||
    dashboard.recentInvoices.length > 0 ||
    dashboard.recentPayments.length > 0 ||
    dashboard.recentPayouts.length > 0 ||
    dashboard.wallet.available > 0 ||
    dashboard.wallet.pending > 0 ||
    dashboard.wallet.onHold > 0 ||
    dashboard.wallet.lifetimeGross > 0 ||
    dashboard.wallet.lifetimeNet > 0 ||
    dashboard.wallet.totalWithdrawn > 0 ||
    (workspace.reminderDispatches || []).length > 0
  );
};

const findLocalFinanceWorkspaceForEmail = (email: string) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const fallbackEmail = resolveSchoolEmailForLocalFallback();
  const store = readLocalFinanceStore();

  const exactMatch = normalizedEmail ? store[normalizedEmail] : undefined;
  if (hasLocalFinanceActivity(exactMatch)) {
    return { email: normalizedEmail, workspace: exactMatch as LocalFinanceWorkspace };
  }

  const fallbackMatch = fallbackEmail ? store[fallbackEmail] : undefined;
  if (hasLocalFinanceActivity(fallbackMatch)) {
    return { email: fallbackEmail, workspace: fallbackMatch as LocalFinanceWorkspace };
  }

  return null;
};

const shouldPreferLocalDashboard = (dashboard: SchoolFinanceDashboard | null | undefined) => {
  const financeAccountId = String(dashboard?.school?.financeAccountId || '')
    .trim()
    .toUpperCase();

  return financeAccountId === 'SFA-PENDING-SETUP';
};

const refreshDashboardOverview = (dashboard: SchoolFinanceDashboard) => {
  const totalInvoices = dashboard.recentInvoices.length;
  const paidInvoices = dashboard.recentInvoices.filter((invoice) => invoice.status === 'paid').length;
  const pendingInvoices = dashboard.recentInvoices.filter((invoice) => invoice.status === 'pending').length;
  const overdueInvoices = dashboard.recentInvoices.filter((invoice) => invoice.status === 'overdue').length;
  const outstandingAmount = dashboard.recentInvoices
    .filter(
      (invoice) =>
        invoice.status === 'pending' ||
        invoice.status === 'overdue' ||
        invoice.status === 'partially_paid'
    )
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  dashboard.overview = {
    totalInvoices,
    outstandingAmount,
    paidInvoices,
    pendingInvoices,
    overdueInvoices,
  };
  dashboard.generatedAt = nowIso();
};

const shouldUseLocalFinanceFallback = (error: unknown) => {
  if (typeof window === 'undefined') {
    return false;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (!message) {
    return false;
  }

  return (
    message.includes('could not reach backend api') ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('temporarily unavailable')
  );
};

const createLocalFinanceFallbackError = () =>
  new Error(
    'Live backend is temporarily unavailable. You are now in local offline mode for school finance on this browser.'
  );

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Fall through to plain-text fallback.
  }

  try {
    const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (textPayload && !/^</.test(textPayload)) {
      return textPayload;
    }
  } catch {
    // Fallback below.
  }

  return `Request failed with status ${response.status}`;
};

const requestWithSchoolAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();

  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your school account to manage fees.');
  }

  const bases = resolveApiBaseCandidates();
  let networkError: Error | null = null;

  const shouldTryNextBase = (response: Response, base: string) => {
    if (base.startsWith('/') && response.status === 500) {
      return true;
    }
    if ([502, 503, 504].includes(response.status)) {
      return true;
    }
    if (base.startsWith('/') && [404, 405].includes(response.status)) {
      return true;
    }
    return false;
  };

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];
    let response: Response;
    try {
      response = await fetch(`${base}${endpoint}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(localDevSession?.email
            ? {
                'X-Dev-User-Email': localDevSession.email,
                'X-Dev-User-Role': 'school',
              }
            : {}),
        },
      });
    } catch (error) {
      networkError = error instanceof Error ? error : new Error('Network request failed');
      continue;
    }

    if (!response.ok) {
      if (shouldTryNextBase(response, base)) {
        continue;
      }
      throw new Error(await extractErrorMessage(response));
    }

    return response;
  }

  const fallbackMessage =
    networkError?.message && networkError.message.trim() ? networkError.message : 'Failed to fetch';
  throw new Error(
    `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Start the API with "bash scripts/api-up.sh", then retry.`
  );
};

const runWithLocalFinanceFallback = async <T>(action: () => Promise<T>, fallback: () => T) => {
  try {
    return await action();
  } catch (error) {
    if (!shouldUseLocalFinanceFallback(error)) {
      throw error;
    }

    const result = fallback();
    // Surface a soft warning one time in console so local mode is explicit to developers.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(createLocalFinanceFallbackError().message);
    }
    return result;
  }
};

const localFetchSchoolFinanceDashboard = () => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return workspace.dashboard;
};

const localFetchSchoolFinanceStudents = () => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const studentsByEmail = new Map<string, SchoolFinanceStudent>();

  workspace.dashboard.recentInvoices.forEach((invoice) => {
    const normalizedEmail = String(invoice.studentEmail || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return;
    }

    const existing = studentsByEmail.get(normalizedEmail);
    if (existing) {
      if (!existing.name && invoice.studentName) {
        existing.name = invoice.studentName;
      }
      if (!existing.id && invoice.studentUserId) {
        existing.id = invoice.studentUserId;
      }
      return;
    }

    studentsByEmail.set(normalizedEmail, {
      id: invoice.studentUserId || null,
      email: normalizedEmail,
      name: invoice.studentName || null,
      role: 'student',
    });
  });

  return {
    students: Array.from(studentsByEmail.values()).sort((a, b) =>
      `${a.name || ''} ${a.email}`.localeCompare(`${b.name || ''} ${b.email}`)
    ),
  };
};

const localCreateSchoolFeePlan = (payload: {
  title: string;
  description?: string;
  amount: number;
  dueDays?: number | null;
}) => {
  const title = String(payload.title || '').trim();
  const amount = Number(payload.amount);

  if (!title) {
    throw new Error('Fee plan title is required.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Fee plan amount must be greater than zero.');
  }

  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const plan: SchoolFinanceDashboard['feePlans'][number] = {
    id: createLocalId('FPL'),
    title,
    description: String(payload.description || '').trim() || null,
    amount,
    currency: workspace.dashboard.school.currency || 'NGN',
    dueDays: payload.dueDays ?? null,
    isActive: true,
    createdAt: nowIso(),
  };

  workspace.dashboard.feePlans = [plan, ...workspace.dashboard.feePlans].slice(0, 50);
  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return {
    plan,
    message: 'Fee plan saved in local mode.',
  };
};

const localCreateSchoolInvoice = (payload: {
  feePlanId?: string;
  title?: string;
  description?: string;
  amount?: number;
  studentUserId?: string;
  studentEmail: string;
  studentName?: string;
  dueDate?: string | null;
}) => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);

  const selectedPlan = payload.feePlanId
    ? workspace.dashboard.feePlans.find((plan) => plan.id === payload.feePlanId) || null
    : null;

  const studentEmail = String(payload.studentEmail || '').trim().toLowerCase();
  if (!studentEmail || !studentEmail.includes('@')) {
    throw new Error('Student email is required.');
  }

  const title = String(payload.title || selectedPlan?.title || '').trim();
  if (!title) {
    throw new Error('Invoice title is required.');
  }

  const amount = Number(payload.amount ?? selectedPlan?.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invoice amount must be greater than zero.');
  }

  const invoice: SchoolFinanceDashboard['recentInvoices'][number] = {
    id: createLocalId('INV'),
    title,
    description: String(payload.description || selectedPlan?.description || '').trim() || null,
    studentUserId: String(payload.studentUserId || '').trim() || null,
    studentEmail,
    studentName: String(payload.studentName || '').trim() || null,
    amount,
    currency: workspace.dashboard.school.currency || 'NGN',
    status: 'pending',
    dueDate: payload.dueDate || null,
    paidAt: null,
    createdAt: nowIso(),
    paymentLink: `/school-finance/pay/${createLocalId('INVLINK')}`,
  };

  workspace.dashboard.recentInvoices = [invoice, ...workspace.dashboard.recentInvoices].slice(0, 100);
  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return {
    invoice,
    message: 'Invoice created in local mode.',
  };
};

const localCreateSchoolWithdrawal = (payload: { amount: number }) => {
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Withdrawal amount must be greater than zero.');
  }

  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  if (amount > workspace.dashboard.wallet.available) {
    throw new Error('Withdrawal amount exceeds available balance.');
  }

  const payoutId = createLocalId('PAYOUT');
  const payout: SchoolFinanceDashboard['recentPayouts'][number] = {
    id: payoutId,
    amount,
    currency: workspace.dashboard.school.currency || 'NGN',
    status: 'requested',
    requestedAt: nowIso(),
    processedAt: null,
    failureReason: null,
    createdAt: nowIso(),
    ledgerCount: 1,
  };

  workspace.dashboard.wallet.available -= amount;
  workspace.dashboard.wallet.onHold += amount;
  workspace.dashboard.recentPayouts = [payout, ...workspace.dashboard.recentPayouts].slice(0, 50);
  workspace.payoutLedgers[payoutId] = [
    {
      id: createLocalId('LEDGER'),
      payoutId,
      previousStatus: null,
      nextStatus: 'requested',
      amount,
      currency: payout.currency,
      note: 'Withdrawal request created in local mode.',
      createdAt: nowIso(),
    },
  ];
  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return {
    payout,
    message: 'Withdrawal request saved in local mode.',
  };
};

const localPaySchoolInvoice = (invoiceId: string) => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const invoice = workspace.dashboard.recentInvoices.find((item) => item.id === invoiceId) || null;

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  if (invoice.status === 'paid') {
    return {
      mode: 'settled' as const,
      checkoutUrl: null,
      checkoutSessionId: null,
      message: 'Invoice is already marked as paid.',
      invoice,
      payment: null,
      wallet: workspace.dashboard.wallet,
    };
  }

  invoice.status = 'paid';
  invoice.paidAt = nowIso();

  const payment: SchoolFinanceDashboard['recentPayments'][number] = {
    id: createLocalId('PAY'),
    invoiceId: invoice.id,
    payerEmail: invoice.studentEmail,
    grossAmount: invoice.amount,
    platformFee: 0,
    processingFee: 0,
    netAmount: invoice.amount,
    currency: invoice.currency,
    status: 'settled',
    settledAt: nowIso(),
    createdAt: nowIso(),
  };

  workspace.dashboard.wallet.available += invoice.amount;
  workspace.dashboard.wallet.lifetimeGross += invoice.amount;
  workspace.dashboard.wallet.lifetimeNet += invoice.amount;
  workspace.dashboard.recentPayments = [payment, ...workspace.dashboard.recentPayments].slice(0, 100);
  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);

  return {
    mode: 'settled' as const,
    checkoutUrl: null,
    checkoutSessionId: null,
    message: 'Invoice marked as paid in local mode.',
    invoice,
    payment,
    wallet: workspace.dashboard.wallet,
  };
};

const localSyncSchoolInvoiceCheckout = (checkoutSessionId: string) => ({
  checkoutSessionId,
  synced: false,
  message: 'Local mode active: checkout sync is not required.',
});

const localFetchSchoolInvoiceCheckoutStatus = (checkoutSessionId: string): SchoolInvoiceCheckoutStatus => ({
  checkoutSessionId,
  paymentStatus: 'local_mode',
  isSettled: false,
  needsManualSync: false,
  reconciliationSource: 'local-fallback',
  invoice: null,
  payment: null,
});

const localUpdateSchoolWithdrawalStatus = (payload: {
  payoutId: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
  failureReason?: string;
  note?: string;
}) => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const payout = workspace.dashboard.recentPayouts.find((item) => item.id === payload.payoutId) || null;
  if (!payout) {
    throw new Error('Payout not found.');
  }

  const previousStatus = payout.status;
  payout.status = payload.status;
  payout.failureReason = payload.failureReason || null;
  if (payload.status === 'paid' || payload.status === 'failed' || payload.status === 'canceled') {
    payout.processedAt = nowIso();
  }

  const wasHoldStatus = previousStatus === 'requested' || previousStatus === 'processing';
  if (wasHoldStatus && payload.status === 'paid') {
    workspace.dashboard.wallet.onHold = Math.max(0, workspace.dashboard.wallet.onHold - payout.amount);
    workspace.dashboard.wallet.totalWithdrawn += payout.amount;
  }
  if (wasHoldStatus && (payload.status === 'failed' || payload.status === 'canceled')) {
    workspace.dashboard.wallet.onHold = Math.max(0, workspace.dashboard.wallet.onHold - payout.amount);
    workspace.dashboard.wallet.available += payout.amount;
  }

  const ledger = workspace.payoutLedgers[payout.id] || [];
  ledger.unshift({
    id: createLocalId('LEDGER'),
    payoutId: payout.id,
    previousStatus,
    nextStatus: payload.status,
    amount: payout.amount,
    currency: payout.currency,
    note: String(payload.note || payload.failureReason || '').trim() || null,
    createdAt: nowIso(),
  });
  workspace.payoutLedgers[payout.id] = ledger.slice(0, 80);
  payout.ledgerCount = workspace.payoutLedgers[payout.id].length;

  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return {
    payout,
    ledger: workspace.payoutLedgers[payout.id],
    message: `Payout updated to ${payload.status} in local mode.`,
  };
};

const localFetchSchoolWithdrawalLedger = (payoutId: string) => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const payout = workspace.dashboard.recentPayouts.find((item) => item.id === payoutId) || null;
  if (!payout) {
    throw new Error('Payout not found.');
  }
  const ledger = workspace.payoutLedgers[payoutId] || [];
  return {
    payout: {
      ...payout,
      ledgerCount: ledger.length,
    },
    ledger,
  };
};

const toUtcDateBucketIso = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0)).toISOString();

const upsertLocalReminderDispatch = (
  workspace: LocalFinanceWorkspace,
  payload: Omit<SchoolFeeReminderDispatch, 'id' | 'createdAt'>
) => {
  const existing = workspace.reminderDispatches.find(
    (dispatch) =>
      dispatch.invoiceId === payload.invoiceId &&
      dispatch.studentEmail === payload.studentEmail &&
      dispatch.reminderType === payload.reminderType &&
      dispatch.channel === payload.channel &&
      dispatch.reminderDate === payload.reminderDate
  );

  if (existing) {
    return false;
  }

  const created: SchoolFeeReminderDispatch = {
    ...payload,
    id: createLocalId('RMD'),
    createdAt: nowIso(),
  };
  workspace.reminderDispatches.unshift(created);
  workspace.reminderDispatches = workspace.reminderDispatches.slice(0, 300);
  return true;
};

const localRunSchoolReminderSweep = () => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const now = new Date();
  const dueSoonWindowMs = 72 * 60 * 60 * 1000;
  const dueSoonCutoff = new Date(now.getTime() + dueSoonWindowMs);
  const overdueReminderDate = toUtcDateBucketIso(now);

  let dueSoonInApp = 0;
  let dueSoonEmail = 0;
  let overdueInApp = 0;
  let overdueEmail = 0;
  let scannedInvoices = 0;

  workspace.dashboard.recentInvoices.forEach((invoice) => {
    const dueDateValue = String(invoice.dueDate || '').trim();
    if (!dueDateValue) {
      return;
    }

    const dueDate = new Date(dueDateValue);
    if (Number.isNaN(dueDate.getTime())) {
      return;
    }

    const isOutstanding = invoice.status !== 'paid' && invoice.status !== 'canceled';
    if (!isOutstanding) {
      return;
    }

    scannedInvoices += 1;
    const normalizedStudentEmail = String(invoice.studentEmail || '').trim().toLowerCase();
    if (!normalizedStudentEmail || !normalizedStudentEmail.includes('@')) {
      return;
    }

    const isOverdue = dueDate.getTime() <= now.getTime();
    const isDueSoon = dueDate.getTime() > now.getTime() && dueDate.getTime() <= dueSoonCutoff.getTime();

    if (isOverdue && invoice.status === 'pending') {
      invoice.status = 'overdue';
    }

    if (isDueSoon) {
      const reminderDate = toUtcDateBucketIso(dueDate);
      if (
        upsertLocalReminderDispatch(workspace, {
          invoiceId: invoice.id,
          invoiceTitle: invoice.title,
          studentEmail: normalizedStudentEmail,
          reminderType: 'due_soon',
          channel: 'in_app',
          status: 'sent',
          attemptCount: 1,
          nextRetryAt: null,
          lastError: null,
          reminderDate,
          sentAt: nowIso(),
          failureReason: null,
        })
      ) {
        dueSoonInApp += 1;
      }

      if (
        upsertLocalReminderDispatch(workspace, {
          invoiceId: invoice.id,
          invoiceTitle: invoice.title,
          studentEmail: normalizedStudentEmail,
          reminderType: 'due_soon',
          channel: 'email',
          status: 'skipped',
          attemptCount: 1,
          nextRetryAt: null,
          lastError: 'Email reminder delivery is disabled in local mode.',
          reminderDate,
          sentAt: nowIso(),
          failureReason: 'Email reminder delivery is disabled in local mode.',
        })
      ) {
        dueSoonEmail += 1;
      }
    }

    if (isOverdue) {
      if (
        upsertLocalReminderDispatch(workspace, {
          invoiceId: invoice.id,
          invoiceTitle: invoice.title,
          studentEmail: normalizedStudentEmail,
          reminderType: 'overdue',
          channel: 'in_app',
          status: 'sent',
          attemptCount: 1,
          nextRetryAt: null,
          lastError: null,
          reminderDate: overdueReminderDate,
          sentAt: nowIso(),
          failureReason: null,
        })
      ) {
        overdueInApp += 1;
      }

      if (
        upsertLocalReminderDispatch(workspace, {
          invoiceId: invoice.id,
          invoiceTitle: invoice.title,
          studentEmail: normalizedStudentEmail,
          reminderType: 'overdue',
          channel: 'email',
          status: 'skipped',
          attemptCount: 1,
          nextRetryAt: null,
          lastError: 'Email reminder delivery is disabled in local mode.',
          reminderDate: overdueReminderDate,
          sentAt: nowIso(),
          failureReason: 'Email reminder delivery is disabled in local mode.',
        })
      ) {
        overdueEmail += 1;
      }
    }
  });

  refreshDashboardOverview(workspace.dashboard);
  saveLocalFinanceWorkspace(schoolEmail, workspace);

  return {
    generatedAt: nowIso(),
    accountId: null,
    scannedInvoices,
    dueSoonInApp,
    dueSoonEmail,
    overdueInApp,
    overdueEmail,
    emailDispatchEnabled: false,
    emailProvider: 'disabled',
    emailAttempted: 0,
    emailSent: 0,
    emailFailed: 0,
    emailSkipped: dueSoonEmail + overdueEmail,
    emailQueuedForRetry: 0,
    emailExhausted: 0,
  } as SchoolFeeReminderSweepResponse;
};

const localFetchSchoolReminderDispatches = (input?: {
  reminderType?: 'due_soon' | 'overdue';
  channel?: 'in_app' | 'email';
  status?: 'queued' | 'sent' | 'failed' | 'skipped';
  limit?: number;
}): SchoolFeeReminderDispatchesResponse => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const parsedLimit = Number(input?.limit);
  const limit = Math.min(
    200,
    Math.max(1, Number.isFinite(parsedLimit) ? Math.round(parsedLimit) : 80)
  );

  const filtered = workspace.reminderDispatches
    .filter((dispatch) => {
      if (input?.reminderType && dispatch.reminderType !== input.reminderType) {
        return false;
      }
      if (input?.channel && dispatch.channel !== input.channel) {
        return false;
      }
      if (input?.status && dispatch.status !== input.status) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return {
    generatedAt: nowIso(),
    total: filtered.length,
    dispatches: filtered,
  };
};

const localRequeueFailedSchoolReminderEmails = (input?: {
  limit?: number;
}): SchoolFeeReminderRequeueResponse => {
  const schoolEmail = resolveSchoolEmailForLocalFallback();
  const workspace = getLocalFinanceWorkspace(schoolEmail);
  const parsedLimit = Number(input?.limit);
  const limit = Math.min(
    200,
    Math.max(1, Number.isFinite(parsedLimit) ? Math.round(parsedLimit) : 80)
  );

  const failedEmailDispatches = workspace.reminderDispatches
    .filter((dispatch) => dispatch.channel === 'email' && dispatch.status === 'failed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  failedEmailDispatches.forEach((dispatch) => {
    dispatch.status = 'queued';
    dispatch.attemptCount = 0;
    dispatch.nextRetryAt = null;
    dispatch.lastError = null;
    dispatch.failureReason = null;
    dispatch.sentAt = null;
  });

  saveLocalFinanceWorkspace(schoolEmail, workspace);
  return {
    generatedAt: nowIso(),
    accountId: null,
    selected: failedEmailDispatches.length,
    requeued: failedEmailDispatches.length,
    maxRetries: 4,
  };
};

export const fetchSchoolFinanceDashboard = async () => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/dashboard');
      const payload = (await response.json()) as SchoolFinanceDashboard;

      if (!shouldPreferLocalDashboard(payload)) {
        return payload;
      }

      // Backend can return a setup-only placeholder dashboard when DB tables are
      // unavailable. If local fallback data exists, keep showing it so recent
      // fee plans/invoices remain visible to the user.
      const localCandidate = findLocalFinanceWorkspaceForEmail(payload.school.email);
      if (!localCandidate) {
        return payload;
      }

      const localDashboard = localCandidate.workspace.dashboard;
      localDashboard.generatedAt = nowIso();
      localDashboard.school = {
        ...localDashboard.school,
        name: payload.school.name || localDashboard.school.name,
        email: payload.school.email || localDashboard.school.email,
        currency: payload.school.currency || localDashboard.school.currency,
      };
      refreshDashboardOverview(localDashboard);
      saveLocalFinanceWorkspace(localCandidate.email, localCandidate.workspace);
      return localDashboard;
    },
    () => localFetchSchoolFinanceDashboard()
  );
};

export const fetchSchoolFinanceStudents = async () => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/students');
      const payload = (await response.json()) as {
        students?: SchoolFinanceStudent[];
      };
      return {
        students: Array.isArray(payload.students) ? payload.students : [],
      };
    },
    () => localFetchSchoolFinanceStudents()
  );
};

export const createSchoolFeePlan = async (payload: {
  title: string;
  description?: string;
  amount: number;
  dueDays?: number | null;
}) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/fee-plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    () => localCreateSchoolFeePlan(payload)
  );
};

export const createSchoolInvoice = async (payload: {
  feePlanId?: string;
  title?: string;
  description?: string;
  amount?: number;
  studentUserId?: string;
  studentEmail: string;
  studentName?: string;
  dueDate?: string | null;
}) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    () => localCreateSchoolInvoice(payload)
  );
};

export const createSchoolWithdrawal = async (payload: { amount: number }) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/withdrawals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    () => localCreateSchoolWithdrawal(payload)
  );
};

export const paySchoolInvoice = async (
  invoiceId: string,
  payload?: {
    successUrl?: string;
    cancelUrl?: string;
  }
) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth(
        `/school-finance/invoices/${encodeURIComponent(invoiceId)}/pay`,
        {
          method: 'POST',
          body: JSON.stringify(payload || {}),
        }
      );
      return response.json();
    },
    () => localPaySchoolInvoice(invoiceId)
  );
};

export const syncSchoolInvoiceCheckout = async (checkoutSessionId: string) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/invoices/payments/sync', {
        method: 'POST',
        body: JSON.stringify({
          checkoutSessionId,
        }),
      });
      return response.json();
    },
    () => localSyncSchoolInvoiceCheckout(checkoutSessionId)
  );
};

export const fetchSchoolInvoiceCheckoutStatus = async (checkoutSessionId: string) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth(
        `/school-finance/invoices/payments/${encodeURIComponent(checkoutSessionId)}/status`
      );
      return (await response.json()) as SchoolInvoiceCheckoutStatus;
    },
    () => localFetchSchoolInvoiceCheckoutStatus(checkoutSessionId)
  );
};

export const updateSchoolWithdrawalStatus = async (payload: {
  payoutId: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
  failureReason?: string;
  note?: string;
}) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth(
        `/school-finance/me/withdrawals/${encodeURIComponent(payload.payoutId)}/status`,
        {
          method: 'POST',
          body: JSON.stringify({
            status: payload.status,
            failureReason: payload.failureReason,
            note: payload.note,
          }),
        }
      );
      return response.json();
    },
    () => localUpdateSchoolWithdrawalStatus(payload)
  );
};

export const fetchSchoolWithdrawalLedger = async (payoutId: string) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth(
        `/school-finance/me/withdrawals/${encodeURIComponent(payoutId)}/ledger`
      );
      return (await response.json()) as {
        payout: SchoolFinanceDashboard['recentPayouts'][number] & {
          ledgerCount?: number;
        };
        ledger: SchoolPayoutLedgerEntry[];
      };
    },
    () => localFetchSchoolWithdrawalLedger(payoutId)
  );
};

export const runSchoolReminderSweep = async () => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/reminders/run', {
        method: 'POST',
      });
      return (await response.json()) as SchoolFeeReminderSweepResponse;
    },
    () => localRunSchoolReminderSweep()
  );
};

export const fetchSchoolReminderDispatches = async (input?: {
  reminderType?: 'due_soon' | 'overdue';
  channel?: 'in_app' | 'email';
  status?: 'queued' | 'sent' | 'failed' | 'skipped';
  limit?: number;
}) => {
  return runWithLocalFinanceFallback(
    async () => {
      const params = new URLSearchParams();
      if (input?.reminderType) {
        params.set('type', input.reminderType);
      }
      if (input?.channel) {
        params.set('channel', input.channel);
      }
      if (input?.status) {
        params.set('status', input.status);
      }
      if (typeof input?.limit === 'number' && Number.isFinite(input.limit)) {
        params.set('limit', String(Math.round(input.limit)));
      }

      const query = params.toString();
      const response = await requestWithSchoolAuth(
        `/school-finance/me/reminders/dispatches${query ? `?${query}` : ''}`
      );
      const payload = (await response.json()) as {
        generatedAt?: string;
        total?: number;
        dispatches?: unknown[];
      };
      const dispatches = Array.isArray(payload.dispatches)
        ? payload.dispatches.map((dispatch) => normalizeLocalReminderDispatch(dispatch))
        : [];
      return {
        generatedAt: String(payload.generatedAt || nowIso()),
        total: Number.isFinite(Number(payload.total)) ? Number(payload.total) : dispatches.length,
        dispatches,
      } as SchoolFeeReminderDispatchesResponse;
    },
    () => localFetchSchoolReminderDispatches(input)
  );
};

export const requeueFailedSchoolReminderEmails = async (payload?: {
  limit?: number;
}) => {
  return runWithLocalFinanceFallback(
    async () => {
      const response = await requestWithSchoolAuth('/school-finance/me/reminders/requeue-failed', {
        method: 'POST',
        body: JSON.stringify({
          limit: payload?.limit,
        }),
      });
      return (await response.json()) as SchoolFeeReminderRequeueResponse;
    },
    () => localRequeueFailedSchoolReminderEmails(payload)
  );
};
