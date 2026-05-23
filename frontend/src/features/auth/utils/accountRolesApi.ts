import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
  type AppAccountRole,
} from '../../../utils/authSession';

export type AccountRoleStatus = 'active' | 'inactive';
export type RoleRequestStatus = 'pending' | 'approved' | 'rejected' | 'canceled';

export type AccountRoleItem = {
  id: string;
  role: AppAccountRole;
  status: AccountRoleStatus;
  isDefault: boolean;
  requestedAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
};

export type RoleRequestItem = {
  id: string;
  targetRole: AppAccountRole;
  status: RoleRequestStatus;
  note: string | null;
  rejectionReason: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type AccountRoleStateResponse = {
  user: {
    id: number;
    email: string;
    name: string | null;
    defaultRole: AppAccountRole;
  };
  roles: AccountRoleItem[];
  activeRoles: AppAccountRole[];
  pendingRequests: RoleRequestItem[];
  canRequestRoles: AppAccountRole[];
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
    // Fall through to generic fallback.
  }

  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your authenticated account to manage account roles.');
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
          ...(init?.headers || {}),
          'Content-Type': 'application/json',
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
    networkError?.message && networkError.message.trim()
      ? networkError.message
      : 'Failed to fetch';
  throw new Error(
    `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Start the API with "bash scripts/api-up.sh", then retry.`
  );
};

export const fetchMyAccountRoles = async (): Promise<AccountRoleStateResponse> => {
  const response = await requestWithAuth('/account/roles/me', {
    method: 'GET',
  });
  return (await response.json()) as AccountRoleStateResponse;
};

export const requestAccountRoleChange = async (input: {
  targetRole: 'tutor' | 'school';
  note?: string;
  payload?: unknown;
}) => {
  const response = await requestWithAuth('/account/roles/request', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as {
    message: string;
    request: RoleRequestItem;
    roleState: AccountRoleStateResponse;
  };
};

export const switchDefaultAccountRole = async (role: AppAccountRole) => {
  const response = await requestWithAuth('/account/roles/switch', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  return (await response.json()) as {
    message: string;
    roleState: AccountRoleStateResponse;
  };
};

export const deactivateAccountRole = async (role: AppAccountRole) => {
  const response = await requestWithAuth('/account/roles/deactivate', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  return (await response.json()) as {
    message: string;
    roleState: AccountRoleStateResponse;
  };
};
