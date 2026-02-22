import { useState, useEffect, useRef, type JSX } from 'react';

// ─── Types & Interfaces ───────────────────────────────────────────────────────

/** Icon name keys matching the icons map */
export type IconName =
  | 'Star' | 'Clock' | 'Fire' | 'Cap' | 'Trophy'
  | 'Target' | 'TrendUp' | 'ChevUp' | 'ChevDown'
  | 'Book' | 'Calendar' | 'Bulb' | 'Sparkles'
  | 'Exclamation' | 'Brain' | 'Medal' | 'X';

/** A single icon renderer function */
export type IconRenderer = (className: string) => JSX.Element;

/** Map of all available icon renderers */
export type IconMap = Record<IconName, IconRenderer>;

/** Activity type discriminator */
export type ActivityType = 'quiz' | 'assignment' | 'study' | 'streak';

/** Urgency level for upcoming deadlines */
export type UrgencyLevel = 'high' | 'medium' | 'low';

/** Panel tab options */
export type PanelTab = 'overview' | 'activity' | 'leaderboard';

// ─── Sub-entity Interfaces ────────────────────────────────────────────────────

export interface SubjectBreakdown {
  subject: string;
  score: number;
  color: string;
}

export interface ActivityEntry {
  date: string;
  label: string;
  score?: number;
  type: ActivityType;
}

export interface Milestone {
  text: string;
  progress: number;
  target: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
}

export interface UpcomingDeadline {
  subject: string;
  type: string;
  due: string;
  color: string;
  urgency: UrgencyLevel;
}

export interface Badge {
  icon: string;
  label: string;
  unlocked: boolean;
  desc: string;
  progress?: number;
  target?: number;
}

export interface StudyGoal {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export interface ActivityIconConfig {
  icon: IconName;
  cls: string;
}

// ─── Core Stat Interface ──────────────────────────────────────────────────────

export interface PerformanceStat {
  /** Unique identifier used to key the stat and match detail views */
  id: string;
  /** Short display label shown on the card */
  label: string;
  /** Formatted display value e.g. "84%", "42h", "#3" */
  value: string;
  /** Raw numeric value for progress calculations */
  numericValue: number;
  /** Denominator for circular progress (use 1 for rank, actual max otherwise) */
  maxValue: number;
  /** Secondary label beneath the value */
  subLabel: string;
  /** Trend delta (positive = up, negative = down, 0 = neutral) */
  trend: number;
  /** Human-readable trend label e.g. "vs last month" */
  trendLabel: string;
  /** Key into the IconMap */
  icon: IconName;
  /** Tailwind bg class for the icon bubble */
  accent: string;
  /** Tailwind text class for the icon */
  iconColor: string;
  /** Hex color for the accent / circular progress ring */
  accentHex: string;
  /** Hex color for the sparkline */
  sparkColor: string;
  /** Heading shown in the expanded detail panel */
  detailHeading: string;
  /** Paragraph body shown in the expanded detail panel */
  detailBody: string;
  /** Insight callout text */
  insight: string;
  /** Optional per-subject score breakdown (shown for avg-score) */
  breakdown?: SubjectBreakdown[];
  /** 7-day series for the sparkline */
  weeklyData?: number[];
  /** Optional day-label overrides for the x-axis */
  dayLabels?: string[];
  /** Recent activity entries */
  activities?: ActivityEntry[];
  /** Next milestone / goal */
  milestone?: Milestone;
}

// ─── Component Prop Interfaces ────────────────────────────────────────────────

export interface SparklineProps {
  data: number[];
  color: string;
  animated?: boolean;
}

export interface AnimatedValueProps {
  value: string;
}

export interface CircularProgressProps {
  value: number;
  max: number;
  color: string;
  size?: number;
}

export interface HeatmapCalendarProps {
  activeCount?: number;
}

export type LeaderboardRowProps = LeaderboardEntry

export interface PerformancestatsProps {
  /** Override the default stat cards */
  stats?: PerformanceStat[];
  /** Optional callback when a stat card is clicked */
  onStatClick?: (stat: PerformanceStat) => void;
}

// ─── Icon Renderers ───────────────────────────────────────────────────────────

const icons: IconMap = {
  Star: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Clock: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  Fire: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 6 8 6 13a6 6 0 0012 0c0-5-6-11-6-11zm0 16a3 3 0 01-3-3c0-2 3-6 3-6s3 4 3 6a3 3 0 01-3 3z" />
    </svg>
  ),
  Cap: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Trophy: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="8,21 12,17 16,21" /><line x1="12" y1="17" x2="12" y2="13" />
      <path d="M7 4H17L15 13H9L7 4z" /><path d="M5 4H7" /><path d="M17 4H19" />
      <path d="M5 4C5 4 3 5 3 8s2 4 4 3" /><path d="M19 4C19 4 21 5 21 8s-2 4-4 3" />
    </svg>
  ),
  Target: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  TrendUp: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" /><polyline points="17,6 23,6 23,12" />
    </svg>
  ),
  ChevUp: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  ),
  ChevDown: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  ),
  Book: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  Calendar: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Bulb: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  ),
  Sparkles: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3z" />
      <path d="M5 3L5.5 5L7.5 5.5L5.5 6L5 8L4.5 6L2.5 5.5L4.5 5L5 3z" />
      <path d="M19 13L19.5 15L21.5 15.5L19.5 16L19 18L18.5 16L16.5 15.5L18.5 15L19 13z" />
    </svg>
  ),
  Exclamation: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Brain: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.5 2A2.5 2.5 0 017 4.5v0A2.5 2.5 0 014.5 7H4a2 2 0 00-2 2v0a2 2 0 002 2h.5A2.5 2.5 0 017 13.5v0A2.5 2.5 0 019.5 16H10a2 2 0 002-2V6a2 2 0 00-2-2h-.5z" />
      <path d="M14.5 2A2.5 2.5 0 0117 4.5v0A2.5 2.5 0 0119.5 7H20a2 2 0 012 2v0a2 2 0 01-2 2h-.5A2.5 2.5 0 0117 13.5v0A2.5 2.5 0 0114.5 16H14a2 2 0 01-2-2V6a2 2 0 012-2h.5z" />
      <path d="M10 16v4" /><path d="M14 16v4" /><path d="M8 20h8" />
    </svg>
  ),
  Medal: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  X: (cls) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SparkPoint {
  x: number;
  y: number;
}

