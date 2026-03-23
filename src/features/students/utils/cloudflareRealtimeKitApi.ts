import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type CloudflareRealtimeKitActor = 'student' | 'tutor' | 'school';
export type CloudflareRealtimeKitParticipantRole = 'teacher' | 'student' | 'assistant';

export type CloudflareRealtimeKitStatus = {
  provider: string;
  configured: boolean;
  accountIdConfigured: boolean;
  appIdConfigured: boolean;
  apiTokenConfigured: boolean;
  presets: {
    teacher: string;
    student: string;
    assistant: string;
  };
};

export type CloudflareRealtimeKitSession = {
  provider: string;
  sessionId: string;
  meetingId: string;
  title: string;
  participant: {
    id: string;
    token: string;
    customParticipantId: string;
    name: string;
    presetName: string;
    role: CloudflareRealtimeKitParticipantRole;
  };
  mapping: {
    publicId: string;
    createdAt: string;
    updatedAt: string;
  };
};

type ResolveSessionInput = {
  sessionId: string;
  title?: string;
  participantRole: CloudflareRealtimeKitParticipantRole;
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
    // Ignore invalid JSON and fallback to text.
  }

  try {
    const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (textPayload && !/^</.test(textPayload)) {
      return textPayload;
    }
  } catch {
    // Fall back below.
  }

  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (
  endpoint: string,
  init?: RequestInit,
  options?: { actor?: CloudflareRealtimeKitActor }
) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();

  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your account first.');
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
      const headers = new Headers(init?.headers || undefined);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (localDevSession?.email) {
        headers.set('X-Dev-User-Email', localDevSession.email);
        if (options?.actor) {
          headers.set('X-Dev-User-Role', options.actor);
        }
        if (localDevSession.userMetadata) {
          headers.set('X-Dev-User-Metadata', JSON.stringify(localDevSession.userMetadata));
        }
        if (localDevSession.appMetadata) {
          headers.set('X-Dev-App-Metadata', JSON.stringify(localDevSession.appMetadata));
        }
      }

      response = await fetch(`${base}${endpoint}`, {
        ...init,
        headers,
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

export const fetchCloudflareRealtimeKitStatus = async (
  actor: CloudflareRealtimeKitActor
): Promise<CloudflareRealtimeKitStatus> => {
  const response = await requestWithAuth('/cloudflare-realtimekit/status', undefined, { actor });
  return (await response.json()) as CloudflareRealtimeKitStatus;
};

export const createCloudflareRealtimeKitSession = async (
  input: ResolveSessionInput,
  actor: CloudflareRealtimeKitActor
): Promise<CloudflareRealtimeKitSession> => {
  const response = await requestWithAuth(
    '/cloudflare-realtimekit/session',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { actor }
  );
  return (await response.json()) as CloudflareRealtimeKitSession;
};
