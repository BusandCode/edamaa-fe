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
  drainQueuedSchoolReminderEmails,
  fetchSchoolReminderDeliveryHealth,
  fetchSchoolReminderDispatches,
  createSchoolWithdrawal,
  fetchSchoolFinanceStudents,
  fetchSchoolInvoiceCheckoutStatus,
  fetchSchoolWithdrawals,
  fetchSchoolFinanceDashboard,
  fetchSchoolWithdrawalLedger,
  paySchoolInvoice,
  recordSchoolReminderExportAudit,
  requeueExhaustedSchoolReminderEmails,
  requeueFailedSchoolReminderEmails,
  runSchoolReminderSweep,
  syncSchoolInvoiceCheckout,
  type SchoolFinanceDashboard,
  type SchoolFeeReminderDeliveryHealthResponse,
  type SchoolFeeReminderEmailDrainResponse,
  type SchoolFeeReminderDispatch,
  type SchoolFeeReminderRequeueResponse,
  type SchoolFeeReminderSweepResponse,
  type SchoolFinanceStudent,
  updateSchoolWithdrawalStatus,
} from '../utils/schoolFinanceApi';
import {
  buildSchoolReportFrame,
  createPdfBlob,
  downloadFile,
  joinCsvRow,
  schoolReportStyles,
} from '../../../utils/exportFiles';

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

const reminderStatusStyles: Record<SchoolFeeReminderDispatch['status'], string> = {
  queued: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-700',
};

const reminderTypeLabel: Record<SchoolFeeReminderDispatch['reminderType'], string> = {
  due_soon: 'Due soon',
  overdue: 'Overdue',
};

const reminderChannelLabel: Record<SchoolFeeReminderDispatch['channel'], string> = {
  in_app: 'In-app',
  email: 'Email',
};

type ReminderExportSnapshot = {
  generatedAt: string;
  health: SchoolFeeReminderDeliveryHealthResponse;
  dispatches: SchoolFeeReminderDispatch[];
  filters: {
    channel: 'all' | 'in_app' | 'email';
    status: 'all' | 'queued' | 'sent' | 'failed' | 'skipped';
    reminderType: 'all';
    pageAtExport: number;
    batchLimit: number;
    exportedPages: number;
  };
};