const Sparkline = ({ data, color }: SparklineProps): JSX.Element => {
  const max: number = Math.max(...data);
  const min: number = Math.min(...data);
  const range: number = max - min || 1;
  const w = 120, h = 40;

  const pts: SparkPoint[] = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));

  const linePath: string = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath: string = linePath + ` L${w},${h} L0,${h} Z`;
  const gradId: string = `sg-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        {/* <linearlinear id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearlinear> */}
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === pts.length - 1 ? 3 : 1.5}
          fill={i === pts.length - 1 ? color : 'white'}
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
};

// ─── Animated Counter ─────────────────────────────────────────────────────────

const AnimatedValue = ({ value }: AnimatedValueProps): JSX.Element => {
  const [display, setDisplay] = useState<string>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const numMatch = String(value).match(/[\d.]+/);
    if (!numMatch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(value);
      return;
    }
    const target: number = parseFloat(numMatch[0]);
    const beforeNum: string = String(value).split(numMatch[0])[0] ?? '';
    const afterNum: string = String(value).slice(
      String(value).indexOf(numMatch[0]) + numMatch[0].length
    );
    const duration = 600;
    const startTime: number = performance.now();

    const tick = (now: number): void => {
      const progress: number = Math.min((now - startTime) / duration, 1);
      const eased: number = 1 - Math.pow(1 - progress, 3);
      const current: number = target * eased;
      const formatted: string = Number.isInteger(target)
        ? String(Math.round(current))
        : current.toFixed(1);
      setDisplay(`${beforeNum}${formatted}${afterNum}`);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span>{display}</span>;
};

// ─── Circular Progress Ring ───────────────────────────────────────────────────

const CircularProgress = ({ value, max, color, size = 56 }: CircularProgressProps): JSX.Element => {
  const r: number = (size - 8) / 2;
  const circ: number = 2 * Math.PI * r;
  const pct: number = Math.min(value / max, 1);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

// ─── Heatmap Calendar ─────────────────────────────────────────────────────────

interface CalendarDay {
  day: number;
  intensity: number;
  isActive: boolean;
}

const HeatmapCalendar = ({ activeCount = 14 }: HeatmapCalendarProps): JSX.Element => {
  const days: CalendarDay[] = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const isActive: boolean = i >= 28 - activeCount;
    const intensity: number = isActive
      ? i >= 21 ? 1 : 0.6 + (i - (28 - activeCount)) * 0.03
      : 0;
    return { day: d.getDate(), intensity, isActive };
  });

  const DAY_LETTERS: string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
      {DAY_LETTERS.map((d, i) => (
        <span key={`hdr-${i}`} className="text-center text-[9px] font-bold text-gray-300 pb-0.5">{d}</span>
      ))}
      {days.map((d, i) => (
        <div
          key={`day-${i}`}
          title={d.isActive ? 'Active' : 'Inactive'}
          className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all duration-300"
          style={{
            backgroundColor: d.isActive ? `rgba(249, 115, 22, ${d.intensity})` : '#f5f5f5',
            color: d.intensity > 0.5 ? 'white' : d.isActive ? '#ea580c' : '#d1d5db',
          }}
        >
          {d.day}
        </div>
      ))}
    </div>
  );
};

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

const MEDAL_MAP: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardRow = ({ rank, name, score, isYou = false }: LeaderboardRowProps): JSX.Element => (
  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all
    ${isYou
      ? 'bg-linear-to-r from-[#3D08BA]/10 to-[#F68C29]/10 border border-[#3D08BA]/20'
      : 'bg-gray-50 hover:bg-gray-100'}`}
  >
    <span className="text-sm w-5 text-center">
      {MEDAL_MAP[rank] ?? <span className="text-xs font-bold text-gray-400">#{rank}</span>}
    </span>
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-semibold truncate ${isYou ? 'text-[#3D08BA]' : 'text-gray-700'}`}>
        {name}{isYou && <span className="text-[10px] font-normal opacity-60"> (you)</span>}
      </p>
    </div>
    <span className={`text-xs font-bold ${isYou ? 'text-[#3D08BA]' : 'text-gray-500'}`}>{score}%</span>
    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${score}%`,
          background: isYou ? 'linear-linear(90deg,#3D08BA,#F68C29)' : '#d1d5db',
        }}
      />
    </div>
  </div>
);

