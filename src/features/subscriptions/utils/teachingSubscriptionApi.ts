import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type TeachingActor = 'tutor' | 'school';
export type BillingInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type TeachingSubscriptionStatus =
  | 'inactive'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled';

export type TeachingSubscriptionState = {
  actor: TeachingActor;
  status: TeachingSubscriptionStatus;
  isActive: boolean;
  isEdamaa3dVerified: boolean;
  planCode: string;
  billingInterval: BillingInterval;
  availableBillingIntervals: BillingInterval[];
  currentPeriodEnd: string | null;
  currentPeriodEndLabel: string | null;
  features: {
    canTeachLive: boolean;
    canUseUnlimitedOfflineClasses: boolean;
    maxScheduledOfflineClasses: number;
  };
};

type CheckoutResponse = {
  actor: TeachingActor;
  checkoutUrl: string | null;
  sessionId: string;
  message: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const DEV_PREMIUM_UNLOCK_ENABLED = (() => {
  // Default to unlocked in local development so premium-gated flows can be tested end-to-end.
  const rawValue = import.meta.env.VITE_DEV_UNLOCK_PREMIUM ?? (import.meta.env.DEV ? 'true' : 'false');
  return String(rawValue).trim().toLowerCase() === 'true';
})();

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

const buildDevUnlockedSubscriptionState = (actor: TeachingActor): TeachingSubscriptionState => ({
  actor,
  status: 'active',
  isActive: true,
  isEdamaa3dVerified: true,
  planCode: actor === 'school' ? 'edamaa-school-pro-monthly' : 'edamaa-tutor-pro-monthly',
  billingInterval: 'monthly',
  availableBillingIntervals: ['monthly'],
  currentPeriodEnd: null,
  currentPeriodEndLabel: 'Development unlock',
  features: {
    canTeachLive: true,
    canUseUnlimitedOfflineClasses: true,
    maxScheduledOfflineClasses: 999,
  },
});

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

const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your authenticated account to manage subscriptions.');
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
          ...(localDevSession?.email ? { 'X-Dev-User-Email': localDevSession.email } : {}),
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

export const fetchTeachingSubscriptionState = async (
  actor: TeachingActor
): Promise<TeachingSubscriptionState> => {
  if (DEV_PREMIUM_UNLOCK_ENABLED) {
    return buildDevUnlockedSubscriptionState(actor);
  }

  const response = await requestWithAuth(`/subscriptions/me/status?actor=${encodeURIComponent(actor)}`);
  return (await response.json()) as TeachingSubscriptionState;
};

export const createTeachingSubscriptionCheckout = async (
  actor: TeachingActor,
  options?: { interval?: BillingInterval; successUrl?: string; cancelUrl?: string }
): Promise<CheckoutResponse> => {
  const response = await requestWithAuth('/subscriptions/me/checkout', {
    method: 'POST',
    body: JSON.stringify({
      actor,
      interval: options?.interval,
      successUrl: options?.successUrl,
      cancelUrl: options?.cancelUrl,
    }),
  });
  return (await response.json()) as CheckoutResponse;
};

export const syncTeachingSubscriptionCheckout = async (
  actor: TeachingActor,
  sessionId: string
): Promise<TeachingSubscriptionState> => {
  const response = await requestWithAuth('/subscriptions/me/sync', {
    method: 'POST',
    body: JSON.stringify({
      actor,
      sessionId,
    }),
  });
  const payload = (await response.json()) as { subscription: TeachingSubscriptionState };
  return payload.subscription;
};