const SchoolFinance = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<SchoolFinanceDashboard | null>(null);
  const [students, setStudents] = useState<SchoolFinanceStudent[]>([]);
  const [withdrawals, setWithdrawals] = useState<SchoolFinanceDashboard['recentPayouts']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<
    | null
    | 'plan'
    | 'invoice'
    | 'withdraw'
    | 'withdrawals-export-csv'
    | 'withdrawals-export-pdf'
    | 'reminders-run'
    | 'reminders-drain'
    | 'reminders-requeue'
    | 'reminders-requeue-exhausted'
    | 'reminders-export-csv'
    | 'reminders-export-pdf'
    | 'reminders-refresh'
    | `pay-${string}`
    | `payout-${string}`
    | `ledger-${string}`
  >(null);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [reminderDispatches, setReminderDispatches] = useState<SchoolFeeReminderDispatch[]>([]);
  const [lastReminderSweep, setLastReminderSweep] = useState<SchoolFeeReminderSweepResponse | null>(null);
  const [lastReminderRequeue, setLastReminderRequeue] =
    useState<SchoolFeeReminderRequeueResponse | null>(null);
  const [lastReminderEmailDrain, setLastReminderEmailDrain] =
    useState<SchoolFeeReminderEmailDrainResponse | null>(null);
  const [lastReminderHealth, setLastReminderHealth] =
    useState<SchoolFeeReminderDeliveryHealthResponse | null>(null);
  const [reminderStatusFilter, setReminderStatusFilter] = useState<
    '' | 'queued' | 'sent' | 'failed' | 'skipped'
  >('');
  const [reminderChannelFilter, setReminderChannelFilter] = useState<'' | 'in_app' | 'email'>('');
  const [reminderPage, setReminderPage] = useState(1);
  const [reminderTotal, setReminderTotal] = useState(0);
  const [reminderTotalPages, setReminderTotalPages] = useState(0);

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
  const calendarYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 41 }, (_, index) => currentYear - 20 + index);
  }, []);
  const monthOptions = useMemo(
    () => [
      { value: '01', label: 'Jan' },
      { value: '02', label: 'Feb' },
      { value: '03', label: 'Mar' },
      { value: '04', label: 'Apr' },
      { value: '05', label: 'May' },
      { value: '06', label: 'Jun' },
      { value: '07', label: 'Jul' },
      { value: '08', label: 'Aug' },
      { value: '09', label: 'Sep' },
      { value: '10', label: 'Oct' },
      { value: '11', label: 'Nov' },
      { value: '12', label: 'Dec' },
    ],
    []
  );

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<
    '' | 'requested' | 'processing' | 'paid' | 'failed' | 'canceled'
  >('');

  const checkoutStatus = searchParams.get('checkout');
  const checkoutSessionId = searchParams.get('session_id');

  const refreshDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const reminderQuery = {
        limit: 24,
        status: reminderStatusFilter || undefined,
        channel: reminderChannelFilter || undefined,
        page: reminderPage,
      };
      const [dashboardPayload, studentsPayload, withdrawalsPayload, reminderPayload, reminderHealthPayload] = await Promise.all([
        fetchSchoolFinanceDashboard(),
        fetchSchoolFinanceStudents(),
        fetchSchoolWithdrawals({ limit: 120 }),
        fetchSchoolReminderDispatches(reminderQuery),
        fetchSchoolReminderDeliveryHealth({ days: 7 }),
      ]);
      setDashboard(dashboardPayload);
      setStudents(studentsPayload.students || []);
      setWithdrawals(Array.isArray(withdrawalsPayload.payouts) ? withdrawalsPayload.payouts : []);
      setReminderDispatches(Array.isArray(reminderPayload.dispatches) ? reminderPayload.dispatches : []);
      setReminderTotal(Number(reminderPayload.total || 0));
      setReminderTotalPages(Number(reminderPayload.totalPages || 0));
      setLastReminderHealth(reminderHealthPayload);
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
  }, [reminderStatusFilter, reminderChannelFilter, reminderPage]);

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

  const failedEmailReminderCount = useMemo(
    () =>
      reminderDispatches.filter(
        (dispatch) => dispatch.channel === 'email' && dispatch.status === 'failed'
      ).length,
    [reminderDispatches]
  );

  const queuedEmailReminderCount = useMemo(
    () =>
      reminderDispatches.filter(
        (dispatch) => dispatch.channel === 'email' && dispatch.status === 'queued'
      ).length,
    [reminderDispatches]
  );

  const exhaustedEmailReminderCount = useMemo(
    () =>
      reminderDispatches.filter(
        (dispatch) =>
          dispatch.channel === 'email' &&
          dispatch.status === 'failed' &&
          Number(dispatch.attemptCount || 0) >= 4
      ).length,
    [reminderDispatches]
  );

  const visibleWithdrawals = useMemo(
    () =>
      (withdrawals || []).filter((payout) =>
        withdrawalStatusFilter ? payout.status === withdrawalStatusFilter : true
      ),
    [withdrawals, withdrawalStatusFilter]
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

  const handleRunReminders = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-run');
    setError(null);
    setNotice(null);
    try {
      const result = await runSchoolReminderSweep();
      setLastReminderSweep(result);
      // Mirror backend retry metrics so finance admins can see delivery health immediately.
      const emailSent = Number(result.emailSent || 0);
      const emailQueuedForRetry = Number(result.emailQueuedForRetry || 0);
      const emailExhausted = Number(result.emailExhausted || 0);
      const emailSkipped = Number(result.emailSkipped || 0);
      setNotice(
        `Reminder sweep completed. ${result.dueSoonInApp + result.overdueInApp} in-app reminders logged, ${emailSent} email sent, ${emailQueuedForRetry} queued for retry, ${emailExhausted} exhausted, and ${emailSkipped} skipped.`
      );
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not run reminder sweep right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleDrainQueuedReminderEmails = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-drain');
    setError(null);
    setNotice(null);
    try {
      const result = await drainQueuedSchoolReminderEmails();
      setLastReminderEmailDrain(result);
      setNotice(
        `Email queue processed. Attempted ${result.attempted}, sent ${result.sent}, skipped ${result.skipped}, retry queued ${result.queuedForRetry}, exhausted ${result.exhausted}.`
      );
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not process queued reminder emails right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRequeueFailedReminderEmails = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-requeue');
    setError(null);
    setNotice(null);
    try {
      const result = await requeueFailedSchoolReminderEmails({ limit: 80 });
      setLastReminderRequeue(result);
      setNotice(
        result.requeued > 0
          ? `Moved ${result.requeued} failed email reminder(s) back to queue.`
          : 'No failed email reminders were eligible for requeue.'
      );
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not requeue failed reminder emails right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRequeueExhaustedReminderEmails = async () => {
    if (activeAction) {
      return;
    }

    const confirmPhrase = 'REQUEUE_EXHAUSTED';
    const confirmation = window.prompt(
      `This will retry exhausted reminder emails. Type ${confirmPhrase} to continue.`,
      ''
    );
    if (!confirmation) {
      return;
    }

    setActiveAction('reminders-requeue-exhausted');
    setError(null);
    setNotice(null);
    try {
      const result = await requeueExhaustedSchoolReminderEmails({
        limit: 80,
        confirm: confirmation,
      });
      setLastReminderRequeue(result);
      setNotice(
        result.requeued > 0
          ? `Moved ${result.requeued} exhausted email reminder(s) back to queue.`
          : 'No exhausted reminder emails were eligible for requeue.'
      );
      await refreshDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not requeue exhausted reminder emails right now.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleRefreshReminderDispatches = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-refresh');
    setError(null);
    try {
      const payload = await fetchSchoolReminderDispatches({
        limit: 24,
        status: reminderStatusFilter || undefined,
        channel: reminderChannelFilter || undefined,
        page: reminderPage,
      });
      setReminderDispatches(Array.isArray(payload.dispatches) ? payload.dispatches : []);
      setReminderTotal(Number(payload.total || 0));
      setReminderTotalPages(Number(payload.totalPages || 0));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Could not refresh reminder dispatches.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const fetchReminderExportSnapshot = async (): Promise<ReminderExportSnapshot> => {
    const health = await fetchSchoolReminderDeliveryHealth({ days: 7 });
    const collectedDispatches: SchoolFeeReminderDispatch[] = [];
    const limit = 200;
    let page = 1;
    let hasMore = true;
    const maxPages = 25;
    let exportedPages = 0;

    while (hasMore && page <= maxPages) {
      const payload = await fetchSchoolReminderDispatches({
        limit,
        page,
        status: reminderStatusFilter || undefined,
        channel: reminderChannelFilter || undefined,
      });
      collectedDispatches.push(...(Array.isArray(payload.dispatches) ? payload.dispatches : []));
      hasMore = Boolean(payload.hasMore);
      exportedPages += 1;
      page += 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      health,
      dispatches: collectedDispatches,
      filters: {
        channel: reminderChannelFilter || 'all',
        status: reminderStatusFilter || 'all',
        reminderType: 'all',
        pageAtExport: reminderPage,
        batchLimit: limit,
        exportedPages,
      },
    };
  };

  const recordReminderExportAuditSafely = async (
    format: 'csv' | 'pdf',
    snapshot: ReminderExportSnapshot
  ) => {
    try {
      await recordSchoolReminderExportAudit({
        format,
        filters: {
          ...snapshot.filters,
          windowDays: snapshot.health.windowDays,
          totalExported: snapshot.dispatches.length,
        },
      });
    } catch (auditError) {
      // Export should still succeed even when audit logging is temporarily unavailable.
      // eslint-disable-next-line no-console
      console.warn('Reminder export audit could not be recorded.', auditError);
    }
  };

  const handleExportReminderCsv = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-export-csv');
    setError(null);
    setNotice(null);
    try {
      const snapshot = await fetchReminderExportSnapshot();
      setLastReminderHealth(snapshot.health);

      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Reminder Analytics', 'Generated At', new Date(snapshot.generatedAt).toLocaleString()]),
        joinCsvRow(['Reminder Analytics', 'Window (days)', snapshot.health.windowDays]),
        joinCsvRow(['Reminder Analytics', 'Total dispatches exported', snapshot.dispatches.length]),
        joinCsvRow(['Reminder Analytics', 'Channel filter', snapshot.filters.channel]),
        joinCsvRow(['Reminder Analytics', 'Status filter', snapshot.filters.status]),
        joinCsvRow(['Reminder Analytics', 'Page at export', snapshot.filters.pageAtExport]),
        joinCsvRow(['Reminder Analytics', 'Exported pages', snapshot.filters.exportedPages]),
        joinCsvRow(['Email Health', 'Sent', snapshot.health.email.sent]),
        joinCsvRow(['Email Health', 'Failed', snapshot.health.email.failed]),
        joinCsvRow(['Email Health', 'Queued', snapshot.health.email.queued]),
        joinCsvRow(['Email Health', 'Skipped', snapshot.health.email.skipped]),
        joinCsvRow(['Email Health', 'Retryable failed', snapshot.health.email.retryableFailed]),
        joinCsvRow(['Email Health', 'Exhausted', snapshot.health.email.exhausted]),
        joinCsvRow([
          'Email Health',
          'Success Rate (%)',
          Number((snapshot.health.email.successRate * 100).toFixed(2)),
        ]),
        joinCsvRow([
          'Email Health',
          'Failure Rate (%)',
          Number((snapshot.health.email.failureRate * 100).toFixed(2)),
        ]),
        '',
        joinCsvRow(['Reminder Dispatches']),
        joinCsvRow([
          'Invoice Title',
          'Student Email',
          'Type',
          'Channel',
          'Status',
          'Attempt Count',
          'Reminder Date',
          'Next Retry',
          'Logged At',
          'Last Error',
        ]),
      ];

      snapshot.dispatches.forEach((dispatch) => {
        lines.push(
          joinCsvRow([
            dispatch.invoiceTitle,
            dispatch.studentEmail,
            dispatch.reminderType,
            dispatch.channel,
            dispatch.status,
            dispatch.attemptCount,
            dispatch.reminderDate,
            dispatch.nextRetryAt || '',
            dispatch.createdAt,
            dispatch.lastError || dispatch.failureReason || '',
          ])
        );
      });

      const dateStamp = new Date().toISOString().split('T')[0];
      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-reminder-analytics-${dateStamp}.csv`
      );

      await recordReminderExportAuditSafely('csv', snapshot);
      setNotice('Reminder analytics CSV download started.');
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'CSV export failed for reminder analytics.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleExportReminderPdf = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('reminders-export-pdf');
    setError(null);
    setNotice(null);
    try {
      const snapshot = await fetchReminderExportSnapshot();
      setLastReminderHealth(snapshot.health);

      const dateStamp = new Date().toISOString().split('T')[0];
      const maxRows = 80;
      const displayDispatches = snapshot.dispatches.slice(0, maxRows);

      const summaryTableBody: Array<Array<string>> = [
        ['Metric', 'Value'],
        ['Generated', new Date(snapshot.generatedAt).toLocaleString()],
        ['Window', `${snapshot.health.windowDays} days`],
        ['Dispatches (export set)', String(snapshot.dispatches.length)],
        ['Channel filter', snapshot.filters.channel],
        ['Status filter', snapshot.filters.status],
        ['Page at export', String(snapshot.filters.pageAtExport)],
        ['Exported pages', String(snapshot.filters.exportedPages)],
        ['Email sent', String(snapshot.health.email.sent)],
        ['Email failed', String(snapshot.health.email.failed)],
        ['Email queued', String(snapshot.health.email.queued)],
        ['Retryable failed', String(snapshot.health.email.retryableFailed)],
        ['Exhausted', String(snapshot.health.email.exhausted)],
        ['Success rate', `${(snapshot.health.email.successRate * 100).toFixed(1)}%`],
      ];

      const dispatchTableBody: Array<Array<string>> = [
        ['Invoice', 'Student', 'Type', 'Channel', 'Status', 'Attempts', 'Next retry'],
        ...displayDispatches.map((dispatch) => [
          dispatch.invoiceTitle,
          dispatch.studentEmail,
          dispatch.reminderType,
          dispatch.channel,
          dispatch.status,
          String(dispatch.attemptCount),
          dispatch.nextRetryAt ? new Date(dispatch.nextRetryAt).toLocaleString() : '-',
        ]),
      ];

      const reportFrame = buildSchoolReportFrame({
        title: 'Reminder Analytics Report',
        subtitle: 'Fee reminder delivery health',
        documentLabel: 'Finance delivery report',
        documentCode: `REM-${dateStamp.replaceAll('-', '')}`,
        generatedAt: new Date(snapshot.generatedAt).toLocaleString(),
        metaLines: [
          `Window: ${snapshot.health.windowDays} days`,
          `Dispatches in export set: ${snapshot.dispatches.length}`,
          `Filters: channel ${snapshot.filters.channel} • status ${snapshot.filters.status}`,
        ],
      });

      const content: Record<string, unknown>[] = [
        ...reportFrame.headerContent,
        { text: 'Delivery Health (7 days)', style: 'sectionTitle', margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: summaryTableBody,
          },
          layout: 'lightHorizontalLines',
        },
        { text: 'Recent Reminder Dispatches', style: 'sectionTitle', margin: [0, 12, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: [115, 120, 44, 44, 44, 44, '*'],
            body: dispatchTableBody,
          },
          layout: 'lightHorizontalLines',
          fontSize: 8,
        },
      ];

      if (snapshot.dispatches.length > maxRows) {
        content.push({
          text: `Showing first ${maxRows} rows out of ${snapshot.dispatches.length}. Use CSV export for full detail.`,
          style: 'meta',
          margin: [0, 6, 0, 0],
        });
      }

      content.push(...reportFrame.signOffContent);

      const docDefinition: Record<string, unknown> = {
        pageSize: 'A4',
        pageMargins: [20, 22, 20, 22],
        footer: reportFrame.footer,
        defaultStyle: {
          font: 'Helvetica',
          fontSize: 10,
          color: '#111827',
        },
        content,
        styles: {
          ...schoolReportStyles,
          title: {
            fontSize: 16,
            bold: true,
            color: '#111827',
          },
          sectionTitle: {
            fontSize: 11,
            bold: true,
            color: '#1f2937',
          },
          meta: {
            fontSize: 9,
            color: '#6b7280',
          },
        },
        info: {
          title: 'Edamaa Reminder Analytics Report',
          author: 'Edamaa Finance',
          subject: 'School reminder delivery analytics',
        },
      };

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-reminder-analytics-${dateStamp}.pdf`);

      await recordReminderExportAuditSafely('pdf', snapshot);
      setNotice('Reminder analytics PDF download started.');
    } catch (requestError) {
      console.error('Unable to export reminder analytics PDF.', requestError);
      const message =
        requestError instanceof Error ? requestError.message : 'PDF export failed for reminder analytics.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handlePreviousReminderPage = () => {
    if (activeAction || reminderPage <= 1) {
      return;
    }
    setReminderPage((current) => Math.max(1, current - 1));
  };

  const handleNextReminderPage = () => {
    if (activeAction) {
      return;
    }
    if (reminderTotalPages > 0 && reminderPage >= reminderTotalPages) {
      return;
    }
    setReminderPage((current) => current + 1);
  };

  const handleExportWithdrawalsCsv = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('withdrawals-export-csv');
    setError(null);
    setNotice(null);
    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Payout Export', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow(['Payout Export', 'Status filter', withdrawalStatusFilter || 'all']),
        joinCsvRow(['Payout Export', 'Rows exported', visibleWithdrawals.length]),
      ];

      lines.push('');
      lines.push(joinCsvRow(['Payout ID', 'Amount', 'Currency', 'Status', 'Requested At', 'Processed At', 'Failure Reason']));
      visibleWithdrawals.forEach((payout) => {
        lines.push(
          joinCsvRow([
            payout.id,
            payout.amount,
            payout.currency,
            payout.status,
            new Date(payout.requestedAt).toLocaleString(),
            payout.processedAt ? new Date(payout.processedAt).toLocaleString() : '',
            payout.failureReason || '',
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-withdrawals-${dateStamp}.csv`
      );
      setNotice('Withdrawal CSV export started.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Withdrawal CSV export failed.';
      setError(message);
    } finally {
      setActiveAction(null);
    }
  };

  const handleExportWithdrawalsPdf = async () => {
    if (activeAction) {
      return;
    }

    setActiveAction('withdrawals-export-pdf');
    setError(null);
    setNotice(null);
    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const bodyRows = [
        ['Payout ID', 'Amount', 'Status', 'Requested', 'Processed'],
        ...visibleWithdrawals.map((payout) => [
          payout.id,
          `${payout.currency} ${payout.amount.toLocaleString()}`,
          payout.status.replace('_', ' '),
          new Date(payout.requestedAt).toLocaleString(),
          payout.processedAt ? new Date(payout.processedAt).toLocaleString() : '-',
        ]),
      ];

      const reportFrame = buildSchoolReportFrame({
        title: 'Withdrawal Report',
        subtitle: 'School payout activity',
        documentLabel: 'Finance payout report',
        documentCode: `PAY-${dateStamp.replaceAll('-', '')}`,
        metaLines: [
          `Status filter: ${withdrawalStatusFilter || 'all'}`,
          `Rows exported: ${visibleWithdrawals.length}`,
        ],
      });

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [28, 28, 28, 32],
        footer: reportFrame.footer,
        content: [
          ...reportFrame.headerContent,
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', 'auto', '*', '*'],
              body: bodyRows,
            },
            layout: 'lightHorizontalLines',
          },
          ...reportFrame.signOffContent,
        ],
        styles: {
          ...schoolReportStyles,
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
          muted: { fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 2] },
        },
      } as Record<string, unknown>;

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-withdrawals-${dateStamp}.pdf`);
      setNotice('Withdrawal PDF export started.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Withdrawal PDF export failed.';
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
            <button
              type="button"
              onClick={() => void handleRunReminders()}
              disabled={activeAction === 'reminders-run'}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === 'reminders-run' ? 'Running Reminders...' : 'Run Reminders Now'}
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
              <div className="space-y-2">
                <input
                  value={invoiceDueDate}
                  onChange={(event) => setInvoiceDueDate(event.target.value)}
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3D08BA] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-gray-500">Jump year:</label>
                  <select
                    value={invoiceDueDate ? invoiceDueDate.slice(0, 4) : ''}
                    onChange={(event) => {
                      const selectedYear = event.target.value;
                      if (!selectedYear) {
                        return;
                      }
                      setInvoiceDueDate((previous) => {
                        const base = previous || `${new Date().getFullYear()}-01-01`;
                        const [, month = '01', day = '01'] = base.split('-');
                        return `${selectedYear}-${month}-${day}`;
                      });
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  >
                    <option value="">Select year</option>
                    {calendarYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <label className="text-[11px] font-semibold text-gray-500">Month:</label>
                  <select
                    value={invoiceDueDate ? invoiceDueDate.slice(5, 7) : ''}
                    onChange={(event) => {
                      const selectedMonth = event.target.value;
                      if (!selectedMonth) {
                        return;
                      }
                      setInvoiceDueDate((previous) => {
                        const base = previous || `${new Date().getFullYear()}-01-01`;
                        const [year = String(new Date().getFullYear()), , day = '01'] = base.split('-');
                        return `${year}-${selectedMonth}-${day}`;
                      });
                    }}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  >
                    <option value="">Select month</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Recent Withdrawals</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600">
                  <span>Status</span>
                  <select
                    value={withdrawalStatusFilter}
                    onChange={(event) =>
                      setWithdrawalStatusFilter(
                        event.target.value as
                          | ''
                          | 'requested'
                          | 'processing'
                          | 'paid'
                          | 'failed'
                          | 'canceled'
                      )
                    }
                    className="rounded border border-gray-200 bg-white px-1 py-0.5 text-[11px] text-gray-700 focus:border-[#3D08BA] focus:outline-none"
                  >
                    <option value="">All</option>
                    <option value="requested">Requested</option>
                    <option value="processing">Processing</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void handleExportWithdrawalsCsv()}
                  disabled={activeAction === 'withdrawals-export-csv' || visibleWithdrawals.length === 0}
                  className="rounded-md border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === 'withdrawals-export-csv' ? 'Exporting...' : 'Export CSV'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportWithdrawalsPdf()}
                  disabled={activeAction === 'withdrawals-export-pdf' || visibleWithdrawals.length === 0}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activeAction === 'withdrawals-export-pdf' ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>
            {visibleWithdrawals.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">No withdrawal history yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {visibleWithdrawals.map((payout) => (
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Reminder Dispatches</h2>
              <p className="text-[11px] text-gray-500">
                Track due soon and overdue reminders sent to students.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleRunReminders()}
                disabled={activeAction === 'reminders-run'}
                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'reminders-run' ? 'Running...' : 'Run Now'}
              </button>
              <button
                type="button"
                onClick={() => void handleDrainQueuedReminderEmails()}
                disabled={activeAction === 'reminders-drain' || queuedEmailReminderCount === 0}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'reminders-drain'
                  ? 'Processing...'
                  : `Process Queued (shown ${queuedEmailReminderCount})`}
              </button>
              <button
                type="button"
                onClick={() => void handleRequeueFailedReminderEmails()}
                disabled={activeAction === 'reminders-requeue' || failedEmailReminderCount === 0}
                className="rounded-md border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'reminders-requeue'
                  ? 'Requeueing...'
                  : `Requeue Failed (shown ${failedEmailReminderCount})`}
              </button>
              <button
                type="button"
                onClick={() => void handleRequeueExhaustedReminderEmails()}
                disabled={
                  activeAction === 'reminders-requeue-exhausted' || exhaustedEmailReminderCount === 0
                }
                className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeAction === 'reminders-requeue-exhausted'
                  ? 'Retrying...'
                  : `Retry Exhausted (shown ${exhaustedEmailReminderCount})`}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={reminderChannelFilter}
              onChange={(event) => {
                setReminderChannelFilter(event.target.value as '' | 'in_app' | 'email');
                setReminderPage(1);
              }}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 focus:border-[#3D08BA] focus:outline-none"
            >
              <option value="">All channels</option>
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
            </select>
            <select
              value={reminderStatusFilter}
              onChange={(event) => {
                setReminderStatusFilter(
                  event.target.value as '' | 'queued' | 'sent' | 'failed' | 'skipped'
                );
                setReminderPage(1);
              }}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 focus:border-[#3D08BA] focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
            <button
              type="button"
              onClick={() => void handleRefreshReminderDispatches()}
              disabled={activeAction === 'reminders-refresh'}
              className="rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === 'reminders-refresh' ? 'Refreshing...' : 'Refresh List'}
            </button>
            <button
              type="button"
              onClick={() => void handleExportReminderCsv()}
              disabled={activeAction === 'reminders-export-csv'}
              className="rounded-md border border-[#3D08BA]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === 'reminders-export-csv' ? 'Exporting CSV...' : 'Export CSV'}
            </button>
            <button
              type="button"
              onClick={() => void handleExportReminderPdf()}
              disabled={activeAction === 'reminders-export-pdf'}
              className="rounded-md border border-[#3D08BA]/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activeAction === 'reminders-export-pdf' ? 'Exporting PDF...' : 'Export PDF'}
            </button>
          </div>

          {lastReminderSweep && (
            <p className="mt-2 text-[11px] text-gray-600">
              Last sweep: {new Date(lastReminderSweep.generatedAt).toLocaleString()} • Scanned{' '}
              {lastReminderSweep.scannedInvoices} invoices • Email sent{' '}
              {Number(lastReminderSweep.emailSent || 0)} • Retry queued{' '}
              {Number(lastReminderSweep.emailQueuedForRetry || 0)} • Exhausted{' '}
              {Number(lastReminderSweep.emailExhausted || 0)}.
            </p>
          )}
          {lastReminderRequeue && (
            <p className="mt-1 text-[11px] text-gray-600">
              Last requeue: {new Date(lastReminderRequeue.generatedAt).toLocaleString()} • Requeued{' '}
              {lastReminderRequeue.requeued} dispatches.
            </p>
          )}
          {lastReminderEmailDrain && (
            <p className="mt-1 text-[11px] text-gray-600">
              Last email processing: attempted {lastReminderEmailDrain.attempted} • sent{' '}
              {lastReminderEmailDrain.sent} • skipped {lastReminderEmailDrain.skipped} • retry queued{' '}
              {lastReminderEmailDrain.queuedForRetry} • exhausted {lastReminderEmailDrain.exhausted}.
            </p>
          )}
          {lastReminderHealth && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-gray-700">
                7-day delivery health
              </p>
              <p className="mt-1 text-[11px] text-gray-600">
                Sent {lastReminderHealth.email.sent} • Failed {lastReminderHealth.email.failed} • Queued{' '}
                {lastReminderHealth.email.queued} • Retryable {lastReminderHealth.email.retryableFailed} • Exhausted{' '}
                {lastReminderHealth.email.exhausted}
              </p>
              <p className="mt-1 text-[11px] text-gray-600">
                Success {(lastReminderHealth.email.successRate * 100).toFixed(1)}% • Failure{' '}
                {(lastReminderHealth.email.failureRate * 100).toFixed(1)}% • Retry{' '}
                {(lastReminderHealth.email.retryRate * 100).toFixed(1)}%
              </p>
            </div>
          )}

          {reminderDispatches.length === 0 ? (
            <p className="mt-3 text-xs text-gray-500">
              No reminder dispatches yet. Run reminders now to generate due soon and overdue prompts.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {reminderDispatches.map((dispatch) => (
                <article
                  key={dispatch.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-900">
                      {dispatch.invoiceTitle} • {dispatch.studentEmail}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reminderStatusStyles[dispatch.status]}`}
                    >
                      {dispatch.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {reminderTypeLabel[dispatch.reminderType]} via {reminderChannelLabel[dispatch.channel]} • Reminder
                    date {new Date(dispatch.reminderDate).toLocaleDateString()}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Logged {new Date(dispatch.createdAt).toLocaleString()} • Attempt {dispatch.attemptCount}
                    {dispatch.nextRetryAt
                      ? ` • Next retry ${new Date(dispatch.nextRetryAt).toLocaleString()}`
                      : ''}
                    {dispatch.lastError ? ` • Last error: ${dispatch.lastError}` : ''}
                    {!dispatch.lastError && dispatch.failureReason ? ` • ${dispatch.failureReason}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-gray-600">
              Showing page {reminderPage}
              {reminderTotalPages > 0 ? ` of ${reminderTotalPages}` : ''} • Total dispatches {reminderTotal}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousReminderPage}
                disabled={activeAction !== null || reminderPage <= 1}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNextReminderPage}
                disabled={
                  activeAction !== null ||
                  reminderTotalPages === 0 ||
                  reminderPage >= reminderTotalPages
                }
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>

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
