import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import NewLogo from '../../../components/common/NewLogo';
import { loadPersistedLocalDevAuthSession } from '../../../utils/authSession';
import { signOutEverywhere } from '../../../utils/signOut';
import {
  fetchInternalAdminPayoutLedger,
  fetchInternalAdminPayoutQueue,
  updateInternalAdminPayoutStatus,
  type InternalAdminPayoutLedgerResponse,
  type InternalAdminPayoutQueueResponse,
  type InternalAdminPayoutStatus,
  type InternalAdminPayoutStatusFilter,
} from '../utils/internalAdminFinanceApi';

const PAGE_LIMIT = 20;

const payoutStatusStyles: Record<InternalAdminPayoutStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  processing: 'bg-[#3D08BA]/10 text-[#3D08BA]',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-700',
};

const formatStatusLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const InternalAdminPayouts = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<InternalAdminPayoutQueueResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<InternalAdminPayoutStatusFilter>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [ledgerDetails, setLedgerDetails] = useState<InternalAdminPayoutLedgerResponse | null>(null);

  const refreshQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchInternalAdminPayoutQueue({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: PAGE_LIMIT,
      });
      setQueue(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load payout queue.');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const summaryCards = useMemo(() => {
    const summary = queue?.summary;
    return [
      {
        label: 'Requested',
        value: summary?.requested ?? 0,
      },
      {
        label: 'Processing',
        value: summary?.processing ?? 0,
      },
      {
        label: 'Paid',
        value: summary?.paid ?? 0,
      },
      {
        label: 'Failed',
        value: summary?.failed ?? 0,
      },
      {
        label: 'Canceled',
        value: summary?.canceled ?? 0,
      },
      {
        label: 'Total',
        value: queue?.total ?? 0,
      },
    ];
  }, [queue]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleRefresh = async () => {
    setActiveAction('refresh');
    await refreshQueue();
    setActiveAction(null);
  };

  const handleUpdateStatus = async (payoutId: string, status: InternalAdminPayoutStatus) => {
    let failureReason: string | undefined;

    if (status === 'failed') {
      const userInput = window.prompt(
        'Add a short reason so the school understands why this payout failed:',
        ''
      );
      if (userInput === null) {
        return;
      }
      failureReason = userInput.trim();
      if (!failureReason) {
        setError('A failure reason is required when marking a payout as failed.');
        return;
      }
    }

    setError(null);
    setNotice(null);
    setActiveAction(`status-${payoutId}-${status}`);

    try {
      const localDevSession = loadPersistedLocalDevAuthSession();
      const response = await updateInternalAdminPayoutStatus(payoutId, {
        status,
        failureReason,
        processedBy: localDevSession?.email,
      });
      setNotice(response.message);
      await refreshQueue();

      if (ledgerDetails?.payout.id === payoutId) {
        const latestLedger = await fetchInternalAdminPayoutLedger(payoutId);
        setLedgerDetails(latestLedger);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update payout status.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleOpenLedger = async (payoutId: string) => {
    setError(null);
    setActiveAction(`ledger-${payoutId}`);
    try {
      const payload = await fetchInternalAdminPayoutLedger(payoutId);
      setLedgerDetails(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load payout ledger.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleSignOut = async () => {
    await signOutEverywhere();
    navigate('/signin', { replace: true });
  };

  const payouts = queue?.payouts || [];
  const currentPage = queue?.page ?? page;
  const totalPages = queue?.totalPages ?? 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <NewLogo logoWidth={34} logoHeight={34} textSize="text-[16px]" gap="gap-2" centered={false} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={activeAction === 'refresh' || isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-[#3D08BA]/30 bg-white px-3 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {activeAction === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2f0691]"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#121212]">Internal Payout Queue</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review school withdrawal payouts, update status, and check each payout ledger in real time.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Generated</p>
              <p className="text-xs font-semibold text-gray-700">{formatDateTime(queue?.generatedAt || null)}</p>
            </div>
          </div>

          {notice && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_auto_auto]" onSubmit={handleSearchSubmit}>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as InternalAdminPayoutStatusFilter);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#3D08BA] focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="requested">Requested</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="canceled">Canceled</option>
            </select>

            <label className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by school name, email, or payout id"
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-[#3D08BA] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              className="rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f0691]"
            >
              Search
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Clear
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {summaryCards.map((card) => (
              <article key={card.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">{card.label}</p>
                <p className="mt-1 text-lg font-semibold text-[#121212]">{card.value.toLocaleString()}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                Loading payout queue...
              </div>
            ) : payouts.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                No payout requests found for the selected filters.
              </div>
            ) : (
              payouts.map((item) => {
                const payout = item.payout;
                const rowBusy =
                  activeAction === `ledger-${payout.id}` || activeAction?.startsWith(`status-${payout.id}-`) || false;

                return (
                  <article key={payout.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-[#121212]">{item.school.name}</h2>
                        <p className="text-xs text-gray-500">{item.school.email}</p>
                        <p className="mt-1 text-xs text-gray-500">Payout ID: {payout.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-[#121212]">
                          {formatMoney(payout.amount, payout.currency)}
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${payoutStatusStyles[payout.status]}`}
                        >
                          {formatStatusLabel(payout.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>Requested: {formatDateTime(payout.requestedAt)}</p>
                      <p>Processed: {formatDateTime(payout.processedAt)}</p>
                      <p>Ledger events: {payout.ledgerCount.toLocaleString()}</p>
                      <p>Wallet on-hold: {formatMoney(item.wallet.onHold, payout.currency)}</p>
                    </div>

                    {payout.failureReason && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        Failure reason: {payout.failureReason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleOpenLedger(payout.id)}
                        disabled={rowBusy}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeAction === `ledger-${payout.id}` ? 'Opening ledger...' : 'View ledger'}
                      </button>

                      {payout.status === 'requested' && (
                        <button
                          type="button"
                          onClick={() => void handleUpdateStatus(payout.id, 'processing')}
                          disabled={rowBusy}
                          className="rounded-lg border border-[#3D08BA]/30 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Move to processing
                        </button>
                      )}

                      {(payout.status === 'requested' || payout.status === 'processing') && (
                        <button
                          type="button"
                          onClick={() => void handleUpdateStatus(payout.id, 'paid')}
                          disabled={rowBusy}
                          className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark as paid
                        </button>
                      )}

                      {(payout.status === 'requested' || payout.status === 'processing') && (
                        <button
                          type="button"
                          onClick={() => void handleUpdateStatus(payout.id, 'failed')}
                          disabled={rowBusy}
                          className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark as failed
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-xs text-gray-600">
            <p>
              Page {Math.max(1, currentPage)} of {Math.max(1, totalPages || 1)}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLoading || currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={isLoading || !(queue?.hasMore || false)}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      {ledgerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#121212]">Payout Ledger</h2>
                <p className="text-sm text-gray-600">
                  {ledgerDetails.school.name} ({ledgerDetails.school.email})
                </p>
                <p className="mt-1 text-xs text-gray-500">Payout ID: {ledgerDetails.payout.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setLedgerDetails(null)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                aria-label="Close ledger"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-3">
              <p>Amount: {formatMoney(ledgerDetails.payout.amount, ledgerDetails.payout.currency)}</p>
              <p>Status: {formatStatusLabel(ledgerDetails.payout.status)}</p>
              <p>Wallet available: {formatMoney(ledgerDetails.wallet.available, ledgerDetails.payout.currency)}</p>
            </div>

            <div className="mt-4 space-y-2">
              {ledgerDetails.ledger.length === 0 ? (
                <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-600">
                  No ledger events yet for this payout.
                </p>
              ) : (
                ledgerDetails.ledger.map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#121212]">
                        {formatStatusLabel(entry.previousStatus || 'requested')} to{' '}
                        {formatStatusLabel(entry.nextStatus)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      Amount moved: {formatMoney(entry.amount, entry.currency)}
                    </p>
                    {entry.note && <p className="mt-1 text-xs text-gray-600">Note: {entry.note}</p>}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalAdminPayouts;
