import { useState } from 'react';
import {
  AcademicCapIcon,
  ClockIcon,
  FireIcon,
  TrophyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
  LightBulbIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityEntry {
  date: string;
  label: string;
  score?: number;
  type: 'quiz' | 'assignment' | 'study' | 'streak';
}

export interface SubjectBreakdown {
  subject: string;
  score: number;
  color: string;
}

export interface PerformanceStat {
  id: string;
  label: string;
  value: string | number;
  subLabel: string;
  trend: number;
  trendLabel: string;
  icon: React.ElementType;
  accent: string;
  iconColor: string;
  detailHeading: string;
  detailBody: string;
  insight: string;
  activities?: ActivityEntry[];
  breakdown?: SubjectBreakdown[];
  weeklyData?: number[];
}

export interface PerformancestatsProps {
  stats?: PerformanceStat[];
  onStatClick?: (stat: PerformanceStat) => void;
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────

const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const pts = data.map(
    (v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
  );
  const area = [
    `M${pts[0]}`,
    ...pts.slice(1).map((p) => `L${p}`),
    `L${w},${h} L0,${h} Z`,
  ].join(' ');
  const line = [`M${pts[0]}`, ...pts.slice(1).map((p) => `L${p}`)].join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_STATS: PerformanceStat[] = [
  {
    id: 'avg-score',
    label: 'Avg. Score',
    value: '84%',
    subLabel: 'Across all subjects',
    trend: 6,
    trendLabel: 'vs last month',
    icon: StarIcon,
    accent: 'bg-amber-50',
    iconColor: 'text-amber-500',
    detailHeading: 'Score Breakdown by Subject',
    detailBody:
      'Your average has climbed to 84%, driven by strong results in Math and Science. Keep focusing on Literature to close the gap.',
    insight: '🎯 You score 12% higher on morning quizzes than evening ones.',
    breakdown: [
      { subject: 'Mathematics', score: 91, color: '#3D08BA' },
      { subject: 'Science', score: 88, color: '#F68C29' },
      { subject: 'History', score: 82, color: '#10b981' },
      { subject: 'Literature', score: 74, color: '#6366f1' },
      { subject: 'Art', score: 85, color: '#ec4899' },
    ],
    weeklyData: [76, 79, 81, 80, 83, 84, 84],
    activities: [
      { date: 'Feb 16', label: 'Math Quiz', score: 95, type: 'quiz' },
      { date: 'Feb 14', label: 'Science Test', score: 88, type: 'quiz' },
      { date: 'Feb 12', label: 'Literature Essay', score: 74, type: 'assignment' },
    ],
  },
  {
    id: 'study-hours',
    label: 'Study Hours',
    value: '42h',
    subLabel: 'This month',
    trend: 12,
    trendLabel: 'vs last month',
    icon: ClockIcon,
    accent: 'bg-blue-50',
    iconColor: 'text-blue-500',
    detailHeading: 'Weekly Study Distribution',
    detailBody:
      'You studied 42 hours this month — averaging 10.5 hours per week. Tuesday and Thursday are your most productive days.',
    insight: '💡 Students who study 10+ hrs/week score 18% higher on average.',
    weeklyData: [8, 11, 9, 14, 0, 6, 10],
    activities: [
      { date: 'Feb 17', label: 'Science revision', type: 'study' },
      { date: 'Feb 15', label: 'Math problem sets', type: 'study' },
      { date: 'Feb 13', label: 'History reading', type: 'study' },
    ],
  },
  {
    id: 'streak',
    label: 'Day Streak',
    value: 14,
    subLabel: 'Keep it up!',
    trend: 0,
    trendLabel: 'Personal best: 21',
    icon: FireIcon,
    accent: 'bg-orange-50',
    iconColor: 'text-orange-500',
    detailHeading: 'Streak Calendar',
    detailBody:
      "You've logged in and completed at least one task every day for 14 consecutive days. You're 7 days away from your personal best!",
    insight: '🔥 Top 5% of students maintain streaks over 10 days.',
    weeklyData: [1, 1, 1, 1, 1, 1, 1],
    activities: [
      { date: 'Feb 17', label: 'Day 14 completed', type: 'streak' },
      { date: 'Feb 10', label: 'Reached 7-day streak', type: 'streak' },
      { date: 'Feb 4', label: 'Started current streak', type: 'streak' },
    ],
  },
  {
    id: 'assignments',
    label: 'Assignments',
    value: '9/11',
    subLabel: 'Submitted on time',
    trend: -1,
    trendLabel: '2 pending',
    icon: AcademicCapIcon,
    accent: 'bg-purple-50',
    iconColor: 'text-purple-600',
    detailHeading: 'Assignment Status',
    detailBody:
      'You have 2 pending assignments due this week. History essay (due Feb 20) and Science lab report (due Feb 22). Stay on track!',
    insight: '📝 On-time submissions correlate with 15% higher final grades.',
    activities: [
      { date: 'Due Feb 20', label: 'History Essay', type: 'assignment' },
      { date: 'Due Feb 22', label: 'Science Lab Report', type: 'assignment' },
      { date: 'Submitted Feb 15', label: 'Math Problem Set', score: 97, type: 'assignment' },
    ],
    weeklyData: [10, 9, 11, 10, 9, 9, 9],
  },
  {
    id: 'rank',
    label: 'Class Rank',
    value: '#3',
    subLabel: 'Out of 48 students',
    trend: 2,
    trendLabel: 'positions gained',
    icon: TrophyIcon,
    accent: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    detailHeading: 'Rank Progression',
    detailBody:
      "You've climbed from #5 to #3 this month. You're only 3 average points away from the #1 spot. A strong push in Literature could get you there.",
    insight: '🏆 At this pace, you could reach #1 by end of semester.',
    weeklyData: [5, 5, 4, 4, 4, 3, 3],
    activities: [
      { date: 'Feb 10', label: 'Moved from #4 → #3', type: 'quiz' },
      { date: 'Feb 3', label: 'Moved from #5 → #4', type: 'quiz' },
      { date: 'Jan 28', label: 'Best rank: #3 achieved', type: 'quiz' },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const TrendBadge = ({ trend, label }: { trend: number; label: string }) => {
  if (trend === 0)
    return <span className="text-[10px] sm:text-xs text-gray-400 leading-tight">{label}</span>;
  const isUp = trend > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold leading-tight ${
        isUp ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {isUp ? <ChevronUpIcon className="w-3 h-3 shrink-0" /> : <ChevronDownIcon className="w-3 h-3 shrink-0" />}
      {Math.abs(trend)}{label.includes('position') ? '' : '%'} {label}
    </span>
  );
};

const ActivityIcon = ({ type }: { type: ActivityEntry['type'] }) => {
  const map = {
    quiz: { icon: BookOpenIcon, cls: 'text-blue-500 bg-blue-50' },
    assignment: { icon: AcademicCapIcon, cls: 'text-purple-500 bg-purple-50' },
    study: { icon: ClockIcon, cls: 'text-amber-500 bg-amber-50' },
    streak: { icon: FireIcon, cls: 'text-orange-500 bg-orange-50' },
  };
  const { icon: Icon, cls } = map[type];
  return (
    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
};

const SubjectBar = ({ subject, score, color }: SubjectBreakdown) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-xs text-gray-600 font-medium">{subject}</span>
      <span className="text-xs font-bold" style={{ color }}>{score}%</span>
    </div>
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const MiniCalendar = () => {
  // last 14 days grid
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { day: d.getDate(), active: true };
  });
  return (
    <div className="flex gap-1 flex-wrap">
      {days.map((d, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-colors
            ${d.active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}
        >
          {d.day}
        </div>
      ))}
    </div>
  );
};

// ─── Sparkline colors map ───────────────

const sparkColors: Record<string, string> = {
  'avg-score': '#3D08BA',
  'study-hours': '#3b82f6',
  streak: '#f97316',
  assignments: '#9333ea',
  rank: '#10b981',
};

// ─── Main Component ──────────────────

const Performancestats = ({
  stats = DEFAULT_STATS,
  onStatClick,
}: PerformancestatsProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleClick = (stat: PerformanceStat) => {
    setActiveId(stat.id === activeId ? null : stat.id);
    onStatClick?.(stat);
  };

  const active = stats.find((s) => s.id === activeId);

  return (
    <section aria-label="Performance Statistics" className="font-[system-ui]">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">My Performance</h2>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
            <ArrowTrendingUpIcon className="w-3 h-3" /> On track
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <CalendarDaysIcon className="w-3.5 h-3.5" /> Feb 2025
          </span>
          <span className="text-xs sm:text-sm text-[#3D08BA] font-medium cursor-pointer hover:underline">
            View Details
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeId === stat.id;
          const color = sparkColors[stat.id];

          return (
            <button
              key={stat.id}
              onClick={() => handleClick(stat)}
              aria-pressed={isActive}
              className={`
                group relative text-left w-full
                bg-white rounded-xl sm:rounded-2xl border shadow-sm
                p-3 sm:p-4
                transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D08BA]
                ${
                  isActive
                    ? 'border-[#3D08BA] ring-2 ring-[#3D08BA]/20 shadow-md -translate-y-0.5'
                    : 'border-gray-200 hover:border-[#3D08BA]/30'
                }
              `}
            >
              {/* Icon bubble */}
              <div
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3
                  ${stat.accent}
                  transition-transform duration-200 group-hover:scale-110
                `}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor}`} />
              </div>

              {/* Value */}
              <p className="text-xl sm:text-2xl font-bold text-gray-900 leading-none mb-0.5">
                {stat.value}
              </p>

              {/* Label */}
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">{stat.label}</p>

              {/* Sub-label */}
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight mb-2">
                {stat.subLabel}
              </p>

              {/* Sparkline */}
              {stat.weeklyData && (
                <div className="mb-1.5 -mx-1">
                  <Sparkline data={stat.weeklyData} color={color} />
                </div>
              )}

              {/* Trend */}
              <TrendBadge trend={stat.trend} label={stat.trendLabel} />

              {/* Active indicator bar */}
              <div
                className={`
                  absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl
                  bg-[#3D08BA] transition-all duration-300
                  ${isActive ? 'opacity-100' : 'opacity-0'}
                `}
              />
            </button>
          );
        })}
      </div>

      {/* ── Expanded Detail Panel ─────────────────────────────────── */}
      {active && (
        <div
          className="mt-3 sm:mt-4 bg-white border border-[#3D08BA]/20 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden"
          style={{ animation: 'fadeSlideIn 0.2s ease' }}
        >
          {/* Panel Header */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active.accent}`}>
                <active.icon className={`w-5 h-5 ${active.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{active.detailHeading}</p>
                <p className="text-xs text-gray-500 mt-0.5">{active.subLabel}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-gray-900">{active.value}</p>
              <TrendBadge trend={active.trend} label={active.trendLabel} />
            </div>
          </div>

          {/* Panel Body */}
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Col 1 — Description + Insight */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{active.detailBody}</p>
              </div>

              {/* Insight callout */}
              <div className="flex gap-2 p-3 bg-[#3D08BA]/5 rounded-xl border border-[#3D08BA]/10">
                <LightBulbIcon className="w-4 h-4 text-[#3D08BA] shrink-0 mt-0.5" />
                <p className="text-xs text-[#3D08BA] leading-relaxed">{active.insight}</p>
              </div>

              {/* Score progress bar */}
              {typeof active.value === 'string' && active.value.includes('%') && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Score Progress</p>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-[#3D08BA] to-[#F68C29] transition-all duration-700"
                      style={{ width: active.value }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">0%</span>
                    <span className="text-[10px] text-gray-400">100%</span>
                  </div>
                </div>
              )}

              {/* Streak calendar */}
              {active.id === 'streak' && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Last 14 Days</p>
                  <MiniCalendar />
                </div>
              )}
            </div>

            {/* Col 2 — Subject Breakdown OR Weekly Trend */}
            <div>
              {active.breakdown ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">By Subject</p>
                  {active.breakdown.map((b) => (
                    <SubjectBar key={b.subject} {...b} />
                  ))}
                </div>
              ) : active.weeklyData ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    {active.id === 'rank' ? 'Rank Trend (lower = better)' : '7-Day Trend'}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <Sparkline data={active.weeklyData} color={sparkColors[active.id]} />
                    <div className="flex justify-between mt-1">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <span key={d} className="text-[9px] text-gray-400">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* Assignment pending pills */}
                  {active.id === 'assignments' && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                      <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-100">
                        <ExclamationCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">History Essay</p>
                          <p className="text-[10px] text-red-500">Due Feb 20</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                        <ExclamationCircleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">Science Lab Report</p>
                          <p className="text-[10px] text-amber-500">Due Feb 22</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Col 3 — Recent Activity */}
            {active.activities && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {active.activities.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <ActivityIcon type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{a.label}</p>
                        <p className="text-[10px] text-gray-400">{a.date}</p>
                      </div>
                      {a.score !== undefined && (
                        <span className="text-xs font-bold text-[#3D08BA] shrink-0">{a.score}%</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Next milestone */}
                <div className="mt-3 p-3 rounded-xl bg-linear-to-br from-[#3D08BA]/8 to-[#F68C29]/8 border border-[#3D08BA]/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SparklesIcon className="w-3.5 h-3.5 text-[#3D08BA]" />
                    <p className="text-[10px] font-bold text-[#3D08BA] uppercase tracking-wide">Next Milestone</p>
                  </div>
                  {active.id === 'avg-score' && <p className="text-xs text-gray-700">Reach <strong>90%</strong> average to unlock Scholar badge</p>}
                  {active.id === 'study-hours' && <p className="text-xs text-gray-700">Log <strong>50h</strong> this month for a Dedication badge</p>}
                  {active.id === 'streak' && <p className="text-xs text-gray-700">Reach <strong>21 days</strong> to beat your personal best!</p>}
                  {active.id === 'assignments' && <p className="text-xs text-gray-700">Submit the 2 pending assignments to hit <strong>100%</strong></p>}
                  {active.id === 'rank' && <p className="text-xs text-gray-700">Close the gap to <strong>#1</strong> — only 3 score points away</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

export default Performancestats;