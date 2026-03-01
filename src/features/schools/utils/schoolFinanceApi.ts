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
    `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Ensure NestJS is running on http://127.0.0.1:3001.`
  );
};

export const fetchSchoolFinanceDashboard = async () => {
  const response = await requestWithSchoolAuth('/school-finance/me/dashboard');
  return (await response.json()) as SchoolFinanceDashboard;
};

export const createSchoolFeePlan = async (payload: {
  title: string;
  description?: string;
  amount: number;
  dueDays?: number | null;
}) => {
  const response = await requestWithSchoolAuth('/school-finance/me/fee-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const createSchoolInvoice = async (payload: {
  feePlanId?: string;
  title?: string;
  description?: string;
  amount?: number;
  studentEmail: string;
  studentName?: string;
  dueDate?: string | null;
}) => {
  const response = await requestWithSchoolAuth('/school-finance/me/invoices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const createSchoolWithdrawal = async (payload: { amount: number }) => {
  const response = await requestWithSchoolAuth('/school-finance/me/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.json();
};

export const paySchoolInvoice = async (
  invoiceId: string,
  payload?: {
    successUrl?: string;
    cancelUrl?: string;
  }
) => {
  const response = await requestWithSchoolAuth(
    `/school-finance/invoices/${encodeURIComponent(invoiceId)}/pay`,
    {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }
  );
  return response.json();
};

export const syncSchoolInvoiceCheckout = async (checkoutSessionId: string) => {
  const response = await requestWithSchoolAuth('/school-finance/invoices/payments/sync', {
    method: 'POST',
    body: JSON.stringify({
      checkoutSessionId,
    }),
  });
  return response.json();
};

export const fetchSchoolInvoiceCheckoutStatus = async (checkoutSessionId: string) => {
  const response = await requestWithSchoolAuth(
    `/school-finance/invoices/payments/${encodeURIComponent(checkoutSessionId)}/status`
  );
  return (await response.json()) as SchoolInvoiceCheckoutStatus;
};

export const updateSchoolWithdrawalStatus = async (payload: {
  payoutId: string;
  status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled';
  failureReason?: string;
  note?: string;
}) => {
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
};

export const fetchSchoolWithdrawalLedger = async (payoutId: string) => {
  const response = await requestWithSchoolAuth(
    `/school-finance/me/withdrawals/${encodeURIComponent(payoutId)}/ledger`
  );
  return (await response.json()) as {
    payout: SchoolFinanceDashboard['recentPayouts'][number] & {
      ledgerCount?: number;
    };
    ledger: SchoolPayoutLedgerEntry[];
  };
};
