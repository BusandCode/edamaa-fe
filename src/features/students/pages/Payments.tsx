import { useState } from 'react';
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

type FilterId = 'all' | 'paid' | 'pending' | 'overdue';

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

// ─── Page ───────────────────────────────────────────────────────────────────

const Payments = () => {
  const navigate = useNavigate();
  const [filter, setFilter]       = useState<FilterId>('all');
  const [search, setSearch]       = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── mock data ──
  const payments: Payment[] = [
    { id: 'P001', description: 'First Semester Tuition',       amount: 450000, date: 'Sep 15, 2024', status: 'paid',      category: 'tuition',       receipt: 'RCP-20240915-001' },
    { id: 'P002', description: 'Accommodation Fee (Session 1)', amount: 180000, date: 'Sep 18, 2024', status: 'paid',      category: 'accommodation', receipt: 'RCP-20240918-002' },
    { id: 'P003', description: 'Student Union Dues',           amount: 15000,  date: 'Oct 02, 2024', status: 'paid',      category: 'fees',          receipt: 'RCP-20241002-003' },
    { id: 'P004', description: 'Lab Materials – Chemistry',    amount: 32000,  date: 'Oct 20, 2024', status: 'paid',      category: 'materials',     receipt: 'RCP-20241020-004' },
    { id: 'P005', description: 'Library Access Fee',           amount: 8000,   date: 'Nov 05, 2024', status: 'paid',      category: 'fees',          receipt: 'RCP-20241105-005' },
    { id: 'P006', description: 'Second Semester Tuition',      amount: 450000, date: 'Jan 10, 2025', status: 'pending',   category: 'tuition' },
    { id: 'P007', description: 'Accommodation Fee (Session 2)', amount: 180000, date: 'Jan 15, 2025', status: 'overdue',   category: 'accommodation' },
    { id: 'P008', description: 'Examination Registration',     amount: 25000,  date: 'Feb 01, 2025', status: 'upcoming', category: 'fees' },
    { id: 'P009', description: 'Lab Materials – Physics',      amount: 28000,  date: 'Feb 14, 2025', status: 'upcoming', category: 'materials' },
  ];

  const methods: PaymentMethod[] = [
    { id: 'M1', type: 'card',  label: 'Visa ending',  last4: '4291', isDefault: true },
    { id: 'M2', type: 'bank',  label: 'GTBank A/c',   last4: '7823', isDefault: false },
    { id: 'M3', type: 'card',  label: 'Mastercard',   last4: '0047', isDefault: false },
  ];

  // ── computed ──
  const filtered = payments.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = p.description.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPaid     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending  = payments.filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const totalUpcoming = payments.filter(p => p.status === 'upcoming').reduce((s, p) => s + p.amount, 0);
  const overdueCount  = payments.filter(p => p.status === 'overdue').length;

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
              <p className="text-xs text-red-600 mt-0.5">Accommodation Fee (Session 2) – ₦180,000 was due Jan 15. Please settle this to avoid any holds on your account.</p>
            </div>
            <button className="shrink-0 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
              Pay Now
            </button>
          </div>
        )}

        {/* ── Payment methods row ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Payment Methods</h2>
            <button className="flex items-center gap-1 text-xs text-[#3D08BA] font-semibold hover:underline">
              <PlusCircleIcon className="w-4 h-4" /> Add
            </button>
          </div>
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
        </div>

        {/* ── Search + Filters ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4">
          {/* search */}
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
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
                          <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                            <DocumentTextIcon className="w-3.5 h-3.5" /> Receipt
                          </button>
                        )}
                        {(p.status === 'pending' || p.status === 'overdue') && (
                          <button className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${p.status === 'overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#3D08BA] hover:bg-[#2c0691]'}`}>
                            Pay Now
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