// ─── Static Data ──────────────────────────────────────────────────────────────

const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Amara Osei',    score: 96 },
  { rank: 2, name: 'Felix Kimani',  score: 93 },
  { rank: 3, name: 'You',           score: 87, isYou: true },
  { rank: 4, name: 'Priya Nair',    score: 85 },
  { rank: 5, name: 'Lucas Bianchi', score: 83 },
];

const UPCOMING: UpcomingDeadline[] = [
  { subject: 'Mathematics', type: 'Mid-term Exam', due: 'Feb 24', color: '#3D08BA', urgency: 'high' },
  { subject: 'Science',     type: 'Lab Report',    due: 'Feb 22', color: '#F68C29', urgency: 'medium' },
  { subject: 'History',     type: 'Essay',         due: 'Feb 20', color: '#10b981', urgency: 'high' },
  { subject: 'Literature',  type: 'Book Review',   due: 'Mar 3',  color: '#6366f1', urgency: 'low' },
];

const BADGES: Badge[] = [
  { icon: '🏆', label: 'Top Performer',   unlocked: true,  desc: 'Scored 90%+ in 3 subjects' },
  { icon: '🔥', label: '14-Day Streak',   unlocked: true,  desc: 'Consistent daily learning' },
  { icon: '⚡', label: 'Speed Learner',   unlocked: true,  desc: 'Completed 5 modules ahead of schedule' },
  { icon: '📚', label: 'Scholar',         unlocked: false, desc: 'Reach 90% average score',          progress: 84, target: 90 },
  { icon: '💎', label: 'Diamond Student', unlocked: false, desc: 'Maintain #1 rank for a month',     progress: 0,  target: 100 },
  { icon: '🎯', label: '21-Day Legend',   unlocked: false, desc: '21-day study streak',              progress: 14, target: 21 },
];

