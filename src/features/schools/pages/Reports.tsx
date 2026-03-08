import { useState } from 'react';
import {
  FaChartLine,
  FaChartBar,
  FaDownload,
  FaFilter,
  FaCalendarAlt,
  FaUsers,
  FaIdCard,
  FaArrowUp,
  FaArrowDown,
  FaBook,
  FaVideo,
  FaFileAlt,
  FaCertificate,
  FaGraduationCap,
  FaSearch,
  FaPrint,
} from 'react-icons/fa';

// ── Recharts (available in artifact env) ──────────────────────────────────────
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── mock data ────────────────────────────────────────────────────────────────
interface AttendanceData {
  month: string;
  rate: number;
}

const attendanceData: AttendanceData[] = [
  { month: 'Aug', rate: 78 },
  { month: 'Sep', rate: 82 },
  { month: 'Oct', rate: 80 },
  { month: 'Nov', rate: 88 },
  { month: 'Dec', rate: 75 },
  { month: 'Jan', rate: 85 },
];

interface SubjectPerformance {
  subject: string;
  avg: number;
  pass: number;
}

const subjectPerformance: SubjectPerformance[] = [
  { subject: 'Math', avg: 72, pass: 88 },
  { subject: 'English', avg: 68, pass: 80 },
  { subject: 'Physics', avg: 65, pass: 75 },
  { subject: 'Chemistry', avg: 70, pass: 82 },
  { subject: 'Biology', avg: 74, pass: 90 },
];

interface EnrollmentBreakdown {
  name: string;
  value: number;
}

const enrollmentBreakdown: EnrollmentBreakdown[] = [
  { name: 'SS1', value: 120 },
  { name: 'SS2', value: 145 },
  { name: 'SS3', value: 98 },
  { name: 'JSS1', value: 80 },
  { name: 'JSS2', value: 95 },
  { name: 'JSS3', value: 110 },
];

const COLORS: readonly string[] = ['#3D08BA', '#5010E0', '#7C3AED', '#A855F7', '#C084FC', '#E9D5FF'];

interface TopStudent {
  rank: number;
  name: string;
  class: string;
  avg: number;
  trend: 'up' | 'down';
}

const topStudents: TopStudent[] = [
  { rank: 1, name: 'Adaeze Okonkwo', class: 'SS3A', avg: 94, trend: 'up' },
  { rank: 2, name: 'Emeka Nwosu', class: 'SS2B', avg: 91, trend: 'up' },
  { rank: 3, name: 'Fatima Bello', class: 'SS3B', avg: 89, trend: 'down' },
  { rank: 4, name: 'Chukwudi Eze', class: 'SS1A', avg: 87, trend: 'up' },
  { rank: 5, name: 'Ngozi Adeyemi', class: 'SS2A', avg: 86, trend: 'up' },
];

interface SummaryStat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  up: boolean;
  color: 'blue' | 'purple' | 'green' | 'amber';
}

const summaryStats: SummaryStat[] = [
  { label: 'Total Students', value: '648', icon: FaUsers, change: '+12', up: true, color: 'blue' },
  { label: 'Active Tutors', value: '24', icon: FaIdCard, change: '+2', up: true, color: 'purple' },
  { label: 'Avg. Score', value: '71.4%', icon: FaChartLine, change: '-1.2%', up: false, color: 'green' },
  { label: 'Certifications', value: '38', icon: FaCertificate, change: '+5', up: true, color: 'amber' },
];

interface ColorMapValue {
  bg: string;
  icon: string;
  badge: string;
}

type ColorMapType = Record<'blue' | 'purple' | 'green' | 'amber', ColorMapValue>;

const colorMap: ColorMapType = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
};

// ─── sub-components ───────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  up: boolean;
  color: 'blue' | 'purple' | 'green' | 'amber';
}

