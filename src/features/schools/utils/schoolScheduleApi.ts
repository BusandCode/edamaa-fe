import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type SchoolScheduleSession = {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  expectedStudents: number;
  roomCode: string;
  notes: string | null;
  status: 'upcoming' | 'live' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type SchoolScheduleListResponse = {
  generatedAt: string;
  school: {
    userId: string;
    email: string;
    name: string;
  };
  sessions: SchoolScheduleSession[];
};

export type CreateSchoolScheduleSessionInput = {
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  durationMinutes: number;
  expectedStudents?: number;
  roomCode?: string;
  notes?: string;
};

export type CreateSchoolScheduleSessionResponse = {
  session: SchoolScheduleSession;
  message: string;
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
    throw new Error('Sign in with your school account to manage class schedules.');
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

export const fetchSchoolScheduleSessions = async (input?: {
  search?: string;
  status?: 'all' | 'upcoming' | 'live' | 'completed';
  dateFrom?: string;
  dateTo?: string;
}) => {
  const query = new URLSearchParams();
  if (input?.search) {
    query.set('search', input.search);
  }
  if (input?.status && input.status !== 'all') {
    query.set('status', input.status);
  }
  if (input?.dateFrom) {
    query.set('dateFrom', input.dateFrom);
  }
  if (input?.dateTo) {
    query.set('dateTo', input.dateTo);
  }

  const endpoint = query.toString()
    ? `/school-schedule/me/sessions?${query.toString()}`
    : '/school-schedule/me/sessions';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleListResponse;
};

export const createSchoolScheduleSession = async (input: CreateSchoolScheduleSessionInput) => {
  const response = await requestWithAuth('/school-schedule/me/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as CreateSchoolScheduleSessionResponse;
};

export const deleteSchoolScheduleSession = async (sessionId: string) => {
  const response = await requestWithAuth(
    `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
    }
  );
  return (await response.json()) as {
    sessionId: string;
    message: string;
  };
};