const STUDY_GOALS: StudyGoal[] = [
  { label: 'Weekly study target',     current: 10, target: 12, unit: 'hrs', color: '#3b82f6' },
  { label: 'Quiz accuracy goal',      current: 84, target: 90, unit: '%',   color: '#3D08BA' },
  { label: 'Assignment completion',   current: 9,  target: 11, unit: '',    color: '#9333ea' },
];

const ACTIVITY_ICON_MAP: Record<ActivityType, ActivityIconConfig> = {
  quiz:       { icon: 'Book',  cls: 'text-blue-500 bg-blue-50' },
  assignment: { icon: 'Cap',   cls: 'text-purple-500 bg-purple-50' },
  study:      { icon: 'Clock', cls: 'text-amber-500 bg-amber-50' },
  streak:     { icon: 'Fire',  cls: 'text-orange-500 bg-orange-50' },
};

const DEFAULT_STATS: PerformanceStat[] = [
  {
    id: 'avg-score',
    label: 'Avg. Score',
    value: '84%',
    numericValue: 84,
    maxValue: 100,
    subLabel: 'Across all subjects',
    trend: 6,
    trendLabel: 'vs last month',
    icon: 'Star',
    accent: 'bg-amber-50',
    iconColor: 'text-amber-500',
    accentHex: '#f59e0b',
    sparkColor: '#3D08BA',
    detailHeading: 'Score Breakdown by Subject',
    detailBody: 'Your average has climbed to 84%, driven by strong results in Math and Science. Keep focusing on Literature to close the gap.',
    insight: '🎯 You score 12% higher on morning quizzes than evening ones.',
    breakdown: [
      { subject: 'Mathematics', score: 91, color: '#3D08BA' },
      { subject: 'Science',     score: 88, color: '#F68C29' },
      { subject: 'History',     score: 82, color: '#10b981' },
      { subject: 'Literature',  score: 74, color: '#6366f1' },
      { subject: 'Art',         score: 85, color: '#ec4899' },
    ],
    weeklyData: [76, 79, 81, 80, 83, 84, 84],
    activities: [
      { date: 'Feb 16', label: 'Math Quiz',        score: 95, type: 'quiz' },
      { date: 'Feb 14', label: 'Science Test',      score: 88, type: 'quiz' },
      { date: 'Feb 12', label: 'Literature Essay',  score: 74, type: 'assignment' },
    ],
    milestone: { text: 'Reach 90% average to unlock Scholar badge', progress: 84, target: 90 },
  },
  {
    id: 'study-hours',
    label: 'Study Hours',
    value: '42h',
    numericValue: 42,
    maxValue: 50,
    subLabel: 'This month',
    trend: 12,
    trendLabel: 'vs last month',
    icon: 'Clock',
    accent: 'bg-blue-50',
    iconColor: 'text-blue-500',
    accentHex: '#3b82f6',
    sparkColor: '#3b82f6',
    detailHeading: 'Weekly Study Distribution',
    detailBody: 'You studied 42 hours this month — averaging 10.5 hours per week. Tuesday and Thursday are your most productive days.',
    insight: '💡 Students who study 10+ hrs/week score 18% higher on average.',
    weeklyData: [8, 11, 9, 14, 0, 6, 10],
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    activities: [
      { date: 'Feb 17', label: 'Science revision – 2.5h', type: 'study' },
      { date: 'Feb 15', label: 'Math problem sets – 3h',  type: 'study' },
      { date: 'Feb 13', label: 'History reading – 1.5h',  type: 'study' },
    ],
    milestone: { text: 'Log 50h this month for Dedication badge', progress: 42, target: 50 },
  },
  {
    id: 'streak',
    label: 'Day Streak',
    value: '14',
    numericValue: 14,
    maxValue: 21,
    subLabel: 'Keep it up!',
    trend: 0,
    trendLabel: 'Personal best: 21',
    icon: 'Fire',
    accent: 'bg-orange-50',
    iconColor: 'text-orange-500',
    accentHex: '#f97316',
    sparkColor: '#f97316',
    detailHeading: 'Streak Calendar',
    detailBody: "You've logged in and completed at least one task every day for 14 consecutive days. You're 7 days away from your personal best!",
    insight: '🔥 Top 5% of students maintain streaks over 10 days.',
    weeklyData: [1, 1, 1, 1, 1, 1, 1],
    activities: [
      { date: 'Feb 17', label: 'Day 14 completed',      type: 'streak' },
      { date: 'Feb 10', label: 'Reached 7-day streak',  type: 'streak' },
      { date: 'Feb 4',  label: 'Started current streak', type: 'streak' },
    ],
    milestone: { text: 'Reach 21 days to beat your personal best!', progress: 14, target: 21 },
  },
  {
    id: 'assignments',
    label: 'Assignments',
    value: '9/11',
    numericValue: 9,
    maxValue: 11,
    subLabel: 'Submitted on time',
    trend: -1,
    trendLabel: '2 pending',
    icon: 'Cap',
    accent: 'bg-purple-50',
    iconColor: 'text-purple-600',
    accentHex: '#9333ea',
    sparkColor: '#9333ea',
    detailHeading: 'Assignment Status',
    detailBody: 'You have 2 pending assignments due this week. History essay (due Feb 20) and Science lab report (due Feb 22). Stay on track!',
    insight: '📝 On-time submissions correlate with 15% higher final grades.',
    activities: [
      { date: 'Due Feb 20',      label: 'History Essay',     type: 'assignment' },
      { date: 'Due Feb 22',      label: 'Science Lab Report', type: 'assignment' },
      { date: 'Submitted Feb 15', label: 'Math Problem Set', score: 97, type: 'assignment' },
    ],
    weeklyData: [10, 9, 11, 10, 9, 9, 9],
    milestone: { text: 'Submit 2 pending assignments to hit 100%', progress: 9, target: 11 },
  },
  {
    id: 'rank',
    label: 'Class Rank',
    value: '#3',
    numericValue: 3,
    maxValue: 1,
    subLabel: 'Out of 48 students',
    trend: 2,
    trendLabel: 'positions gained',
    icon: 'Trophy',
    accent: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    accentHex: '#10b981',
    sparkColor: '#10b981',
    detailHeading: 'Rank Progression',
    detailBody: "You've climbed from #5 to #3 this month. You're only 3 average points away from the #1 spot. A strong push in Literature could get you there.",
    insight: '🏆 At this pace, you could reach #1 by end of semester.',
    weeklyData: [5, 5, 4, 4, 4, 3, 3],
    activities: [
      { date: 'Feb 10', label: 'Moved from #4 → #3',     type: 'quiz' },
      { date: 'Feb 3',  label: 'Moved from #5 → #4',     type: 'quiz' },
      { date: 'Jan 28', label: 'Best rank: #3 achieved',  type: 'quiz' },
    ],
    milestone: { text: 'Close the gap to #1 — only 3 score points away', progress: 84, target: 87 },
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const Performancestats = ({
  stats = DEFAULT_STATS,
  onStatClick,
}: PerformancestatsProps): JSX.Element => {
  const [activeId, setActiveId] = useState<string | null>('avg-score');
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');
  const [mounted, setMounted] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (stat: PerformanceStat): void => {
    const next: string | null = stat.id === activeId ? null : stat.id;
    setActiveId(next);
    setActiveTab('overview');
    onStatClick?.(stat);
    if (next) {
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  };

  const active: PerformanceStat | undefined = stats.find((s) => s.id === activeId);

  const TABS: PanelTab[] = ['overview', 'activity', 'leaderboard'];
  const DAY_INITIALS: string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div>
      <style>{`
        .perf-card { transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1); }
        .perf-card:hover { transform: translateY(-3px) scale(1.01); }
        .perf-card.active { transform: translateY(-3px) scale(1.01); }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%,100% { transform: scale(1); opacity:1; }
          50%      { transform: scale(1.5); opacity:0.7; }
        }
        .panel-enter { animation: slideDown 0.25s ease; }
        .live-dot    { animation: pulse-dot 2s infinite; }
        .progress-bar { transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }
        .badge-locked { filter: grayscale(1); opacity: 0.45; }
        .badge-card:hover { transform: translateY(-2px); }
        .badge-card { transition: transform 0.2s ease; }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            {icons.Brain('w-4 h-4 text-[#3D08BA]')}
            <h2
              className="text-gray-900"
              style={{ fontSize: '1.1rem', fontWeight: 800 }}
            >
              My Performance
            </h2>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              On track
            </span>
          </div>
          <p className="text-xs text-gray-400 pl-6">February 2025</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs bg-[#3D08BA] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#3D08BA]/90 transition-colors">
          {icons.TrendUp('w-3.5 h-3.5')}
          Full Report
        </button>
      </div>

      {/* ── Semester Progress Bar ──────────────────────────────────────── */}
      <div className="mb-4 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Semester Progress</span>
          <span className="text-xs font-bold text-[#3D08BA]">Week 7 of 16</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full progress-bar"
            style={{
              width: mounted ? '44%' : '0%',
              background: 'linear-linear(90deg, #3D08BA, #F68C29)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">Started Jan 6</span>
          <span className="text-[10px] text-[#F68C29] font-semibold">Mid-terms in 5 days</span>
          <span className="text-[10px] text-gray-400">Ends May 30</span>
        </div>
      </div>

      {/* ── Stat Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        {stats.map((stat: PerformanceStat) => {
          const isActive: boolean = activeId === stat.id;

          return (
            <button
              key={stat.id}
              onClick={() => handleClick(stat)}
              aria-pressed={isActive}
              className={`perf-card group relative text-left w-full bg-white rounded-2xl border p-3.5 shadow-sm
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D08BA]
                ${isActive
                  ? 'active border-[#3D08BA] ring-2 ring-[#3D08BA]/15 shadow-lg'
                  : 'border-gray-200 hover:border-[#3D08BA]/30 hover:shadow-md'}`}
            >
              {/* Icon + ring */}
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.accent} transition-transform duration-200 group-hover:scale-110`}>
                  {icons[stat.icon](`w-4 h-4 ${stat.iconColor}`)}
                </div>
                <CircularProgress
                  value={stat.numericValue}
                  max={stat.maxValue === 1 ? stat.numericValue : stat.maxValue}
                  color={stat.accentHex}
                  size={34}
                />
              </div>

              {/* Value */}
              <p className="text-2xl font-bold text-gray-900 leading-none mb-0.5">
                {mounted ? <AnimatedValue value={stat.value} /> : stat.value}
              </p>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">{stat.label}</p>
              <p className="text-[10px] text-gray-400 leading-tight mb-2">{stat.subLabel}</p>

              {/* Sparkline */}
              {stat.weeklyData && (
                <div className="-mx-1 mb-2">
                  <Sparkline data={stat.weeklyData} color={stat.sparkColor} />
                </div>
              )}

              {/* Trend badge */}
              {stat.trend !== 0 ? (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold
                  ${stat.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {stat.trend > 0 ? icons.ChevUp('w-3 h-3') : icons.ChevDown('w-3 h-3')}
                  {Math.abs(stat.trend)}{stat.trendLabel.includes('pos') ? '' : '%'} {stat.trendLabel}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400">{stat.trendLabel}</span>
              )}

              {/* Active indicator bar */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-[#3D08BA] transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Expanded Detail Panel ──────────────────────────────────────── */}
      {active && (
        <div ref={panelRef} className="panel-enter bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden">

          {/* Panel Header */}
          <div className="px-5 pt-5 pb-0 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${active.accent}`}>
                  {icons[active.icon](`w-5 h-5 ${active.iconColor}`)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{active.detailHeading}</p>
                  <p className="text-xs text-gray-400">{active.subLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {active.value}
                  </p>
                  {active.trend !== 0 ? (
                    <span className={`text-xs font-bold ${active.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {active.trend > 0 ? '↑' : '↓'} {Math.abs(active.trend)}{active.trendLabel.includes('pos') ? '' : '%'} {active.trendLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{active.trendLabel}</span>
                  )}
                </div>
                <button
                  onClick={() => setActiveId(null)}
                  aria-label="Close panel"
                  className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  {icons.X('w-3.5 h-3.5 text-gray-500')}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 -mb-px">
              {TABS.map((tab: PanelTab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors
                    ${activeTab === tab
                      ? 'text-[#3D08BA] border-[#3D08BA]'
                      : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Panel Body */}
          <div className="p-5">

            {/* ── TAB: Overview ──────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Col 1 – Summary + Insight + Milestone */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{active.detailBody}</p>
                  </div>

                  <div className="flex gap-2 p-3 rounded-xl border border-[#3D08BA]/15 bg-linear-to-br from-[#3D08BA]/5 to-[#F68C29]/5">
                    {icons.Bulb('w-4 h-4 text-[#3D08BA] shrink-0 mt-0.5')}
                    <p className="text-xs text-[#3D08BA] leading-relaxed">{active.insight}</p>
                  </div>

                  {active.milestone && (
                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        {icons.Target('w-3.5 h-3.5 text-gray-400')}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next Goal</p>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">{active.milestone.text}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full progress-bar"
                            style={{
                              width: mounted ? `${(active.milestone.progress / active.milestone.target) * 100}%` : '0%',
                              background: `linear-linear(90deg, ${active.accentHex}, #F68C29)`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0">
                          {active.milestone.progress}/{active.milestone.target}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Avg-score–specific circular summary */}
                  {active.id === 'avg-score' && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Score</p>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <CircularProgress value={84} max={100} color="#3D08BA" size={64} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#3D08BA]">84%</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            <span className="text-[10px] text-gray-600">Strongest: Math 91%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                            <span className="text-[10px] text-gray-600">Needs work: Literature 74%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Col 2 – Chart or Breakdown */}
                <div>
                  {active.breakdown ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">By Subject</p>
                      <div className="space-y-3">
                        {active.breakdown.map((b: SubjectBreakdown) => (
                          <div key={b.subject}>
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-gray-600 font-medium">{b.subject}</span>
                              <span className="text-xs font-bold" style={{ color: b.color }}>{b.score}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full progress-bar"
                                style={{ width: mounted ? `${b.score}%` : '0%', backgroundColor: b.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : active.id === 'streak' ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Last 28 Days</p>
                      <HeatmapCalendar activeCount={14} />
                      <div className="flex items-center gap-2 mt-3">
                        {([
                          { bg: 'bg-orange-100', label: 'Inactive' },
                          { bg: 'bg-orange-500', label: 'Active' },
                        ] as { bg: string; label: string }[]).map(({ bg, label }) => (
                          <div key={label} className="flex gap-1 items-center">
                            <span className={`w-3 h-3 rounded-sm ${bg} inline-block`} />
                            <span className="text-[10px] text-gray-400">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                        {active.id === 'rank' ? 'Rank Trend' : '7-Day Trend'}
                      </p>
                      {active.weeklyData && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <Sparkline data={active.weeklyData} color={active.sparkColor} />
                          <div className="flex justify-between mt-1">
                            {DAY_INITIALS.map((d, i) => (
                              <span key={i} className="text-[9px] text-gray-400">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Study-hours bar chart */}
                      {active.id === 'study-hours' && active.weeklyData && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Daily Breakdown</p>
                          <div className="flex items-end gap-1 h-16">
                            {active.weeklyData.map((v: number, i: number) => {
                              const maxHours: number = Math.max(...(active.weeklyData as number[]));
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                  <span className="text-[8px] text-gray-400">{v > 0 ? `${v}h` : ''}</span>
                                  <div
                                    className="w-full rounded-sm transition-all duration-700"
                                    style={{
                                      height: v > 0 ? `${(v / maxHours) * 48}px` : '4px',
                                      backgroundColor: v === maxHours ? '#3D08BA' : v === 0 ? '#f0f0f0' : '#a5b4fc',
                                    }}
                                  />
                                  <span className="text-[8px] text-gray-400">{DAY_INITIALS[i]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Pending assignments */}
                      {active.id === 'assignments' && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending</p>
                          {UPCOMING.filter((u: UpcomingDeadline) => u.urgency !== 'low').slice(0, 2).map((u, i) => (
                            <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border
                              ${u.urgency === 'high' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                              {icons.Exclamation(`w-4 h-4 shrink-0 ${u.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}`)}
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-800">{u.subject} – {u.type}</p>
                                <p className={`text-[10px] ${u.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}`}>Due {u.due}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Col 3 – Upcoming Deadlines + Mini Badges */}
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Upcoming Deadlines</p>
                    <div className="space-y-2">
                      {UPCOMING.map((item: UpcomingDeadline, i: number) => (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{item.subject}</p>
                            <p className="text-[10px] text-gray-400">{item.type}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md
                            ${item.urgency === 'high'   ? 'bg-red-50 text-red-600'
                            : item.urgency === 'medium' ? 'bg-amber-50 text-amber-600'
                            : 'bg-gray-100 text-gray-500'}`}>
                            {item.due}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your Badges</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BADGES.slice(0, 6).map((b: Badge, i: number) => (
                        <div
                          key={i}
                          title={b.desc}
                          className={`badge-card flex flex-col items-center p-2 rounded-xl border
                            ${b.unlocked ? 'border-amber-200 bg-amber-50' : 'border-gray-100 badge-locked bg-gray-50'}`}
                        >
                          <span className="text-xl">{b.icon}</span>
                          <span className="text-[9px] font-semibold text-center text-gray-600 mt-0.5 leading-tight">{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Activity ──────────────────────────────────── */}
            {activeTab === 'activity' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Recent Activity</p>
                  <div className="space-y-2">
                    {(active.activities ?? []).map((a: ActivityEntry, i: number) => {
                      const cfg: ActivityIconConfig = ACTIVITY_ICON_MAP[a.type];
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.cls}`}>
                            {icons[cfg.icon]('w-3.5 h-3.5')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{a.label}</p>
                            <p className="text-[10px] text-gray-400">{a.date}</p>
                          </div>
                          {a.score !== undefined && (
                            <span className="text-sm font-bold text-[#3D08BA]">{a.score}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Study Goals</p>
                  <div className="space-y-3">
                    {STUDY_GOALS.map((g: StudyGoal, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-gray-600">{g.label}</span>
                          <span className="text-xs font-bold" style={{ color: g.color }}>
                            {g.current}/{g.target}{g.unit}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full progress-bar"
                            style={{
                              width: mounted ? `${(g.current / g.target) * 100}%` : '0%',
                              backgroundColor: g.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-linear-to-br from-[#3D08BA]/8 to-[#F68C29]/8 border border-[#3D08BA]/10">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {icons.Sparkles('w-3.5 h-3.5 text-[#3D08BA]')}
                      <p className="text-[10px] font-bold text-[#3D08BA] uppercase tracking-wide">AI Study Tip</p>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      Based on your data, scheduling a 45-min Literature session on Wednesday mornings could boost your average by <strong>3–5%</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: Leaderboard ──────────────────────────────────── */}
            {activeTab === 'leaderboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Class Rankings</p>
                  <div className="space-y-2">
                    {LEADERBOARD.map((row: LeaderboardEntry) => (
                      <LeaderboardRow key={row.rank} {...row} />
                    ))}
                  </div>
                  <div className="mt-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500 text-center">
                      <strong className="text-[#3D08BA]">3 score points</strong> separate you from #1
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Achievement Badges</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BADGES.map((b: Badge, i: number) => (
                      <div
                        key={i}
                        title={b.desc}
                        className={`badge-card p-3 rounded-xl border flex items-start gap-2
                          ${b.unlocked
                            ? 'bg-linear-to-br from-amber-50 to-orange-50 border-amber-200'
                            : 'border-gray-100 badge-locked bg-gray-50'}`}
                      >
                        <span className="text-2xl shrink-0">{b.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-gray-700 leading-tight">{b.label}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{b.desc}</p>
                          {!b.unlocked && b.progress !== undefined && b.target !== undefined && (
                            <div className="mt-1.5">
                              <div className="w-full h-1 bg-gray-200 rounded-full">
                                <div
                                  className="h-full bg-gray-400 rounded-full progress-bar"
                                  style={{ width: mounted ? `${(b.progress / b.target) * 100}%` : '0%' }}
                                />
                              </div>
                              <p className="text-[8px] text-gray-400 mt-0.5">{b.progress}/{b.target}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Performancestats;