import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type {
  StripeCardCvcElementChangeEvent,
  StripeCardExpiryElementChangeEvent,
  StripeCardNumberElementChangeEvent,
  StripeElementsOptions,
} from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { loadPersistedSupabaseAccessToken } from '../../../utils/authSession';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Payment {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue' | 'upcoming';
  category: 'tuition' | 'accommodation' | 'fees' | 'materials';
  receipt?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  label: string;
  last4: string;
  isDefault: boolean;
}

type CardBrand = 'visa' | 'mastercard' | 'verve' | 'card' | 'unknown';

type FilterId = 'all' | 'paid' | 'pending' | 'overdue';

interface PaymentDashboardResponse {
  generatedAt: string;
  summary: {
    totalPaid: number;
    totalPending: number;
    totalUpcoming: number;
    overdueCount: number;
  };
  methods: PaymentMethod[];
  payments: Payment[];
  dataQuality?: {
    degraded: boolean;
    source: 'prisma' | 'memory';
  };
}

interface PayTransactionResponse {
  mode: 'checkout' | 'settled';
  checkoutUrl?: string | null;
  transaction: Payment;
  message?: string;
}

interface AddMethodResponse {
  method: PaymentMethod;
  methods: PaymentMethod[];
}

interface SetupIntentResponse {
  setupIntentId: string;
  clientSecret: string;
  publishableKey: string;
  customerId: string;
}

interface ReceiptResponse {
  transactionId: string;
  receiptNumber: string;
  fileName: string;
  content: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusStyle = (s: Payment['status']) => {
  switch (s) {
    case 'paid':      return { bg: 'bg-emerald-100',  text: 'text-emerald-700',  dot: 'bg-emerald-500' };
    case 'pending':   return { bg: 'bg-[#3D08BA]/10', text: 'text-[#3D08BA]',    dot: 'bg-[#3D08BA]' };
    case 'overdue':   return { bg: 'bg-red-100',      text: 'text-red-700',      dot: 'bg-red-500' };
    case 'upcoming':  return { bg: 'bg-amber-100',    text: 'text-amber-700',    dot: 'bg-amber-500' };
  }
};

const categoryColor = (c: Payment['category']) => {
  switch (c) {
    case 'tuition':       return 'bg-[#3D08BA]/10 text-[#3D08BA]';
    case 'accommodation': return 'bg-[#F68C29]/10 text-[#F68C29]';
    case 'fees':          return 'bg-emerald-100 text-emerald-700';
    case 'materials':     return 'bg-violet-100 text-violet-700';
  }
};

const fmt = (n: number) => `₦${n.toLocaleString()}`;

const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  verve: 'Verve',
  card: 'Card',
  unknown: 'Card',
};

const mapStripeBrand = (brand: string): CardBrand => {
  const normalized = brand.trim().toLowerCase();
  if (normalized === 'visa') {
    return 'visa';
  }
  if (normalized === 'mastercard') {
    return 'mastercard';
  }
  if (normalized === 'verve') {
    return 'verve';
  }
  if (normalized) {
    return 'card';
  }
  return 'unknown';
};

