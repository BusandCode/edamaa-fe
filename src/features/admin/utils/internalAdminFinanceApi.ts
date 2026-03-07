import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type InternalAdminPayoutStatus =
  | 'requested'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'canceled';

export type InternalAdminPayoutStatusFilter = InternalAdminPayoutStatus | 'all' | '';

export type InternalAdminPayout = {
  id: string;
  amount: number;
  currency: string;
  status: InternalAdminPayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  ledgerCount: number;
};

export type InternalAdminSchoolWallet = {
  available: number;
  pending: number;
  onHold: number;
  lifetimeGross: number;
  lifetimeNet: number;
  totalWithdrawn: number;
};

export type InternalAdminPayoutQueueItem = {
  payout: InternalAdminPayout;
  school: {
    financeAccountId: string;
    schoolUserId: string;
    name: string;
    email: string;
  };
  wallet: InternalAdminSchoolWallet;
};

export type InternalAdminPayoutQueueResponse = {
  generatedAt: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  statusFilter: InternalAdminPayoutStatus | 'all';
  search: string | null;
  summary: {
    requested: number;
    processing: number;
    paid: number;
    failed: number;
    canceled: number;
  };
  payouts: InternalAdminPayoutQueueItem[];
};

export type InternalAdminPayoutLedgerEntry = {
  id: string;
  payoutId: string;
  previousStatus: InternalAdminPayoutStatus | null;
  nextStatus: InternalAdminPayoutStatus;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
};

export type InternalAdminPayoutLedgerResponse = {
  payout: InternalAdminPayout;
  school: {
    financeAccountId: string;
    schoolUserId: string;
    name: string;
    email: string;
  };
  wallet: InternalAdminSchoolWallet;
  ledger: InternalAdminPayoutLedgerEntry[];
};

type UpdateInternalAdminPayoutStatusPayload = {
  status: InternalAdminPayoutStatus;
  failureReason?: string;
  note?: string;
  processedBy?: string;
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

const requestWithAdminAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with an admin account to use internal admin tools.');
  }

  const bases = resolveApiBaseCandidates();
  let networkError: Error | null = null;

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
          ...(localDevSession?.email ? { 'X-Dev-User-Email': localDevSession.email } : {}),
          ...(localDevSession?.defaultRole
            ? { 'X-Dev-User-Role': localDevSession.defaultRole }
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

export const fetchInternalAdminPayoutQueue = async (query?: {
  status?: InternalAdminPayoutStatusFilter;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  const status = String(query?.status || '').trim().toLowerCase();
  if (status && status !== 'all') {
    params.set('status', status);
  }

  const search = String(query?.search || '').trim();
  if (search) {
    params.set('search', search);
  }

  if (typeof query?.page === 'number' && Number.isFinite(query.page) && query.page > 0) {
    params.set('page', String(Math.floor(query.page)));
  }

  if (typeof query?.limit === 'number' && Number.isFinite(query.limit) && query.limit > 0) {
    params.set('limit', String(Math.floor(query.limit)));
  }

  const queryString = params.toString();
  const response = await requestWithAdminAuth(
    `/admin/school-finance/payouts${queryString ? `?${queryString}` : ''}`
  );
  return (await response.json()) as InternalAdminPayoutQueueResponse;
};

export const updateInternalAdminPayoutStatus = async (
  payoutId: string,
  payload: UpdateInternalAdminPayoutStatusPayload
) => {
  const response = await requestWithAdminAuth(
    `/admin/school-finance/payouts/${encodeURIComponent(payoutId)}/status`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return (await response.json()) as {
    payout: InternalAdminPayout;
    wallet: InternalAdminSchoolWallet;
    message: string;
  };
};

export const fetchInternalAdminPayoutLedger = async (payoutId: string) => {
  const response = await requestWithAdminAuth(
    `/admin/school-finance/payouts/${encodeURIComponent(payoutId)}/ledger`
  );
  return (await response.json()) as InternalAdminPayoutLedgerResponse;
};
