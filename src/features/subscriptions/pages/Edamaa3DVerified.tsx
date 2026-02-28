import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  fetchTeachingSubscriptionState,
  type TeachingActor,
  type TeachingSubscriptionState,
} from '../utils/teachingSubscriptionApi';

const parseActor = (value: string | null): TeachingActor => (value === 'school' ? 'school' : 'tutor');

const Edamaa3DVerified = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const actor = parseActor(searchParams.get('actor'));
  const actorLabel = actor === 'school' ? 'School' : 'Tutor';

  const [subscription, setSubscription] = useState<TeachingSubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await fetchTeachingSubscriptionState(actor);
        if (!mounted) {
          return;
        }
        setSubscription(payload);
      } catch (requestError) {
        if (!mounted) {
          return;
        }
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load verification status right now.';
        setError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadStatus();
    return () => {
      mounted = false;
    };
  }, [actor]);

  const isVerified = Boolean(subscription?.isActive && subscription?.isEdamaa3dVerified);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Edamaa3D Verification</h1>
            <p className="text-xs text-gray-500">{actorLabel} trust and compliance badge</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6">
        {isLoading && (
          <p className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            Loading verification status...
          </p>
        )}

        {!isLoading && error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        {!isLoading && !error && !isVerified && (
          <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <LockClosedIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Verification locked</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Subscribe to Edamaa Pro to unlock your Edamaa3D verified status and full teaching access.
                </p>
                <button
                  onClick={() => navigate(`/subscription?actor=${actor}`)}
                  className="mt-4 rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2c0691]"
                >
                  Open subscription plans
                </button>
              </div>
            </div>
          </section>
        )}

        {!isLoading && !error && isVerified && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Status</p>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">Edamaa3D Verified</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Your {actorLabel.toLowerCase()} account is verified and has full teaching permissions.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                <CheckBadgeIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Verified</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                Live class teaching enabled
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                Unlimited offline class scheduling
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                Priority trust badge visibility
              </p>
              <p className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-600" />
                Subscription active
                {subscription?.currentPeriodEndLabel ? ` until ${subscription.currentPeriodEndLabel}` : ''}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Edamaa3DVerified;