const SummaryCard = ({ label, value, icon: Icon, change, up, color }: SummaryCardProps) => {
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center shrink-0`}>
        <Icon className={`${c.icon} text-xl`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
        <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
          {up ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />}
          {change} this month
        </span>
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  title: string;
  action?: () => void;
  actionLabel?: string;
}

const SectionHeader = ({ title, action, actionLabel }: SectionHeaderProps) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-bold text-gray-900">{title}</h3>
    {action && (
      <button onClick={action} className="text-xs text-[#3D08BA] font-medium hover:underline">
        {actionLabel}
      </button>
    )}
  </div>
);

interface TooltipPayload {
  name: string;
  value: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}{typeof p.value === 'number' && p.name.toLowerCase().includes('rate') ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── main page ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod] = useState('This Month');
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = ['overview', 'students', 'tutors', 'finance'];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo placeholder */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3D08BA] to-[#5010E0] flex items-center justify-center">
                <FaGraduationCap className="text-white text-base" />
              </div>
              <span className="text-sm font-extrabold text-gray-900 tracking-tight">Edamaa</span>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-0 max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Search students, tutors, courses..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3D08BA] text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                <FaPrint size={12} /> Print
              </button>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#3D08BA] rounded-lg px-3 py-2 hover:bg-[#2c0691] transition-colors">
                <FaDownload size={12} /> Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Page title + filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">School Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">God&apos;swill School · Academic Performance Summary</p>
          </div>
          <div className="flex items-center gap-2">
            <FaFilter size={12} className="text-gray-400" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
            >
              {['This Month', 'Last Month', 'This Term', 'This Year'].map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <button className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <FaCalendarAlt size={11} /> Jan 2026
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryStats.map(s => (
            <SummaryCard key={s.label} {...s} />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-white text-[#3D08BA] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Overview Tab Content ── */}
        {activeTab === 'overview' && (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Attendance Area Chart */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <SectionHeader title="Student Attendance Rate" actionLabel="Details" />
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={attendanceData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3D08BA" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3D08BA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} domain={[60, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      name="Attendance Rate"
                      stroke="#3D08BA"
                      strokeWidth={2.5}
                      fill="url(#attendGrad)"
                      dot={{ r: 4, fill: '#3D08BA', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Subject Performance Bar */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <SectionHeader title="Subject Performance" actionLabel="Full Report" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectPerformance} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="avg" name="Avg. Score" fill="#3D08BA" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pass" name="Pass Rate %" fill="#A855F7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Enrollment Pie + Top Students */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Enrollment Pie */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <SectionHeader title="Enrollment by Class" />
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={enrollmentBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {enrollmentBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Students']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {enrollmentBreakdown.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-xs text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Students */}
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <SectionHeader title="Top Performing Students" actionLabel="View All" />
                <div className="space-y-3">
                  {topStudents.map(s => (
                    <div
                      key={s.rank}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {/* Rank badge */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold
                          ${s.rank === 1 ? 'bg-amber-100 text-amber-600' :
                            s.rank === 2 ? 'bg-gray-200 text-gray-700' :
                            s.rank === 3 ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-100 text-gray-500'}`}
                      >
                        #{s.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.class}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-gray-900">{s.avg}%</span>
                        {s.trend === 'up' ? (
                          <FaArrowUp size={10} className="text-emerald-500" />
                        ) : (
                          <FaArrowDown size={10} className="text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Progress Bars */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <SectionHeader title="Performance Overview" />
              <div className="space-y-5">
                {[
                  { label: 'Student Attendance', value: 85, color: 'from-blue-500 to-blue-600' },
                  { label: 'Course Completion', value: 72, color: 'from-green-500 to-green-600' },
                  { label: 'Tutor Availability', value: 92, color: 'from-purple-500 to-purple-600' },
                  { label: 'WAEC Pass Rate', value: 78, color: 'from-amber-400 to-amber-500' },
                  { label: 'Resource Utilisation', value: 65, color: 'from-pink-500 to-pink-600' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Library snapshot */}
            <div>
              <SectionHeader title="Resource Library" actionLabel="View All" />
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                  <FaBook className="text-blue-600 text-2xl mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900">Textbooks</p>
                  <p className="text-xs text-gray-600">125 items</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                  <FaVideo className="text-green-600 text-2xl mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900">Video Lessons</p>
                  <p className="text-xs text-gray-600">87 items</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                  <FaFileAlt className="text-purple-600 text-2xl mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-900">Documents</p>
                  <p className="text-xs text-gray-600">256 items</p>
                </div>
              </div>
            </div>

            {/* WAEC Banner */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">WAEC & International Module</h3>
                <button className="text-xs text-[#3D08BA] font-medium hover:underline">See more</button>
              </div>
              <div className="p-4">
                <div className="bg-gradient-to-r from-[#3D08BA] to-[#5010E0] rounded-2xl p-5 text-white relative overflow-hidden">
                  <h4 className="text-base font-bold mb-2">Past Questions &amp; Mock Exams</h4>
                  <p className="text-xs mb-4 max-w-md opacity-90">
                    Access official WAEC past questions, marking schemes and mock examinations to help students prepare effectively.
                  </p>
                  <button className="bg-white text-[#3D08BA] px-5 py-2 rounded-lg font-semibold text-xs hover:bg-gray-100 transition-colors">
                    View Report
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Students Tab ── */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <SectionHeader title="Student Report" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Rank', 'Name', 'Class', 'Avg. Score', 'Attendance', 'Trend'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topStudents.map(s => (
                    <tr key={s.rank} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-xs font-bold text-gray-400">#{s.rank}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3D08BA] to-[#5010E0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900 text-xs">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-600">{s.class}</td>
                      <td className="py-3 pr-4 text-xs font-bold text-gray-900">{s.avg}%</td>
                      <td className="py-3 pr-4">
                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#3D08BA] to-[#5010E0] rounded-full"
                            style={{ width: `${s.avg}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3">
                        {s.trend === 'up'
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5"><FaArrowUp size={9} />Up</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 rounded-full px-2 py-0.5"><FaArrowDown size={9} />Down</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tutors Tab ── */}
        {activeTab === 'tutors' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center py-16">
            <FaUsers className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">Tutor report coming soon</p>
            <p className="text-xs text-gray-400 mt-1">Connect the tutor directory to populate this section.</p>
          </div>
        )}

        {/* ── Finance Tab ── */}
        {activeTab === 'finance' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center py-16">
            <FaChartBar className="text-gray-300 text-5xl mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">Finance module coming soon</p>
            <p className="text-xs text-gray-400 mt-1">Upgrade to Edamaa Pro to unlock the finance dashboard.</p>
            <button className="mt-4 rounded-lg bg-[#3D08BA] px-5 py-2 text-xs font-semibold text-white hover:bg-[#2c0691] transition-colors">
              Upgrade School Plan
            </button>
          </div>
        )}

      </main>

      {/* ── Bottom Nav (matches dashboard pattern) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-4 py-3 z-10">
        {[
          { icon: FaChartLine, label: 'Reports', active: true },
          { icon: FaUsers, label: 'Students' },
          { icon: FaIdCard, label: 'Tutors' },
          { icon: FaCertificate, label: 'WAEC' },
          { icon: FaCalendarAlt, label: 'Schedule' },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              active ? 'text-[#3D08BA]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}