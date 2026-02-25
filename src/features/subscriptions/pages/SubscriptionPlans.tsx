import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BoltIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  createTeachingSubscriptionCheckout,
  fetchTeachingSubscriptionState,
  syncTeachingSubscriptionCheckout,
  type TeachingActor,
  type TeachingSubscriptionState,
} from '../utils/teachingSubscriptionApi';

const parseActor = (value: string | null): TeachingActor => (value === 'school' ? 'school' : 'tutor');

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actor = parseActor(searchParams.get('actor'));
  const checkoutState = (searchParams.get('checkout') || '').trim().toLowerCase();
  const checkoutSessionId = (searchParams.get('session_id') || '').trim();

  const [subscription, setSubscription] = useState<TeachingSubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actorLabel = actor === 'school' ? 'School' : 'Tutor';
  const monthlyPriceLabel = actor === 'school' ? '$79 / month' : '$39 / month';

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchTeachingSubscriptionState(actor);
      setSubscription(payload);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load subscription status right now.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  useEffect(() => {
    if (checkoutState !== 'success' || !checkoutSessionId) {
      if (checkoutState === 'cancel') {
        setNotice('Checkout was canceled. You can restart anytime.');
      }
      return;
    }

    let mounted = true;
    const syncStatus = async () => {
      setNotice('Finalizing your subscription...');
      try {
        const synced = await syncTeachingSubscriptionCheckout(actor, checkoutSessionId);
        if (!mounted) {
          return;
        }
        setSubscription(synced);
        setNotice('Subscription activated successfully.');
      } catch (syncError) {
        if (!mounted) {
          return;
        }
        const message =
          syncError instanceof Error
            ? syncError.message
            : 'Subscription sync failed. Please refresh to retry.';
        setError(message);
      }
    };

    void syncStatus();
    return () => {
      mounted = false;
    };
  }, [actor, checkoutSessionId, checkoutState]);

  const subscriptionStatusText = useMemo(() => {
    if (!subscription) {
      return 'Unavailable';
    }

    if (subscription.isActive) {
      return 'Active';
    }

    if (subscription.status === 'past_due') {
      return 'Past due';
    }

    if (subscription.status === 'canceled') {
      return 'Canceled';
    }

    return 'Inactive';
  }, [subscription]);

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await createTeachingSubscriptionCheckout(actor);
      if (payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      setError('Stripe checkout did not return a redirect URL. Please retry.');
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Edamaa Pro Subscription</h1>
            <p className="text-xs text-gray-500">{actorLabel} teaching access and Edamaa3D verification</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{actorLabel} account</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900">Subscription status: {subscriptionStatusText}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {subscription?.isActive
                  ? `Your access is active${subscription.currentPeriodEndLabel ? ` until ${subscription.currentPeriodEndLabel}` : ''}.`
                  : 'Live teaching and unlimited offline classes are locked until you subscribe.'}
              </p>
            </div>
            {subscription?.isEdamaa3dVerified && (
              <button
                onClick={() => navigate(`/edamaa3d-verified?actor=${actor}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                <CheckBadgeIcon className="h-4 w-4" />
                View Edamaa3D Verified
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#3D08BA]/20 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#3D08BA]">Recommended plan</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">Edamaa {actorLabel} Pro</h3>
              <p className="text-sm text-gray-600">Professional toolkit for live and offline class delivery.</p>
            </div>
            <div className="rounded-xl bg-[#3D08BA]/10 px-4 py-2 text-right">
              <p className="text-xs font-semibold uppercase text-[#3D08BA]">Billing</p>
              <p className="text-lg font-bold text-[#3D08BA]">{monthlyPriceLabel}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <BoltIcon className="h-4 w-4 text-[#3D08BA]" />
              Live class broadcasting unlocked
            </p>
            <p className="inline-flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-[#3D08BA]" />
              Unlimited offline class scheduling
            </p>
            <p className="inline-flex items-center gap-2">
              <CheckBadgeIcon className="h-4 w-4 text-[#3D08BA]" />
              Edamaa3D verified status page
            </p>
            <p className="inline-flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-[#3D08BA]" />
              Priority support and trust badge
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleSubscribe()}
              disabled={isSubmitting || isLoading}
              className="rounded-xl bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Opening checkout...' : subscription?.isActive ? 'Manage subscription' : 'Subscribe now'}
            </button>
            <button
              onClick={() => void loadStatus()}
              disabled={isLoading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Refreshing...' : 'Refresh status'}
            </button>
          </div>
        </section>

        {notice && (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {notice}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </main>
    </div>
  );
};

export default SubscriptionPlans;
