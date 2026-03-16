import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type SchoolTutorDirectoryItem = {
  id: string;
  email: string;
  name: string | null;
  role: 'tutor';
  joinedAt: string;
  activeRoles: string[];
};

type SchoolTutorDirectoryResponse = {
  tutors: SchoolTutorDirectoryItem[];
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
    throw new Error('Sign in with your school account to view tutor directory.');
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
          ...(localDevSession?.defaultRole ? { 'X-Dev-User-Role': localDevSession.defaultRole } : {}),
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
    `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Start the API with "bash scripts/api-up.sh" or run backend/nestjs with "SKIP_PRISMA_CONNECT=1 npm run start", then retry.`
  );
};

const fallbackTutors: SchoolTutorDirectoryItem[] = [
  {
    id: 'TUT-001',
    name: 'Adewale Johnson',
    email: 'adewale.johnson@edamaa.dev',
    role: 'tutor',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    activeRoles: ['tutor'],
  },
  {
    id: 'TUT-002',
    name: 'Chioma Nwosu',
    email: 'chioma.nwosu@edamaa.dev',
    role: 'tutor',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    activeRoles: ['tutor'],
  },
  {
    id: 'TUT-003',
    name: 'Samuel Ajayi',
    email: 'samuel.ajayi@edamaa.dev',
    role: 'tutor',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    activeRoles: ['tutor'],
  },
];

export const fetchSchoolTutorDirectory = async (search?: string): Promise<SchoolTutorDirectoryResponse> => {
  const normalizedSearch = String(search || '').trim();
  const endpoint = normalizedSearch
    ? `/users/directory/tutors?search=${encodeURIComponent(normalizedSearch)}`
    : '/users/directory/tutors';
  const query = normalizedSearch.toLowerCase();

  const filteredFallbackTutors = fallbackTutors.filter((tutor) => {
    if (!query) {
      return true;
    }
    return tutor.name?.toLowerCase().includes(query) || tutor.email.toLowerCase().includes(query);
  });

  try {
    const response = await requestWithAuth(endpoint, { method: 'GET' });
    const payload = (await response.json()) as SchoolTutorDirectoryResponse;

    if (import.meta.env.DEV && (!Array.isArray(payload.tutors) || payload.tutors.length === 0)) {
      return {
        tutors: filteredFallbackTutors,
      };
    }

    return payload;
  } catch (error) {
    if (!import.meta.env.DEV) {
      throw error;
    }

    return {
      tutors: filteredFallbackTutors,
    };
  }
};