const buildDefaultCardLabel = (brand: CardBrand) => {
  const normalizedBrand = brand === 'unknown' ? 'card' : brand;
  const labelBase = CARD_BRAND_LABEL[normalizedBrand];
  if (/card$/i.test(labelBase)) {
    return labelBase;
  }
  return `${labelBase} card`;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

const FALLBACK_PAYMENTS: Payment[] = [
  {
    id: 'P001',
    description: 'First Semester Tuition',
    amount: 450000,
    date: 'Sep 15, 2024',
    status: 'paid',
    category: 'tuition',
    receipt: 'RCP-20240915-001',
  },
  {
    id: 'P002',
    description: 'Accommodation Fee (Session 1)',
    amount: 180000,
    date: 'Sep 18, 2024',
    status: 'paid',
    category: 'accommodation',
    receipt: 'RCP-20240918-002',
  },
  {
    id: 'P003',
    description: 'Student Union Dues',
    amount: 15000,
    date: 'Oct 02, 2024',
    status: 'paid',
    category: 'fees',
    receipt: 'RCP-20241002-003',
  },
  {
    id: 'P004',
    description: 'Lab Materials - Chemistry',
    amount: 32000,
    date: 'Oct 20, 2024',
    status: 'paid',
    category: 'materials',
    receipt: 'RCP-20241020-004',
  },
  {
    id: 'P005',
    description: 'Library Access Fee',
    amount: 8000,
    date: 'Nov 05, 2024',
    status: 'paid',
    category: 'fees',
    receipt: 'RCP-20241105-005',
  },
  {
    id: 'P006',
    description: 'Second Semester Tuition',
    amount: 450000,
    date: 'Jan 10, 2025',
    status: 'pending',
    category: 'tuition',
  },
  {
    id: 'P007',
    description: 'Accommodation Fee (Session 2)',
    amount: 180000,
    date: 'Jan 15, 2025',
    status: 'overdue',
    category: 'accommodation',
  },
  {
    id: 'P008',
    description: 'Examination Registration',
    amount: 25000,
    date: 'Feb 01, 2025',
    status: 'upcoming',
    category: 'fees',
  },
  {
    id: 'P009',
    description: 'Lab Materials - Physics',
    amount: 28000,
    date: 'Feb 14, 2025',
    status: 'upcoming',
    category: 'materials',
  },
];

const FALLBACK_METHODS: PaymentMethod[] = [
  { id: 'M1', type: 'card', label: 'Visa ending', last4: '4291', isDefault: true },
  { id: 'M2', type: 'bank', label: 'GTBank A/c', last4: '7823', isDefault: false },
  { id: 'M3', type: 'card', label: 'Mastercard', last4: '0047', isDefault: false },
];

type StripeCardSetupFormProps = {
  clientSecret: string;
  disabled: boolean;
  onBrandChange: (brand: CardBrand) => void;
  onErrorChange: (message: string | null) => void;
  onConfirmed: (setupIntentId: string, brand: CardBrand) => Promise<void>;
};

const StripeCardSetupForm = ({
  clientSecret,
  disabled,
  onBrandChange,
  onErrorChange,
  onConfirmed,
}: StripeCardSetupFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brand, setBrand] = useState<CardBrand>('unknown');

  const stripeInputStyle = {
    base: {
      color: '#111827',
      fontSize: '14px',
      iconColor: '#3D08BA',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#B91C1C',
      iconColor: '#B91C1C',
    },
  } as const;

  const handleCardNumberChange = (event: StripeCardNumberElementChangeEvent) => {
    const detectedBrand = mapStripeBrand(event.brand || '');
    setBrand(detectedBrand);
    onBrandChange(detectedBrand);

    if (event.error?.message) {
      onErrorChange(event.error.message);
      return;
    }

    onErrorChange(null);
  };

  const handleCardMetaChange = (
    event: StripeCardExpiryElementChangeEvent | StripeCardCvcElementChangeEvent
  ) => {
    if (event.error?.message) {
      onErrorChange(event.error.message);
      return;
    }

    onErrorChange(null);
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      onErrorChange('Secure card form is still loading. Please wait a moment.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      onErrorChange('Card input fields are not ready yet. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);
    onErrorChange(null);
    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (error) {
        throw new Error(error.message || 'Card verification failed. Please try again.');
      }

      if (!setupIntent?.id) {
        throw new Error('Card setup completed without a setup reference.');
      }

      await onConfirmed(setupIntent.id, brand);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify this card right now.';
      onErrorChange(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="payment-card-number" className="block text-xs font-semibold text-gray-700 mb-1">
          Card number
        </label>
        <div
          id="payment-card-number"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#3D08BA] focus-within:border-transparent"
        >
          <CardNumberElement
            onChange={handleCardNumberChange}
            options={{
              showIcon: true,
              style: stripeInputStyle,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="payment-card-expiry" className="block text-xs font-semibold text-gray-700 mb-1">
            Expiry date
          </label>
          <div
            id="payment-card-expiry"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#3D08BA] focus-within:border-transparent"
          >
            <CardExpiryElement onChange={handleCardMetaChange} options={{ style: stripeInputStyle }} />
          </div>
        </div>
        <div>
          <label htmlFor="payment-card-cvc" className="block text-xs font-semibold text-gray-700 mb-1">
            CVV
          </label>
          <div
            id="payment-card-cvc"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#3D08BA] focus-within:border-transparent"
          >
            <CardCvcElement onChange={handleCardMetaChange} options={{ style: stripeInputStyle }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-1 text-[10px] font-bold ${
            brand === 'unknown' ? 'bg-gray-100 text-gray-500' : 'bg-[#3D08BA]/10 text-[#3D08BA]'
          }`}
        >
          {CARD_BRAND_LABEL[brand]}
        </span>
        <button
          onClick={() => void handleSubmit()}
          disabled={disabled || isSubmitting}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#3D08BA] hover:bg-[#2c0691] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying card...' : disabled ? 'Saving...' : 'Save card'}
        </button>
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const Payments = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>(FALLBACK_PAYMENTS);
  const [methods, setMethods] = useState<PaymentMethod[]>(FALLBACK_METHODS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [cardNickname, setCardNickname] = useState('');
  const [setAsDefaultMethod, setSetAsDefaultMethod] = useState(false);
  const [addMethodError, setAddMethodError] = useState<string | null>(null);
  const [addMethodSuccess, setAddMethodSuccess] = useState<string | null>(null);
  const [detectedCardBrand, setDetectedCardBrand] = useState<CardBrand>('unknown');
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [isPreparingStripeForm, setIsPreparingStripeForm] = useState(false);

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) {
      return null;
    }

    return loadStripe(stripePublishableKey);
  }, [stripePublishableKey]);

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
      // Ignore JSON parsing failures and use status fallback below.
    }
    return `Request failed with status ${response.status}`;
  };

  const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
    const token = loadPersistedSupabaseAccessToken();
    if (!token) {
      throw new Error('Sign in with your authenticated account to use live payment actions.');
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

  const refreshDashboard = async () => {
    const token = loadPersistedSupabaseAccessToken();
    if (!token) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestWithAuth('/payments/me/dashboard');
      const payload = (await response.json()) as PaymentDashboardResponse;
      if (Array.isArray(payload.payments) && payload.payments.length > 0) {
        setPayments(payload.payments);
      } else {
        setPayments([]);
      }

      if (Array.isArray(payload.methods) && payload.methods.length > 0) {
        setMethods(payload.methods);
      } else {
        setMethods([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load payments right now.';
      console.warn(message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePayNow = async (paymentId: string) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`pay-${paymentId}`);
    try {
      const response = await requestWithAuth(`/payments/me/transactions/${encodeURIComponent(paymentId)}/pay`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as PayTransactionResponse;

      if (payload.mode === 'checkout' && payload.checkoutUrl) {
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (payload.transaction) {
        setPayments((previous) =>
          previous.map((payment) => (payment.id === payload.transaction.id ? payload.transaction : payment))
        );
      }

      if (payload.message) {
        window.alert(payload.message);
      }

      await refreshDashboard();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment could not be completed right now.';
      window.alert(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`receipt-${paymentId}`);
    try {
      const response = await requestWithAuth(
        `/payments/me/transactions/${encodeURIComponent(paymentId)}/receipt`
      );
      const payload = (await response.json()) as ReceiptResponse;
      downloadTextFile(payload.fileName || `${paymentId}-receipt.txt`, payload.content || '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Receipt download failed.';
      window.alert(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const resetAddCardState = () => {
    setCardNickname('');
    setSetAsDefaultMethod(false);
    setDetectedCardBrand('unknown');
    setStripeClientSecret('');
    setStripePublishableKey('');
    setAddMethodError(null);
  };

  const openAddCardPanel = async () => {
    if (activeActionId) {
      return;
    }

    setAddMethodSuccess(null);
    setAddMethodError(null);
    resetAddCardState();
    setIsAddCardOpen(true);
    setIsPreparingStripeForm(true);

    try {
      const response = await requestWithAuth('/payments/me/methods/setup-intent', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as SetupIntentResponse;
      if (!payload.clientSecret || !payload.publishableKey) {
        throw new Error('Could not initialize secure card form. Please try again.');
      }

      setStripeClientSecret(payload.clientSecret);
      setStripePublishableKey(payload.publishableKey);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to initialize secure card setup right now.';
      setAddMethodError(message);
    } finally {
      setIsPreparingStripeForm(false);
    }
  };

  const closeAddCardPanel = () => {
    if (activeActionId === 'add-method') {
      return;
    }

    setIsAddCardOpen(false);
    setIsPreparingStripeForm(false);
    setStripeClientSecret('');
    setStripePublishableKey('');
    setDetectedCardBrand('unknown');
    setAddMethodError(null);
  };

  const handleConfirmStripeMethod = async (setupIntentId: string, brand: CardBrand) => {
    if (activeActionId) {
      return;
    }

    setAddMethodError(null);
    setAddMethodSuccess(null);
    setActiveActionId('add-method');

    const normalizedBrand = brand === 'unknown' ? 'card' : brand;
    const defaultCardLabel = buildDefaultCardLabel(normalizedBrand);
    const generatedLabel = cardNickname.trim() || defaultCardLabel;

    try {
      const response = await requestWithAuth('/payments/me/methods/stripe/confirm', {
        method: 'POST',
        body: JSON.stringify({
          setupIntentId,
          label: generatedLabel,
          isDefault: setAsDefaultMethod,
        }),
      });
      const payload = (await response.json()) as AddMethodResponse;

      if (Array.isArray(payload.methods)) {
        setMethods(payload.methods);
      } else if (payload.method) {
        setMethods((previous) => [payload.method, ...previous]);
      }
      setAddMethodSuccess(`${defaultCardLabel} added successfully.`);
      setIsAddCardOpen(false);
      setStripeClientSecret('');
      setStripePublishableKey('');
      setDetectedCardBrand('unknown');
      setAddMethodError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add payment method right now.';
      setAddMethodError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setActiveActionId(null);
    }
  };

  useEffect(() => {
    const token = loadPersistedSupabaseAccessToken();
    if (!token) {
      return;
    }

    void refreshDashboard();
  }, []);

  const stripeElementsOptions = useMemo<StripeElementsOptions | null>(() => {
    if (!stripeClientSecret) {
      return null;
    }

    return {
      clientSecret: stripeClientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#3D08BA',
        },
      },
    };
  }, [stripeClientSecret]);

  // ── computed ──
  const filtered = payments.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = p.description.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPaid     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending  = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const totalUpcoming = payments.filter(p => p.status === 'upcoming').reduce((s, p) => s + p.amount, 0);
  const overduePayments = payments.filter((payment) => payment.status === 'overdue');
  const overdueCount  = overduePayments.length;
  const firstOverduePayment = overduePayments[0] || null;

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all',     label: 'All' },
    { id: 'paid',    label: 'Paid' },
    { id: 'pending', label: 'Pending' },
    { id: 'overdue', label: 'Overdue' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-3 py-3.5 sm:py-4">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Payments</h1>
              <p className="text-xs text-gray-500">Manage fees & transactions</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 pb-24 md:pb-8 space-y-4 sm:space-y-5">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {[
            { label: 'Total Paid',    value: totalPaid,     sub: `${payments.filter(p => p.status === 'paid').length} transactions`,   color: 'border-emerald-500',  icon: CheckCircleSolid, iconBg: 'bg-emerald-100',  iconColor: 'text-emerald-600' },
            { label: 'Pending',       value: totalPending,  sub: `${payments.filter(p => p.status === 'pending').length + overdueCount} outstanding`,                    color: 'border-[#3D08BA]',    icon: ClockIcon,         iconBg: 'bg-[#3D08BA]/10',    iconColor: 'text-[#3D08BA]' },
            { label: 'Overdue',       value: payments.filter(p => p.status === 'overdue').reduce((s,p) => s + p.amount, 0), sub: `${overdueCount} item${overdueCount !== 1 ? 's' : ''}`, color: 'border-red-500', icon: ExclamationCircleIcon, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
            { label: 'Upcoming',      value: totalUpcoming, sub: `${payments.filter(p => p.status === 'upcoming').length} scheduled`,                                    color: 'border-amber-500',    icon: DocumentTextIcon,  iconBg: 'bg-amber-100',       iconColor: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-xl border border-gray-100 border-t-2 ${s.color} shadow-sm p-3 sm:p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">{s.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
              </div>
              <p className="text-base sm:text-lg font-bold text-gray-900 truncate">{fmt(s.value)}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Overdue banner ── */}
        {overdueCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 sm:p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-red-800">You have an overdue payment</p>
              <p className="text-xs text-red-600 mt-0.5">
                {firstOverduePayment
                  ? `${firstOverduePayment.description} - ${fmt(firstOverduePayment.amount)} was due ${firstOverduePayment.date}. Please settle this to avoid any holds on your account.`
                  : 'Please settle overdue items to avoid any holds on your account.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (firstOverduePayment) {
                  void handlePayNow(firstOverduePayment.id);
                }
              }}
              disabled={!firstOverduePayment || Boolean(activeActionId)}
              className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeActionId && firstOverduePayment && activeActionId === `pay-${firstOverduePayment.id}`
                ? 'Processing...'
                : 'Pay Now'}
            </button>
          </div>
        )}

        {/* ── Payment methods row ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Payment Methods</h2>
            <button
              onClick={() => {
                if (isAddCardOpen) {
                  closeAddCardPanel();
                  return;
                }

                void openAddCardPanel();
              }}
              disabled={Boolean(activeActionId) || isLoading}
              className="flex items-center gap-1 text-xs text-[#3D08BA] font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircleIcon className="w-4 h-4" /> {isAddCardOpen ? 'Close' : 'Add'}
            </button>
          </div>
          {addMethodSuccess && (
            <p className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {addMethodSuccess}
            </p>
          )}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
            {methods.map(m => (
              <div
                key={m.id}
                className={`shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  m.isDefault ? 'border-[#3D08BA] bg-[#3D08BA]/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.isDefault ? 'bg-[#3D08BA]' : 'bg-gray-100'}`}>
                  {m.type === 'card'
                    ? <CreditCardIcon className={`w-4 h-4 ${m.isDefault ? 'text-white' : 'text-gray-600'}`} />
                    : <BanknotesIcon  className={`w-4 h-4 ${m.isDefault ? 'text-white' : 'text-gray-600'}`} />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{m.label}</p>
                  <p className="text-[10px] text-gray-400">••••{m.last4}{m.isDefault ? ' · Default' : ''}</p>
                </div>
              </div>
            ))}
          </div>
          {isAddCardOpen && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Add a card</p>
                  <p className="text-xs text-gray-500">
                    Your card details are verified by Stripe and never stored directly in Edamaa.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="payment-card-nickname" className="block text-xs font-semibold text-gray-700 mb-1">
                      Card name (optional)
                    </label>
                    <input
                      id="payment-card-nickname"
                      type="text"
                      value={cardNickname}
                      onChange={(event) => setCardNickname(event.target.value)}
                      placeholder="My tuition card"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={setAsDefaultMethod}
                        onChange={(event) => setSetAsDefaultMethod(event.target.checked)}
                        className="rounded border-gray-300 text-[#3D08BA] focus:ring-[#3D08BA]"
                      />
                      Use this as my default payment method
                    </label>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Detected card type: <span className="font-semibold text-gray-700">{CARD_BRAND_LABEL[detectedCardBrand]}</span>
                </p>

                {addMethodError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {addMethodError}
                  </p>
                )}

                {isPreparingStripeForm && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-xs text-gray-500">
                    Preparing secure card form...
                  </div>
                )}

                {!isPreparingStripeForm && stripePromise && stripeElementsOptions && (
                  <Elements stripe={stripePromise} options={stripeElementsOptions}>
                    <StripeCardSetupForm
                      clientSecret={stripeClientSecret}
                      disabled={Boolean(activeActionId)}
                      onBrandChange={(brand) => setDetectedCardBrand(brand)}
                      onErrorChange={(message) => setAddMethodError(message)}
                      onConfirmed={handleConfirmStripeMethod}
                    />
                  </Elements>
                )}

                {!isPreparingStripeForm && (!stripePromise || !stripeElementsOptions) && !addMethodError && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Secure card setup is unavailable right now. Check your Stripe backend configuration.
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => closeAddCardPanel()}
                    disabled={Boolean(activeActionId)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Search + Filters ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4">
          {/* search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={isLoading ? "Syncing transactions..." : "Search transactions..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] focus:border-transparent bg-gray-50"
            />
          </div>
          {/* filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.id ? 'bg-[#3D08BA] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Transaction list ── */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-sm text-gray-500">No transactions found</p>
            </div>
          )}
          {filtered.map(p => {
            const st = statusStyle(p.status);
            const open = expandedId === p.id;
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* main row – always visible */}
                <button
                  onClick={() => setExpandedId(open ? null : p.id)}
                  className="w-full text-left px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  {/* status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{p.description}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${categoryColor(p.category)} uppercase tracking-wider`}>
                        {p.category}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" /> {p.date}
                    </p>
                  </div>

                  {/* amount + status */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-sm sm:text-base font-bold text-gray-900">{fmt(p.amount)}</span>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text} uppercase tracking-wider`}>
                      {p.status}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* expanded detail */}
                {open && (
                  <div className="border-t border-gray-100 bg-gray-50 px-3 sm:px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-600">
                        <div><span className="text-gray-400">ID:</span> {p.id}</div>
                        <div><span className="text-gray-400">Date:</span> {p.date}</div>
                        {p.receipt && <div><span className="text-gray-400">Receipt:</span> {p.receipt}</div>}
                        <div><span className="text-gray-400">Category:</span> {p.category.charAt(0).toUpperCase() + p.category.slice(1)}</div>
                      </div>
                      <div className="flex gap-2">
                        {p.receipt && (
                          <button
                            onClick={() => void handleDownloadReceipt(p.id)}
                            disabled={Boolean(activeActionId)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5" /> Receipt
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'overdue') && (
                          <button
                            onClick={() => void handlePayNow(p.id)}
                            disabled={Boolean(activeActionId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${p.status === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3D08BA] hover:bg-[#2c0691]'}`}
                          >
                            {activeActionId === `pay-${p.id}` ? 'Processing...' : 'Pay Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Payments;
