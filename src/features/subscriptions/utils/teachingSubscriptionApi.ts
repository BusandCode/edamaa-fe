import { loadPersistedSupabaseAccessToken } from '../../../utils/authSession';

export type TeachingActor = 'tutor' | 'school';
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

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
    // Fallback below.
  }
  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  if (!token) {
    throw new Error('Sign in with your authenticated account to manage subscriptions.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response;
};

export const fetchTeachingSubscriptionState = async (
  actor: TeachingActor
): Promise<TeachingSubscriptionState> => {
  const response = await requestWithAuth(`/subscriptions/me/status?actor=${encodeURIComponent(actor)}`);
  return (await response.json()) as TeachingSubscriptionState;
};

export const createTeachingSubscriptionCheckout = async (
  actor: TeachingActor,
  options?: { successUrl?: string; cancelUrl?: string }
): Promise<CheckoutResponse> => {
  const response = await requestWithAuth('/subscriptions/me/checkout', {
    method: 'POST',
    body: JSON.stringify({
      actor,
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
