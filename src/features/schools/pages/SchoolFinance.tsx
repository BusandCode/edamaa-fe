import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  PlusCircleIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import {
  createSchoolFeePlan,
  createSchoolInvoice,
  createSchoolWithdrawal,
  fetchSchoolFinanceStudents,
  fetchSchoolInvoiceCheckoutStatus,
  fetchSchoolFinanceDashboard,
  fetchSchoolWithdrawalLedger,
  paySchoolInvoice,
  syncSchoolInvoiceCheckout,
  type SchoolFinanceDashboard,
  type SchoolFinanceStudent,
  updateSchoolWithdrawalStatus,
} from '../utils/schoolFinanceApi';

const fmt = (amount: number) => `₦${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;

const statusStyles: Record<
  SchoolFinanceDashboard['recentInvoices'][number]['status'],
  string
> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-[#3D08BA]/10 text-[#3D08BA]',
  partially_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-700',
};

const payoutStatusStyles: Record<
  SchoolFinanceDashboard['recentPayouts'][number]['status'],
  string
> = {
  requested: 'bg-amber-100 text-amber-700',
  processing: 'bg-[#3D08BA]/10 text-[#3D08BA]',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  canceled: 'bg-slate-100 text-slate-700',
};

const SchoolFinance = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<SchoolFinanceDashboard | null>(null);
  const [students, setStudents] = useState<SchoolFinanceStudent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    null | 'plan' | 'invoice' | 'withdraw' | `pay-${string}` | `payout-${string}` | `ledger-${string}`
  >(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planAmount, setPlanAmount] = useState('');
  const [planDueDays, setPlanDueDays] = useState('');

  const [invoicePlanId, setInvoicePlanId] = useState('');
  const [invoiceStudentPickerValue, setInvoiceStudentPickerValue] = useState('');
  const [invoiceStudentUserId, setInvoiceStudentUserId] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceStudentEmail, setInvoiceStudentEmail] = useState('');
  const [invoiceStudentName, setInvoiceStudentName] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');

  const [withdrawAmount, setWithdrawAmount] = useState('');

  const checkoutStatus = searchParams.get('checkout');
  const checkoutSessionId = searchParams.get('session_id');

  const refreshDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashboardPayload, studentsPayload] = await Promise.all([
        fetchSchoolFinanceDashboard(),
        fetchSchoolFinanceStudents(),
      ]);
      setDashboard(dashboardPayload);
      setStudents(studentsPayload.students || []);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load school finance workspace right now.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    const shouldSync = checkoutStatus === 'success' && checkoutSessionId;
    if (!shouldSync) {
      if (checkoutStatus === 'cancel') {
        setNotice('Payment checkout was canceled. You can try again anytime.');
        setSearchParams({});
      }
      return;
    }

    let isCancelled = false;
    const runSync = async () => {
      try {
        // Webhook-first: give server reconciliation a short window before
        // using manual sync as fallback for local/dev environments.
        let reconciledByWebhook = false;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const status = await fetchSchoolInvoiceCheckoutStatus(checkoutSessionId);
          if (status.isSettled) {
            reconciledByWebhook = true;
            break;
          }

          if (!status.needsManualSync) {
            break;
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(() => resolve(), 1200);
          });
        }

        if (!reconciledByWebhook) {
          await syncSchoolInvoiceCheckout(checkoutSessionId);
        }

        if (!isCancelled) {
          setNotice(
            reconciledByWebhook
              ? 'Payment confirmed and school balance updated.'
              : 'Payment confirmed. We used manual sync because webhook confirmation was delayed.'
          );
          setSearchParams({});
          await refreshDashboard();
        }
      } catch (syncError) {
        if (!isCancelled) {
          const message =
            syncError instanceof Error
              ? syncError.message
              : 'Payment sync could not complete right now.';
          setError(message);
          setSearchParams({});
        }
      }
    };

    void runSync();

    return () => {
      isCancelled = true;
    };
  }, [checkoutSessionId, checkoutStatus, setSearchParams]);

  const summaryCards = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: 'Available Balance',
        value: fmt(dashboard.wallet.available),
        icon: WalletIcon,
        color: 'border-emerald-500',
      },
      {
        label: 'Outstanding Invoices',
        value: fmt(dashboard.overview.outstandingAmount),
        icon: ExclamationCircleIcon,
        color: 'border-red-500',
      },
      {
        label: 'Total Collected',
        value: fmt(dashboard.wallet.lifetimeGross),
        icon: BanknotesIcon,
        color: 'border-[#3D08BA]',
      },
      {
        label: 'Total Withdrawn',
        value: fmt(dashboard.wallet.totalWithdrawn),
        icon: ArrowLeftIcon,
        color: 'border-amber-500',
      },
    ];
  }, [dashboard]);

  const activeFeePlans = useMemo(
    () => (dashboard?.feePlans || []).filter((plan) => plan.isActive),
    [dashboard?.feePlans]
  );

  const selectedInvoicePlan = useMemo(
    () => activeFeePlans.find((plan) => plan.id === invoicePlanId) || null,
    [activeFeePlans, invoicePlanId]
  );

  useEffect(() => {
    if (!selectedInvoicePlan) {
      return;
    }

    // Prefill key invoice fields from the selected plan to reduce manual typing.
    setInvoiceTitle(selectedInvoicePlan.title || '');
    setInvoiceAmount(String(selectedInvoicePlan.amount || ''));
    setInvoiceDescription(selectedInvoicePlan.description || '');

    if (!invoiceDueDate && selectedInvoicePlan.dueDays !== null) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + selectedInvoicePlan.dueDays);
      const yyyy = dueDate.getFullYear();
      const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dueDate.getDate()).padStart(2, '0');
      setInvoiceDueDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [selectedInvoicePlan, invoiceDueDate]);

  const submitCreatePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (activeAction) {
      return;
    }

    setActiveAction('plan');
    setError(null);
    setNotice(null);
    try {
      await createSchoolFeePlan({
        title: planTitle,
        description: planDescription || undefined,
        amount: Number(planAmount),
        dueDays: planDueDays ? Number(planDueDays) : null,
      });
      setPlanTitle('');
      setPlanDescription('');
      setPlanAmount('');
      setPlanDueDays('');
      setIsCreatePlanOpen(false);
      setNotice('Fee plan created successfully.');
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not create fee plan right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const submitCreateInvoice = async (event: FormEvent) => {
    event.preventDefault();
    if (activeAction) {
      return;
    }

    const normalizedStudentEmail = invoiceStudentEmail.trim().toLowerCase();
    const selectedStudentById = invoiceStudentUserId
      ? students.find((student) => student.id === invoiceStudentUserId) || null
      : null;
    const selectedStudentByEmail = normalizedStudentEmail
      ? students.find((student) => student.email.toLowerCase() === normalizedStudentEmail) || null
      : null;
    const selectedStudent = selectedStudentById || selectedStudentByEmail || null;
    const resolvedStudentEmail = normalizedStudentEmail || selectedStudent?.email || '';
    const resolvedStudentName = (invoiceStudentName || selectedStudent?.name || '').trim();
    const resolvedStudentUserId = selectedStudent?.id || undefined;
    const normalizedTitle = invoiceTitle.trim();
    const parsedAmount = Number(invoiceAmount);
    const hasSelectedPlan = Boolean(invoicePlanId);

    if (!resolvedStudentEmail || !resolvedStudentEmail.includes('@')) {
      setError('Please pick a student or enter a valid student email before creating this invoice.');
      return;
    }

    if (hasSelectedPlan && !selectedInvoicePlan) {
      setError('Please choose a valid fee plan from the list, or switch to custom invoice.');
      return;
    }

    if (!hasSelectedPlan && !normalizedTitle) {
      setError('Choose a fee plan or enter an invoice title for this custom invoice.');
      return;
    }

    if (!hasSelectedPlan && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setError('Choose a fee plan or enter a valid invoice amount greater than zero.');
      return;
    }

    setActiveAction('invoice');
    setError(null);
    setNotice(null);
    try {
      await createSchoolInvoice({
        feePlanId: hasSelectedPlan ? invoicePlanId : undefined,
        title: normalizedTitle || undefined,
        description: invoiceDescription || undefined,
        amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
        studentUserId: resolvedStudentUserId,
        studentEmail: resolvedStudentEmail,
        studentName: resolvedStudentName || undefined,
        dueDate: invoiceDueDate || undefined,
      });
      setInvoicePlanId('');
      setInvoiceStudentPickerValue('');
      setInvoiceStudentUserId('');
      setInvoiceTitle('');
      setInvoiceDescription('');
      setInvoiceAmount('');
      setInvoiceStudentEmail('');
      setInvoiceStudentName('');
      setInvoiceDueDate('');
      setIsCreateInvoiceOpen(false);
      setNotice('Invoice created and ready for payment.');
      await refreshDashboard();
    } catch (requestError) {
      const rawMessage =
        requestError instanceof Error ? requestError.message : 'Could not create invoice right now.';
      if (rawMessage.toLowerCase().includes('temporarily unavailable')) {
        setError(
          `${rawMessage} For local development, make sure your database is running and migrations are applied before creating invoices.`
        );
      } else {
        setError(rawMessage);
      }
    } finally {
      setActiveAction(null);
    }
  };

  const submitWithdrawal = async (event: FormEvent) => {
    event.preventDefault();
    if (activeAction) {
      return;
    }

    setActiveAction('withdraw');
    setError(null);
    setNotice(null);
    try {
      await createSchoolWithdrawal({
        amount: Number(withdrawAmount),
      });
      setWithdrawAmount('');
      setIsWithdrawOpen(false);
      setNotice('Withdrawal request submitted. Funds moved to hold while payout is processed.');
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not process withdrawal right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleUpdateWithdrawalStatus = async (
    payoutId: string,
    status: 'requested' | 'processing' | 'paid' | 'failed' | 'canceled'
  ) => {
    if (activeAction) {
      return;
    }

    setActiveAction(`payout-${payoutId}`);
    setError(null);
    setNotice(null);

    try {
      const failureReason =
        status === 'failed'
          ? window.prompt('Why did this payout fail? This helps keep your ledger clear.', '') || undefined
          : undefined;
      await updateSchoolWithdrawalStatus({
        payoutId,
        status,
        failureReason,
      });
      setNotice(`Payout moved to ${status.replace('_', ' ')}.`);
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not update payout status right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleViewWithdrawalLedger = async (payoutId: string) => {
    if (activeAction) {
      return;
    }

    setActiveAction(`ledger-${payoutId}`);
    setError(null);

    try {
      const payload = await fetchSchoolWithdrawalLedger(payoutId);
      const timeline = payload.ledger
        .map((entry) => {
          const when = new Date(entry.createdAt).toLocaleString();
          const previous = entry.previousStatus ? `${entry.previousStatus} -> ` : '';
          return `${when}: ${previous}${entry.nextStatus}${entry.note ? ` (${entry.note})` : ''}`;
        })
        .join('\n');

      window.alert(
        timeline ||
          'No ledger events yet for this payout. The first event appears as soon as processing starts.'
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Could not load payout ledger.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    if (activeAction) {
      return;
    }

    setActiveAction(`pay-${invoiceId}`);
    setError(null);
    setNotice(null);
    try {
      const payload = (await paySchoolInvoice(invoiceId)) as {
        mode: 'checkout' | 'settled';
        checkoutUrl?: string | null;
        message?: string;
      };

      if (payload.mode === 'checkout' && payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      setNotice(payload.message || 'Invoice payment completed successfully.');
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Could not process invoice payment.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/school-dashboard')}
              aria-label="Back to dashboard"
              title="Back to dashboard"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-xs transition-colors hover:border-[#3D08BA]/25 hover:text-[#3D08BA] hover:bg-[#3D08BA]/5 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]/20"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">School Fees Management</h1>
              <p className="max-w-2xl text-sm text-gray-600">
                Manage fee plans, student invoices, school balance, and withdrawals.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setIsCreatePlanOpen((current) => !current)}
              className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
            >
              + New Fee Plan
            </button>
            <button
              type="button"
              onClick={() => setIsCreateInvoiceOpen((current) => !current)}
              className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2c0691]"
            >
              + New Invoice
            </button>
            <button
              type="button"
              onClick={() => setIsWithdrawOpen((current) => !current)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Withdraw Funds
            </button>
          </div>
        </div>

        {notice && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        {isCreatePlanOpen && (
          <form
            onSubmit={submitCreatePlan}
            className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-gray-900">Create Fee Plan</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={planTitle}
                onChange={(event) => setPlanTitle(event.target.value)}
                placeholder="Plan title"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                required
              />
              <input
                value={planAmount}
                onChange={(event) => setPlanAmount(event.target.value)}
                placeholder="Amount (NGN)"
                type="number"
                min={1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                required
              />
              <input
                value={planDueDays}
                onChange={(event) => setPlanDueDays(event.target.value)}
                placeholder="Due days (optional)"
                type="number"
                min={0}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
              />
              <input
                value={planDescription}
                onChange={(event) => setPlanDescription(event.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={activeAction === 'plan'}
                className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'plan' ? 'Saving...' : 'Save Fee Plan'}
              </button>
            </div>
          </form>
        )}

        {isCreateInvoiceOpen && (
          <form
            onSubmit={submitCreateInvoice}
            className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-gray-900">Create Student Invoice</h2>
            <p className="mt-1 text-[11px] text-gray-600">
              Pick a student to auto-fill details. You can still enter an email manually when needed.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <select
                  value={invoiceStudentPickerValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setInvoiceStudentPickerValue(nextValue);

                    if (!nextValue) {
                      setInvoiceStudentUserId('');
                      return;
                    }

                    const [targetType, targetValue] = nextValue.split(':', 2);
                    if (!targetValue) {
                      setInvoiceStudentUserId('');
                      return;
                    }

                    if (targetType === 'id') {
                      const selectedStudent =
                        students.find((student) => student.id === targetValue) || null;
                      setInvoiceStudentUserId(targetValue);
                      if (selectedStudent?.email) {
                        setInvoiceStudentEmail(selectedStudent.email);
                      }
                      if (!invoiceStudentName && selectedStudent?.name) {
                        setInvoiceStudentName(selectedStudent.name);
                      }
                      return;
                    }

                    const normalizedEmail = targetValue.trim().toLowerCase();
                    const selectedStudent =
                      students.find((student) => student.email.toLowerCase() === normalizedEmail) ||
                      null;
                    setInvoiceStudentUserId(selectedStudent?.id || '');
                    setInvoiceStudentEmail(selectedStudent?.email || normalizedEmail);
                    if (!invoiceStudentName && selectedStudent?.name) {
                      setInvoiceStudentName(selectedStudent.name);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                >
                  <option value="">Select student from list (recommended)</option>
                  {students.map((student) => (
                    <option
                      key={`student-option-${student.id || student.email}`}
                      value={student.id ? `id:${student.id}` : `email:${student.email}`}
                    >
                      {(student.name || student.email) + (student.name ? ` (${student.email})` : '')}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500">
                  {students.length > 0
                    ? 'Student list helps avoid assigning invoices to the wrong account.'
                    : 'No student records found yet. Enter student email manually below.'}
                </p>
              </div>
              <div className="space-y-1">
                <select
                  value={invoicePlanId}
                  onChange={(event) => setInvoicePlanId(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                >
                  <option value="">Custom invoice (no fee plan)</option>
                  {activeFeePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} - {fmt(plan.amount)}
                    </option>
                  ))}
                </select>
                {activeFeePlans.length === 0 ? (
                  <p className="text-[11px] text-amber-700">
                    No active fee plan found yet. Create one first or continue with a custom invoice.
                  </p>
                ) : selectedInvoicePlan ? (
                  <p className="text-[11px] text-[#3D08BA]">
                    Selected plan: {selectedInvoicePlan.title} ({fmt(selectedInvoicePlan.amount)})
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    Pick a plan to auto-fill title, amount, and due date.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <input
                  value={invoiceStudentEmail}
                  onChange={(event) => {
                    const nextEmail = event.target.value;
                    setInvoiceStudentEmail(nextEmail);
                    const normalizedNextEmail = nextEmail.trim().toLowerCase();
                    const matchedStudent =
                      students.find((student) => student.email.toLowerCase() === normalizedNextEmail) ||
                      null;

                    if (matchedStudent?.id) {
                      setInvoiceStudentUserId(matchedStudent.id);
                      setInvoiceStudentPickerValue(`id:${matchedStudent.id}`);
                    } else if (matchedStudent) {
                      setInvoiceStudentUserId('');
                      setInvoiceStudentPickerValue(`email:${matchedStudent.email}`);
                    } else {
                      setInvoiceStudentUserId('');
                      setInvoiceStudentPickerValue('');
                    }
                  }}
                  placeholder="Student email (required)"
                  type="email"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                  required
                />
                <p className="text-[11px] text-gray-500">This email is how the student receives and sees this invoice.</p>
              </div>
              <div className="space-y-1">
                <input
                  value={invoiceStudentName}
                  onChange={(event) => setInvoiceStudentName(event.target.value)}
                  placeholder="Student name (optional, display only)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                />
                <p className="text-[11px] text-gray-500">
                  Name helps you recognize the invoice. Account matching uses student record/email.
                </p>
              </div>
              <input
                value={invoiceTitle}
                onChange={(event) => setInvoiceTitle(event.target.value)}
                placeholder={selectedInvoicePlan ? 'Invoice title (auto-filled from plan)' : 'Invoice title'}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                required={!invoicePlanId}
              />
              <input
                value={invoiceAmount}
                onChange={(event) => setInvoiceAmount(event.target.value)}
                placeholder={selectedInvoicePlan ? 'Amount (auto-filled from plan)' : 'Amount'}
                type="number"
                min={1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                required={!invoicePlanId}
              />
              <input
                value={invoiceDueDate}
                onChange={(event) => setInvoiceDueDate(event.target.value)}
                type="date"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
              />
              <input
                value={invoiceDescription}
                onChange={(event) => setInvoiceDescription(event.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={activeAction === 'invoice'}
                className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'invoice' ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        )}

        {isWithdrawOpen && (
          <form
            onSubmit={submitWithdrawal}
            className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-gray-900">Request Withdrawal</h2>
            <p className="mt-1 text-xs text-gray-600">
              Current available balance: {fmt(dashboard?.wallet.available || 0)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="Amount to withdraw (NGN)"
                type="number"
                min={1}
                className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={activeAction === 'withdraw'}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'withdraw' ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-xl border-l-4 ${card.color} bg-white p-4 shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <p className="mt-2 text-lg font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Fee Plans</h2>
            {(dashboard?.feePlans || []).length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">
                No fee plans yet. Create one to speed up invoice creation.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {dashboard?.feePlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-gray-900">{plan.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{plan.description || 'No description.'}</p>
                    <p className="mt-1 text-xs font-semibold text-[#3D08BA]">
                      {fmt(plan.amount)} {plan.currency}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Recent Withdrawals</h2>
            {(dashboard?.recentPayouts || []).length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">No withdrawal history yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {dashboard?.recentPayouts.map((payout) => (
                  <article
                    key={payout.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900">{fmt(payout.amount)}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${payoutStatusStyles[payout.status]}`}
                      >
                        {payout.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Requested {new Date(payout.requestedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Ledger events: {payout.ledgerCount ?? 0}
                    </p>
                    {payout.processedAt && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Processed {new Date(payout.processedAt).toLocaleString()}
                      </p>
                    )}
                    {payout.failureReason && (
                      <p className="mt-1 text-[11px] text-red-600">
                        Reason: {payout.failureReason}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleViewWithdrawalLedger(payout.id)}
                        disabled={activeAction !== null}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        View Ledger
                      </button>
                      {payout.status === 'requested' && (
                        <button
                          type="button"
                          onClick={() => void handleUpdateWithdrawalStatus(payout.id, 'processing')}
                          disabled={activeAction !== null}
                          className="rounded-md border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-2 py-1 text-[10px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark Processing
                        </button>
                      )}
                      {(payout.status === 'requested' || payout.status === 'processing') && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleUpdateWithdrawalStatus(payout.id, 'paid')}
                            disabled={activeAction !== null}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUpdateWithdrawalStatus(payout.id, 'failed')}
                            disabled={activeAction !== null}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Failed
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-[#3D08BA]" />
            <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
          </div>

          {isLoading ? (
            <p className="text-xs text-gray-500">Loading school finance data...</p>
          ) : (dashboard?.recentInvoices || []).length === 0 ? (
            <p className="text-xs text-gray-500">No invoices yet. Create your first invoice above.</p>
          ) : (
            <div className="space-y-2">
              {dashboard?.recentInvoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{invoice.title}</p>
                      <p className="text-xs text-gray-600">
                        {invoice.studentName || invoice.studentEmail} • {fmt(invoice.amount)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        statusStyles[invoice.status]
                      }`}
                    >
                      {invoice.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500">
                      Created {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                    {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                      <button
                        type="button"
                        onClick={() => void handlePayInvoice(invoice.id)}
                        disabled={activeAction === `pay-${invoice.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PlusCircleIcon className="h-3.5 w-3.5" />
                        {activeAction === `pay-${invoice.id}` ? 'Processing...' : 'Pay/Test Invoice'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Recent Payments</h2>
          {(dashboard?.recentPayments || []).length === 0 ? (
            <p className="mt-3 text-xs text-gray-500">No payment records yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {dashboard?.recentPayments.slice(0, 12).map((payment) => (
                <article
                  key={payment.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-900">
                      {payment.payerEmail} paid {fmt(payment.grossAmount)}
                    </p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {payment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Net to school: {fmt(payment.netAmount)} • Fees: {fmt(payment.platformFee + payment.processingFee)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SchoolFinance;
