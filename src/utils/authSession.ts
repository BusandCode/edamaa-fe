const SUPABASE_SESSION_STORAGE_KEY = 'edamaa_supabase_session_v1';
const LEGACY_AUTH_TOKEN_STORAGE_KEYS = ['supabase_access_token'];
const LOCAL_DEV_AUTH_SESSION_STORAGE_KEY = 'edamaa_local_dev_auth_v1';
const ACCOUNT_ROLE_STATE_STORAGE_KEY = 'edamaa_account_role_state_v1';
const KNOWN_ROLE_BY_EMAIL_STORAGE_KEY = 'edamaa_role_by_email_v1';

export const SUPABASE_ACCESS_TOKEN_STORAGE_KEY = 'edamaa_supabase_access_token';

export type AppAccountRole = 'student' | 'tutor' | 'school' | 'admin';

export type PersistedAccountRoleState = {
  defaultRole: AppAccountRole;
  activeRoles: AppAccountRole[];
  source: 'backend' | 'local-dev';
  updatedAt: string;
};

type SessionLike = {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
};

export type LocalDevAuthSession = {
  email: string;
  role: AppAccountRole;
  defaultRole: AppAccountRole;
  activeRoles: AppAccountRole[];
  mode: 'local-dev';
  signedInAt: string;
};

type PersistLocalDevSessionOptions = {
  defaultRole?: AppAccountRole;
  activeRoles?: AppAccountRole[];
};

type KnownRoleByEmailMap = Record<string, AppAccountRole>;

const isLikelyJwt = (value: string) => {
  const token = value.trim();
  return token.length > 20 && token.split('.').length === 3;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizeAccountRole = (value: unknown): AppAccountRole => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
    return 'school';
  }
  if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
    return 'tutor';
  }
  if (normalized === 'admin') {
    return 'admin';
  }
  return 'student';
};

const uniqueRoles = (values: Array<unknown>) => {
  const seen = new Set<AppAccountRole>();
  for (const rawValue of values) {
    const normalized = normalizeAccountRole(rawValue);
    if (!seen.has(normalized)) {
      seen.add(normalized);
    }
  }

  if (seen.size === 0) {
    seen.add('student');
  }

  return Array.from(seen);
};

const parseKnownRoleByEmailMap = (rawValue: string | null): KnownRoleByEmailMap => {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const entries = Object.entries(parsed as Record<string, unknown>);
    const mapped: KnownRoleByEmailMap = {};
    for (const [emailRaw, roleRaw] of entries) {
      const email = normalizeEmail(emailRaw);
      if (!email || !email.includes('@')) {
        continue;
      }
      mapped[email] = normalizeAccountRole(roleRaw);
    }
    return mapped;
  } catch {
    return {};
  }
};

const parseAccountRoleState = (rawValue: string | null): PersistedAccountRoleState | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const candidate = parsed as Record<string, unknown>;
    const defaultRole = normalizeAccountRole(candidate.defaultRole || candidate.role);
    const activeRolesCandidate = Array.isArray(candidate.activeRoles) ? candidate.activeRoles : [];
    const activeRoles = uniqueRoles([defaultRole, ...activeRolesCandidate]);
    const source = candidate.source === 'backend' ? 'backend' : 'local-dev';
    const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt.trim() : '';

    return {
      defaultRole,
      activeRoles,
      source,
      updatedAt: updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
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

    const role = normalizeAccountRole(candidate.role);
    const defaultRole = normalizeAccountRole(candidate.defaultRole || role);
    const activeRolesCandidate = Array.isArray(candidate.activeRoles) ? candidate.activeRoles : [];
    const activeRoles = uniqueRoles([defaultRole, ...activeRolesCandidate]);

    if (!email || !email.includes('@') || !signedInAt || !mode) {
      return null;
    }

    return {
      email,
      role: defaultRole,
      defaultRole,
      activeRoles,
      mode: 'local-dev',
      signedInAt,
    };
  } catch {
    return null;
  }
};

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

export const persistKnownAccountRoleForEmail = (email: string, role: AppAccountRole) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return;
  }

  const map = parseKnownRoleByEmailMap(window.localStorage.getItem(KNOWN_ROLE_BY_EMAIL_STORAGE_KEY));
  map[normalizedEmail] = normalizeAccountRole(role);
  window.localStorage.setItem(KNOWN_ROLE_BY_EMAIL_STORAGE_KEY, JSON.stringify(map));
};

export const loadKnownAccountRoleForEmail = (email: string): AppAccountRole | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return null;
  }

  const map = parseKnownRoleByEmailMap(window.localStorage.getItem(KNOWN_ROLE_BY_EMAIL_STORAGE_KEY));
  return map[normalizedEmail] || null;
};

export const persistAccountRoleState = (input: {
  defaultRole: AppAccountRole;
  activeRoles: AppAccountRole[];
  source?: 'backend' | 'local-dev';
}) => {
  if (typeof window === 'undefined') {
    return;
  }

  const defaultRole = normalizeAccountRole(input.defaultRole);
  const activeRoles = uniqueRoles([defaultRole, ...(input.activeRoles || [])]);
  const payload: PersistedAccountRoleState = {
    defaultRole,
    activeRoles,
    source: input.source === 'backend' ? 'backend' : 'local-dev',
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(ACCOUNT_ROLE_STATE_STORAGE_KEY, JSON.stringify(payload));
};

export const loadPersistedAccountRoleState = (): PersistedAccountRoleState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseAccountRoleState(window.localStorage.getItem(ACCOUNT_ROLE_STATE_STORAGE_KEY));
};

export const clearPersistedAccountRoleState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACCOUNT_ROLE_STATE_STORAGE_KEY);
};

export const persistLocalDevAuthSession = (
  email: string,
  role: AppAccountRole = 'student',
  options?: PersistLocalDevSessionOptions
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    window.localStorage.removeItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY);
    return;
  }

  const defaultRole = normalizeAccountRole(options?.defaultRole || role);
  const activeRoles = uniqueRoles([defaultRole, ...(options?.activeRoles || [])]);

  const payload: LocalDevAuthSession = {
    email: normalizedEmail,
    role: defaultRole,
    defaultRole,
    activeRoles,
    mode: 'local-dev',
    signedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY, JSON.stringify(payload));
  persistAccountRoleState({
    defaultRole,
    activeRoles,
    source: 'local-dev',
  });
};

export const loadPersistedLocalDevAuthSession = (): LocalDevAuthSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseLocalDevAuthSession(window.localStorage.getItem(LOCAL_DEV_AUTH_SESSION_STORAGE_KEY));
};

export const resolvePersistedDefaultRole = (): AppAccountRole => {
  const roleState = loadPersistedAccountRoleState();
  if (roleState?.defaultRole) {
    return roleState.defaultRole;
  }

  const localDev = loadPersistedLocalDevAuthSession();
  if (localDev?.defaultRole) {
    return localDev.defaultRole;
  }

  return 'student';
};

export const getDefaultHomeRouteForRole = (role: string | null | undefined) => {
  const normalized = normalizeAccountRole(role);
  if (normalized === 'school') {
    return '/school-dashboard';
  }
  if (normalized === 'tutor') {
    return '/tutor-dashboard';
  }
  return '/student-home';
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
  clearPersistedAccountRoleState();
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
