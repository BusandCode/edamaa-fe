const SUPABASE_SESSION_STORAGE_KEY = 'edamaa_supabase_session_v1';
const LEGACY_AUTH_TOKEN_STORAGE_KEYS = ['supabase_access_token'];
const LOCAL_DEV_AUTH_SESSION_STORAGE_KEY = 'edamaa_local_dev_auth_v1';

export const SUPABASE_ACCESS_TOKEN_STORAGE_KEY = 'edamaa_supabase_access_token';

type SessionLike = {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
};

type LocalDevAuthSession = {
  email: string;
  mode: 'local-dev';
  signedInAt: string;
};

const isLikelyJwt = (value: string) => {
  const token = value.trim();
  return token.length > 20 && token.split('.').length === 3;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const extractTokenFromUnknown = (value: unknown): string => {
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();

    if (typeof current === 'string') {
      if (isLikelyJwt(current)) {
        return current.trim();
      }
      continue;
    }

    if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item));
      continue;
    }

    if (current && typeof current === 'object') {
      const candidate = current as Record<string, unknown>;
      const directTokenValues = [candidate.access_token, candidate.accessToken, candidate.token];
      for (const directValue of directTokenValues) {
        if (typeof directValue === 'string' && isLikelyJwt(directValue)) {
          return directValue.trim();
        }
      }

      if (candidate.currentSession) {
        stack.push(candidate.currentSession);
      }
      if (candidate.session) {
        stack.push(candidate.session);
      }
      if (candidate.data) {
        stack.push(candidate.data);
      }
    }
  }

  return '';
};

const parseTokenFromStorageValue = (rawValue: string | null) => {
  if (!rawValue) {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  if (isLikelyJwt(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return extractTokenFromUnknown(parsed);
  } catch {
    return '';
  }
};

const parseLocalDevAuthSession = (rawValue: string | null): LocalDevAuthSession | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const email = typeof candidate.email === 'string' ? normalizeEmail(candidate.email) : '';
    const signedInAt = typeof candidate.signedInAt === 'string' ? candidate.signedInAt.trim() : '';
    const mode = candidate.mode === 'local-dev' ? 'local-dev' : '';

    if (!email || !email.includes('@') || !signedInAt || !mode) {
      return null;
    }

    return {
      email,
      mode: 'local-dev',
      signedInAt,
    };
  } catch {
    return null;
  }
};

export const persistSupabaseSession = (session: SessionLike | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session?.access_token) {
    window.localStorage.removeItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY, session.access_token);
  window.localStorage.setItem(
    SUPABASE_SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token || null,
      expiresAt: session.expires_at ?? null,
      user: {
        id: session.user?.id ?? null,
        email: session.user?.email ?? null,
      },
    })
  );
};

export const persistLocalDevAuthSession = (email: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    window.localStorage.removeItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY);
    return;
  }

  const payload: LocalDevAuthSession = {
    email: normalizedEmail,
    mode: 'local-dev',
    signedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY, JSON.stringify(payload));
};

export const loadPersistedLocalDevAuthSession = (): LocalDevAuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseLocalDevAuthSession(window.localStorage.getItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY));
};

export const clearPersistedLocalDevAuthSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY);
};

export const clearPersistedSupabaseSession = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
};

export const clearPersistedAuthSession = () => {
  clearPersistedSupabaseSession();
  clearPersistedLocalDevAuthSession();
};

export const loadPersistedSupabaseAccessToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const primary = parseTokenFromStorageValue(window.localStorage.getItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY));
  if (primary) {
    return primary;
  }

  const persistedSession = parseTokenFromStorageValue(window.localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY));
  if (persistedSession) {
    window.localStorage.setItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY, persistedSession);
    return persistedSession;
  }

  for (const storageKey of LEGACY_AUTH_TOKEN_STORAGE_KEYS) {
    const legacyToken = parseTokenFromStorageValue(window.localStorage.getItem(storageKey));
    if (legacyToken) {
      window.localStorage.setItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY, legacyToken);
      return legacyToken;
    }
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index) || '';
    if (!storageKey.startsWith('sb-') || !storageKey.endsWith('-auth-token')) {
      continue;
    }

    const token = parseTokenFromStorageValue(window.localStorage.getItem(storageKey));
    if (token) {
      window.localStorage.setItem(SUPABASE_ACCESS_TOKEN_STORAGE_KEY, token);
      return token;
    }
  }

  return '';
};

export const hasPersistedSupabaseSession = () => Boolean(loadPersistedSupabaseAccessToken());
export const hasPersistedLocalDevAuthSession = () => Boolean(loadPersistedLocalDevAuthSession());
export const hasPersistedAuthSession = () =>
  hasPersistedSupabaseSession() || hasPersistedLocalDevAuthSession();
