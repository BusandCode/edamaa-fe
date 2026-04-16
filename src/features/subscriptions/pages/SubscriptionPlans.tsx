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
  type BillingInterval,
  type TeachingActor,
  type TeachingSubscriptionState,
} from '../utils/teachingSubscriptionApi';
import NewLogo from '../../../components/common/NewLogo';

const parseActor = (value: string | null): TeachingActor => (value === 'school' ? 'school' : 'tutor');
const parseBillingInterval = (value: string | null): BillingInterval | null => {
  if (value === 'weekly' || value === 'monthly' || value === 'quarterly' || value === 'yearly') {
    return value;
  }
  return null;
};

const PLAN_META: Record<
  BillingInterval,
  {
    title: string;
    cadence: string;
    badge: string;
    description: string;
  }
> = {
  weekly: {
    title: 'Weekly plan',
    cadence: 'Billed every week',
    badge: 'Flexible',
    description: 'Best for short pilot runs, test cohorts, or temporary school operations.',
  },
  monthly: {
    title: 'Monthly plan',
    cadence: 'Billed every month',
    badge: 'Standard',
    description: 'Best for month-to-month teaching operations with simple billing control.',
  },
  quarterly: {
    title: '3-month plan',
    cadence: 'Billed every 3 months',
    badge: 'Term plan',
    description: 'Best for term-based planning and fewer renewal interruptions.',
  },
  yearly: {
    title: 'Yearly plan',
    cadence: 'Billed every year',
    badge: 'Long range',
    description: 'Best for full-session planning and annual school operations.',
  },
};

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actor = parseActor(searchParams.get('actor'));
  const checkoutState = (searchParams.get('checkout') || '').trim().toLowerCase();
  const checkoutSessionId = (searchParams.get('session_id') || '').trim();
  const checkoutInterval = parseBillingInterval(searchParams.get('interval'));

  const [subscription, setSubscription] = useState<TeachingSubscriptionState | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>(checkoutInterval || 'monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actorLabel = actor === 'school' ? 'School' : 'Tutor';
  const planName = `Edamaa ${actorLabel} Pro`;
  const audienceCopy =
    actor === 'school'
      ? 'Run live classes, school scheduling, finance, certificates, and verified trust from one Edamaa workspace.'
      : 'Run live teaching, learner workflows, and verified trust from one Edamaa workspace.';
  const actorBenefitLabel =
    actor === 'school' ? 'Built for connected school operations' : 'Built for independent teaching operations';

  const availableIntervals = subscription?.availableBillingIntervals?.length
    ? subscription.availableBillingIntervals
    : (['monthly'] as BillingInterval[]);

  useEffect(() => {
    if (availableIntervals.includes(selectedInterval)) {
      return;
    }

    setSelectedInterval(availableIntervals[0] || 'monthly');
  }, [availableIntervals, selectedInterval]);

  const renewalLabel =
    subscription?.currentPeriodEndLabel
      ? `Renews ${subscription.currentPeriodEndLabel}`
      : subscription?.isActive
        ? 'Renewal date will appear after billing sync'
        : `${PLAN_META[selectedInterval].cadence} once checkout is completed`;
  const verificationLabel = subscription?.isEdamaa3dVerified ? 'Verified' : 'Not verified yet';
  const selectedPlanMeta = PLAN_META[selectedInterval];
  const selectedPlanAvailable = availableIntervals.includes(selectedInterval);
  const currentBillingLabel = subscription ? PLAN_META[subscription.billingInterval].title : selectedPlanMeta.title;
  const primaryActionLabel = subscription?.isActive
    ? 'Manage subscription'
    : `Start ${selectedPlanMeta.title.toLowerCase()}`;
  const featureRows = [
    {
      title: 'Live class broadcasting',
      copy: 'Start and manage live classes without feature lockouts.',
      icon: BoltIcon,
    },
    {
      title: 'Unlimited class operations',
      copy: 'Run offline schedules, student workflows, and class administration from one paid workspace.',
      icon: SparklesIcon,
    },
    {
      title: 'Edamaa3D verification',
      copy: 'Show a trusted verification page that confirms your active teaching presence.',
      icon: CheckBadgeIcon,
    },
    {
      title: 'Priority support',
      copy: 'Get faster issue handling for subscription and delivery workflows.',
      icon: ShieldCheckIcon,
    },
  ];

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchTeachingSubscriptionState(actor);
      setSubscription(payload);
      setSelectedInterval(payload.billingInterval);
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
        setSelectedInterval(synced.billingInterval);
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
    if (!selectedPlanAvailable) {
      setError(`${selectedPlanMeta.title} is not configured yet. Add the Stripe price ID for this billing cycle first.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await createTeachingSubscriptionCheckout(actor, { interval: selectedInterval });
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#f4f8ff_34%,#ffffff_100%)]">
      <header className="sticky top-0 z-20 border-b border-[#3D08BA]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl border border-[#3D08BA]/10 bg-white p-2 text-[#3D08BA] shadow-sm hover:bg-[#3D08BA]/5"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                {actorLabel} Plan
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {subscriptionStatusText}
              </span>
            </div>
            <h1 className="mt-2 text-lg font-bold text-slate-950">Edamaa Pro Subscription</h1>
            <p className="text-xs text-slate-500">Choose a billing cycle for your {actorLabel.toLowerCase()} workspace</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-[#3D08BA]/10 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0ff_42%,#eef4ff_100%)] shadow-[0_20px_60px_rgba(61,8,186,0.10)]">
          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.3fr_0.8fr] lg:items-end">
            <div>
              <div className="-mt-1 mb-3 inline-flex rounded-2xl border border-[#3D08BA]/12 bg-white px-4 py-3 shadow-sm">
                <NewLogo
                  centered={false}
                  logoWidth={38}
                  logoHeight={38}
                  textSize="text-[24px]"
                  gap="gap-2"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3D08BA]">{actorBenefitLabel}</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{planName}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {subscription?.isActive
                  ? `Your access is active${subscription.currentPeriodEndLabel ? ` until ${subscription.currentPeriodEndLabel}` : ''}.`
                  : audienceCopy}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#3D08BA]/12 bg-white px-3 py-1 text-xs font-semibold text-[#3D08BA] shadow-sm">
                  Live classes
                </span>
                <span className="rounded-full border border-[#3D08BA]/12 bg-white px-3 py-1 text-xs font-semibold text-[#3D08BA] shadow-sm">
                  Verified trust badge
                </span>
                <span className="rounded-full border border-[#3D08BA]/12 bg-white px-3 py-1 text-xs font-semibold text-[#3D08BA] shadow-sm">
                  {selectedPlanMeta.cadence}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => void handleSubscribe()}
                  disabled={isSubmitting || isLoading || !selectedPlanAvailable}
                  className="rounded-2xl bg-[#3D08BA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#31079a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Opening checkout...' : primaryActionLabel}
                </button>
                <button
                  onClick={() => void loadStatus()}
                  disabled={isLoading}
                  className="rounded-2xl border border-[#3D08BA]/12 bg-white px-5 py-3 text-sm font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh status'}
                </button>
                {subscription?.isEdamaa3dVerified && (
                  <button
                    onClick={() => navigate(`/edamaa3d-verified?actor=${actor}`)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <CheckBadgeIcon className="h-4 w-4" />
                    View Edamaa3D Verified
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#3D08BA]/10 bg-white/90 p-5 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3D08BA]">Plan overview</p>
              <div className="mt-4 rounded-2xl border border-[#3D08BA]/10 bg-[#3D08BA]/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected billing cycle</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{selectedPlanMeta.title}</p>
                <p className="mt-2 text-sm text-slate-600">{selectedPlanMeta.cadence}</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span>Status</span>
                  <span className="font-semibold text-slate-950">{subscriptionStatusText}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span>Current plan</span>
                  <span className="font-semibold text-slate-950">{currentBillingLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span>Verification</span>
                  <span className="font-semibold text-slate-950">{verificationLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {notice && (
          <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm">
            {notice}
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
            {error}
          </p>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D08BA]">Choose billing cycle</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Weekly, monthly, term, or yearly</h3>
              </div>
              <span className="rounded-full bg-[#3D08BA]/6 px-3 py-1 text-xs font-semibold text-[#3D08BA]">
                MVP billing selection
              </span>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {(Object.keys(PLAN_META) as BillingInterval[]).map((interval) => {
                const plan = PLAN_META[interval];
                const isSelected = selectedInterval === interval;
                const isAvailable = availableIntervals.includes(interval);
                return (
                  <button
                    key={interval}
                    type="button"
                    onClick={() => setSelectedInterval(interval)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#3D08BA] bg-[#3D08BA]/[0.05] shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-[#3D08BA]/30 hover:bg-white'
                    } ${!isAvailable ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-950">{plan.title}</p>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3D08BA] shadow-sm">
                            {plan.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-600">{plan.cadence}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isAvailable ? 'Available' : 'Setup needed'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D08BA]">Current selection</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">{selectedPlanMeta.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedPlanMeta.description}</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Billing cycle</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPlanMeta.cadence}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Checkout readiness</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedPlanAvailable
                    ? 'This billing cycle is configured and can open Stripe checkout.'
                    : 'This billing cycle is not configured yet. Add the Stripe price ID on the backend first.'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Renewal window</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{renewalLabel}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D08BA]">What unlocks</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-950">Your paid teaching toolkit</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Core MVP features
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {featureRows.map(({ title, copy, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-[#3D08BA] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D08BA]">Before checkout</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">Keep the plan setup clean</h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Configured plans only</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Weekly, 3-month, and yearly plans only open checkout after their Stripe price IDs are configured.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Refresh after payment</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Use the refresh action on this page if payment finishes in another tab before the sync message appears.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Verification follows subscription</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Edamaa3D verification becomes visible after the paid subscription status is synced successfully.
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default SubscriptionPlans;
