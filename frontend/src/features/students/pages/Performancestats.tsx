import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { loadPersistedLocalDevAuthSession, loadPersistedSupabaseAccessToken } from '../../../utils/authSession';
import {
  buildSchoolReportFrame,
  createPdfBlob,
  downloadFile,
  joinCsvRow,
  schoolReportStyles,
} from '../../../utils/exportFiles';
import {
  fetchStudentExams,
  type SchoolExam,
} from '../../schools/utils/examsApi';
import { loadStudentIdentity } from '../utils/studentIdentity';

type WeeklyMetric = {
  week: string;
  score: number;
  completionRate: number;
  studyHours: number;
};

type SubjectMetric = {
  subject: string;
  averageScore: number;
  completionRate: number;
  onTimeRate: number;
  attempts: number;
  trend: number;
};

type GoalMetric = {
  id: string;
  title: string;
  current: number;
  target: number;
  suffix: string;
};

type OverallMetrics = {
  overallScore: number;
  completionRate: number;
  onTimeRate: number;
  averageStudyHours: number;
  trendDelta: number;
  attendanceRate: number;
};

type ReportSnapshot = {
  studentName: string;
  generatedAt: string;
  academicProfile: string;
  overallScore: number;
  completionRate: number;
  onTimeRate: number;
  averageStudyHours: number;
  trendDelta: number;
  attendanceRate: number;
  publishedResultsCount: number;
  awaitingReleaseCount: number;
  latestPublishedAt: string | null;
  strongestSubjects: SubjectMetric[];
  riskSubjects: SubjectMetric[];
  weeklyMetrics: WeeklyMetric[];
  subjectMetrics: SubjectMetric[];
  resultLedgerEntries: ResultLedgerEntry[];
  recommendations: string[];
};

type ResultLedgerEntry = {
  examId: string;
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  publishedAt: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: 'primary' | 'secondary' | 'tertiary';
  gradingScheme: string;
  gradeLabel: string;
  gradePoint: string | null;
};

type PerformanceApiResponse = {
  generatedAt?: string;
  summary?: Partial<OverallMetrics>;
  weeklyMetrics?: WeeklyMetric[];
  subjectMetrics?: SubjectMetric[];
  goals?: GoalMetric[];
  recommendations?: string[];
  dataQuality?: {
    degraded?: boolean;
    dataSources?: string[];
  };
};

type CanvasSlice = {
  dataUrl: string;
  heightPx: number;
};

type ExportFormat = 'txt' | 'pdf' | 'csv';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const LEARNER_KEY_STORAGE_KEY = 'edamaa_learner_key_v1';

const FALLBACK_WEEKLY_METRICS: WeeklyMetric[] = [
  { week: 'W1', score: 74, completionRate: 68, studyHours: 8.2 },
  { week: 'W2', score: 77, completionRate: 72, studyHours: 9.1 },
  { week: 'W3', score: 79, completionRate: 75, studyHours: 10.4 },
  { week: 'W4', score: 81, completionRate: 80, studyHours: 10.8 },
  { week: 'W5', score: 83, completionRate: 84, studyHours: 11.6 },
  { week: 'W6', score: 85, completionRate: 87, studyHours: 12.2 },
  { week: 'W7', score: 84, completionRate: 86, studyHours: 11.5 },
  { week: 'W8', score: 87, completionRate: 89, studyHours: 12.8 },
  { week: 'W9', score: 88, completionRate: 91, studyHours: 13.3 },
  { week: 'W10', score: 89, completionRate: 92, studyHours: 13.8 },
  { week: 'W11', score: 90, completionRate: 93, studyHours: 14.1 },
  { week: 'W12', score: 92, completionRate: 95, studyHours: 14.7 },
];

const FALLBACK_SUBJECT_METRICS: SubjectMetric[] = [
  { subject: 'Mathematics', averageScore: 91, completionRate: 96, onTimeRate: 92, attempts: 24, trend: 5.2 },
  { subject: 'Physics', averageScore: 88, completionRate: 92, onTimeRate: 89, attempts: 21, trend: 3.1 },
  { subject: 'Computer Science', averageScore: 94, completionRate: 97, onTimeRate: 95, attempts: 27, trend: 4.8 },
  { subject: 'English', averageScore: 82, completionRate: 88, onTimeRate: 84, attempts: 19, trend: -1.4 },
  { subject: 'Economics', averageScore: 79, completionRate: 82, onTimeRate: 78, attempts: 17, trend: -2.2 },
];

const FALLBACK_GOAL_METRICS: GoalMetric[] = [
  { id: 'overall-score', title: 'Average Score Goal', current: 87, target: 90, suffix: '%' },
  { id: 'completion-rate', title: 'Completion Goal', current: 91, target: 95, suffix: '%' },
  { id: 'study-hours', title: 'Weekly Study Goal', current: 14.7, target: 16, suffix: ' hrs' },
];

const FALLBACK_RECOMMENDATIONS = [
  'Keep your top subjects steady by maintaining your current weekly learning rhythm.',
  'Schedule two focused revision sessions for lower-scoring subjects this week.',
  'Set a personal reminder before deadlines so you can improve on-time submissions.',
  'Review this report with your tutor so next-week goals stay realistic and measurable.',
];

const round = (value: number) => Math.round(value * 10) / 10;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatTrend = (value: number) => `${value >= 0 ? '+' : ''}${round(value)}%`;

const formatDateTime = (value: string | null | undefined, variant: 'compact' | 'full' = 'compact') => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date';
  }

  return parsed.toLocaleString([], {
    weekday: variant === 'full' ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: variant === 'full' ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
};

const resolveEducationLevel = (
  schoolLevel: ReturnType<typeof loadStudentIdentity>['schoolLevel'],
  classGroup: string
): 'primary' | 'secondary' | 'tertiary' => {
  if (schoolLevel === 'primary' || schoolLevel === 'secondary' || schoolLevel === 'tertiary') {
    return schoolLevel;
  }

  const normalized = classGroup.trim().toLowerCase();
  if (/(nursery|creche|kg|primary|basic)/.test(normalized)) {
    return 'primary';
  }
  if (/(nd|hnd|poly|university|college|100|200|300|400|500|600|level)/.test(normalized)) {
    return 'tertiary';
  }
  return 'secondary';
};

const resolveGradeLabel = (
  level: 'primary' | 'secondary' | 'tertiary',
  score: number,
  maxScore: number
) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (level === 'tertiary') {
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  }

  if (level === 'primary') {
    if (percentage >= 80) return 'Distinction';
    if (percentage >= 70) return 'Excellent';
    if (percentage >= 60) return 'Very Good';
    if (percentage >= 50) return 'Good';
    if (percentage >= 40) return 'Pass';
    return 'Needs Improvement';
  }

  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 40) return 'E';
  return 'F';
};

const resolveGradeLabelWithScheme = (
  level: 'primary' | 'secondary' | 'tertiary',
  scheme: string,
  score: number,
  maxScore: number
) => {
  if (level === 'secondary' && scheme === 'waec') {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 75) return 'A1';
    if (percentage >= 70) return 'B2';
    if (percentage >= 65) return 'B3';
    if (percentage >= 60) return 'C4';
    if (percentage >= 55) return 'C5';
    if (percentage >= 50) return 'C6';
    if (percentage >= 45) return 'D7';
    if (percentage >= 40) return 'E8';
    return 'F9';
  }

  if (level === 'primary' && scheme === 'letter') {
    return resolveGradeLabel('secondary', score, maxScore);
  }

  return resolveGradeLabel(level, score, maxScore);
};

const computeGradePoint = (score: number, maxScore: number, scheme: string) => {
  if (maxScore <= 0) {
    return null;
  }

  const scale = scheme === 'cgpa-4' ? 4 : 5;
  return `${((score / maxScore) * scale).toFixed(2)}`;
};

const formatGradingSchemeLabel = (
  level: 'primary' | 'secondary' | 'tertiary',
  scheme: string
) => {
  if (level === 'secondary' && scheme === 'waec') {
    return 'WAEC grading';
  }
  if (level === 'tertiary' && scheme === 'cgpa-4') {
    return '4-point GPA';
  }
  if (level === 'tertiary' && scheme === 'cgpa-5') {
    return '5-point GPA';
  }
  if (level === 'primary' && scheme === 'letter') {
    return 'Letter grade scale';
  }
  return 'Standard grading';
};

const resolveGradingScheme = (
  exam: SchoolExam,
  level: 'primary' | 'secondary' | 'tertiary'
) => {
  const schemeMap = exam.gradingScheme;
  if (schemeMap) {
    if (level === 'primary' && schemeMap.primary) return schemeMap.primary;
    if (level === 'secondary' && schemeMap.secondary) return schemeMap.secondary;
    if (level === 'tertiary' && schemeMap.tertiary) return schemeMap.tertiary;
  }

  if (level === 'secondary') {
    return 'waec';
  }
  if (level === 'tertiary') {
    return 'cgpa-5';
  }
  return 'standard';
};

const getStatusLabel = (score: number) => {
  if (score >= 90) {
    return { label: 'Excellent', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }

  if (score >= 80) {
    return { label: 'Strong', classes: 'bg-blue-100 text-blue-700 border-blue-200' };
  }

  return { label: 'Needs Focus', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
};

const buildLinePath = (data: number[], width: number, height: number, padding: number) => {
  if (data.length === 0) {
    return { linePath: '', areaPath: '', min: 0, max: 0, span: 1 };
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);

  const points = data.map((value, index) => {
    const x = padding + (index / Math.max(1, data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  const first = points[0];
  const last = points[points.length - 1];
  const baseY = height - padding;
  const areaPath = `${linePath} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;

  return { linePath, areaPath, min, max, span };
};

const deriveOverallMetrics = (subjectMetrics: SubjectMetric[], weeklyMetrics: WeeklyMetric[]): OverallMetrics => {
  const subjectCount = Math.max(1, subjectMetrics.length);
  const weeklyCount = Math.max(1, weeklyMetrics.length);

  const overallScore = round(
    subjectMetrics.reduce((total, item) => total + item.averageScore, 0) / subjectCount
  );
  const completionRate = round(
    subjectMetrics.reduce((total, item) => total + item.completionRate, 0) / subjectCount
  );
  const onTimeRate = round(
    subjectMetrics.reduce((total, item) => total + item.onTimeRate, 0) / subjectCount
  );

  const averageStudyHours = round(
    weeklyMetrics.reduce((total, item) => total + item.studyHours, 0) / weeklyCount
  );

  const firstHalfCount = Math.min(4, weeklyMetrics.length);
  const secondHalfCount = Math.min(4, weeklyMetrics.length);
  const firstHalf = firstHalfCount
    ? weeklyMetrics.slice(0, firstHalfCount).reduce((total, item) => total + item.score, 0) / firstHalfCount
    : overallScore;
  const secondHalf = secondHalfCount
    ? weeklyMetrics.slice(-secondHalfCount).reduce((total, item) => total + item.score, 0) / secondHalfCount
    : overallScore;

  const activeWeeks = weeklyMetrics.filter((item) => item.studyHours >= 1 || item.completionRate >= 55).length;
  const attendanceRate = clamp(Math.round((activeWeeks / weeklyCount) * 100), 40, 100);

  return {
    overallScore,
    completionRate,
    onTimeRate,
    averageStudyHours,
    trendDelta: round(secondHalf - firstHalf),
    attendanceRate,
  };
};

const buildReportText = (params: ReportSnapshot) => {
  const {
    studentName,
    generatedAt,
    academicProfile,
    overallScore,
    completionRate,
    onTimeRate,
    averageStudyHours,
    trendDelta,
    attendanceRate,
    publishedResultsCount,
    awaitingReleaseCount,
    latestPublishedAt,
    strongestSubjects,
    riskSubjects,
    weeklyMetrics,
    subjectMetrics,
    resultLedgerEntries,
    recommendations,
  } = params;

  const lines: string[] = [
    'EDAMAA STUDENT PERFORMANCE REPORT',
    '=================================',
    `Student: ${studentName}`,
    `Academic profile: ${academicProfile}`,
    `Generated: ${generatedAt}`,
    '',
    'EXECUTIVE SUMMARY',
    '-----------------',
    `Overall score: ${formatPercent(overallScore)}`,
    `Completion rate: ${formatPercent(completionRate)}`,
    `On-time submissions: ${formatPercent(onTimeRate)}`,
    `Attendance rate: ${formatPercent(attendanceRate)}`,
    `Average weekly study: ${round(averageStudyHours)} hrs`,
    `12-week trend: ${formatTrend(trendDelta)}`,
    `Published exam results: ${publishedResultsCount}`,
    `Awaiting release: ${awaitingReleaseCount}`,
    `Latest published result: ${formatDateTime(latestPublishedAt, 'full')}`,
    '',
    'WEEKLY TREND',
    '------------',
  ];

  weeklyMetrics.forEach((week) => {
    lines.push(
      `${week.week}: Score ${week.score}% | Completion ${week.completionRate}% | Study ${week.studyHours} hrs`
    );
  });

  lines.push('', 'SUBJECT BREAKDOWN', '-----------------');

  subjectMetrics.forEach((subject) => {
    lines.push(
      `${subject.subject}: Score ${subject.averageScore}% | Completion ${subject.completionRate}% | On-time ${subject.onTimeRate}% | Attempts ${subject.attempts} | Trend ${formatTrend(subject.trend)}`
    );
  });

  lines.push('', 'PUBLISHED RESULT LEDGER', '-----------------------');

  if (resultLedgerEntries.length === 0) {
    lines.push('No published exam results available for the current class profile.');
  } else {
    resultLedgerEntries.forEach((entry) => {
      lines.push(
        `${entry.title} (${entry.subject}) | ${entry.score}/${entry.maxScore} | ${Math.round(entry.percentage)}% | ${entry.gradeLabel}${
          entry.gradePoint ? ` | ${entry.gradePoint}` : ''
        } | Released ${formatDateTime(entry.publishedAt, 'full')}`
      );
    });
  }

  lines.push('', 'KEY INSIGHTS', '------------');

  if (strongestSubjects.length > 0) {
    lines.push(`Strongest areas: ${strongestSubjects.map((subject) => subject.subject).join(', ')}.`);
  }

  if (riskSubjects.length > 0) {
    lines.push(`Focus needed: ${riskSubjects.map((subject) => subject.subject).join(', ')}.`);
  }

  recommendations.forEach((recommendation, index) => {
    lines.push(`Recommended action ${index + 1}: ${recommendation}`);
  });

  return lines.join('\n');
};

const buildReportCsv = (params: ReportSnapshot) => {
  const {
    studentName,
    generatedAt,
    academicProfile,
    overallScore,
    completionRate,
    onTimeRate,
    averageStudyHours,
    trendDelta,
    attendanceRate,
    publishedResultsCount,
    awaitingReleaseCount,
    latestPublishedAt,
    strongestSubjects,
    riskSubjects,
    weeklyMetrics,
    subjectMetrics,
    resultLedgerEntries,
    recommendations,
  } = params;

  const lines: string[] = [
    joinCsvRow(['Section', 'Metric', 'Value']),
    joinCsvRow(['Student', 'Name', studentName]),
    joinCsvRow(['Student', 'Academic Profile', academicProfile]),
    joinCsvRow(['Student', 'Generated At', generatedAt]),
    joinCsvRow(['Executive Summary', 'Overall Score (%)', round(overallScore)]),
    joinCsvRow(['Executive Summary', 'Completion Rate (%)', round(completionRate)]),
    joinCsvRow(['Executive Summary', 'On-Time Submissions (%)', round(onTimeRate)]),
    joinCsvRow(['Executive Summary', 'Attendance Rate (%)', round(attendanceRate)]),
    joinCsvRow(['Executive Summary', 'Average Weekly Study (hrs)', round(averageStudyHours)]),
    joinCsvRow(['Executive Summary', '12-Week Trend Delta (%)', round(trendDelta)]),
    joinCsvRow(['Executive Summary', 'Published Results', publishedResultsCount]),
    joinCsvRow(['Executive Summary', 'Awaiting Release', awaitingReleaseCount]),
    joinCsvRow(['Executive Summary', 'Latest Published Result', formatDateTime(latestPublishedAt, 'full')]),
    '',
    joinCsvRow(['Weekly Trend']),
    joinCsvRow(['Week', 'Score (%)', 'Completion (%)', 'Study Hours']),
  ];

  weeklyMetrics.forEach((week) => {
    lines.push(joinCsvRow([week.week, week.score, week.completionRate, week.studyHours]));
  });

  lines.push(
    '',
    joinCsvRow(['Subject Metrics']),
    joinCsvRow(['Subject', 'Score (%)', 'Completion (%)', 'On-Time (%)', 'Attempts', 'Trend (%)'])
  );

  subjectMetrics.forEach((subject) => {
    lines.push(
      joinCsvRow([
        subject.subject,
        subject.averageScore,
        subject.completionRate,
        subject.onTimeRate,
        subject.attempts,
        round(subject.trend),
      ])
    );
  });

  lines.push(
    '',
    joinCsvRow(['Published Result Ledger']),
    joinCsvRow([
      'Exam',
      'Subject',
      'Class Lane',
      'Released',
      'Score',
      'Percentage',
      'Grade',
      'Grade Point',
      'Grading Scheme',
    ])
  );

  if (resultLedgerEntries.length === 0) {
    lines.push(joinCsvRow(['No published results', '', '', '', '', '', '', '', '']));
  } else {
    resultLedgerEntries.forEach((entry) => {
      lines.push(
        joinCsvRow([
          entry.title,
          entry.subject,
          [entry.department, entry.classGroup].filter(Boolean).join(' • '),
          formatDateTime(entry.publishedAt, 'full'),
          `${entry.score}/${entry.maxScore}`,
          Math.round(entry.percentage),
          entry.gradeLabel,
          entry.gradePoint || '--',
          formatGradingSchemeLabel(entry.level, entry.gradingScheme),
        ])
      );
    });
  }

  lines.push(
    '',
    joinCsvRow(['Strengths', strongestSubjects.map((subject) => subject.subject).join('; ')]),
    joinCsvRow(['Focus Needed', riskSubjects.map((subject) => subject.subject).join('; ') || 'None']),
    ''
  );

  recommendations.forEach((recommendation, index) => {
    lines.push(joinCsvRow([`Recommended action ${index + 1}`, recommendation]));
  });

  return lines.join('\n');
};

const toFiniteNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeWeeklyMetrics = (value: unknown): WeeklyMetric[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      return {
        week: typeof candidate.week === 'string' && candidate.week.trim() ? candidate.week.trim() : `W${index + 1}`,
        score: clamp(Math.round(toFiniteNumber(candidate.score, 0)), 0, 100),
        completionRate: clamp(Math.round(toFiniteNumber(candidate.completionRate, 0)), 0, 100),
        studyHours: round(Math.max(0, toFiniteNumber(candidate.studyHours, 0))),
      };
    })
    .filter((item): item is WeeklyMetric => item !== null);
};

const normalizeSubjectMetrics = (value: unknown): SubjectMetric[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      return {
        subject:
          typeof candidate.subject === 'string' && candidate.subject.trim()
            ? candidate.subject.trim()
            : `Subject ${index + 1}`,
        averageScore: clamp(Math.round(toFiniteNumber(candidate.averageScore, 0)), 0, 100),
        completionRate: clamp(Math.round(toFiniteNumber(candidate.completionRate, 0)), 0, 100),
        onTimeRate: clamp(Math.round(toFiniteNumber(candidate.onTimeRate, 0)), 0, 100),
        attempts: Math.max(0, Math.round(toFiniteNumber(candidate.attempts, 0))),
        trend: round(toFiniteNumber(candidate.trend, 0)),
      };
    })
    .filter((item): item is SubjectMetric => item !== null);
};

const normalizeGoalMetrics = (value: unknown): GoalMetric[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      return {
        id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `goal-${index + 1}`,
        title:
          typeof candidate.title === 'string' && candidate.title.trim()
            ? candidate.title.trim()
            : `Goal ${index + 1}`,
        current: round(toFiniteNumber(candidate.current, 0)),
        target: round(Math.max(1, toFiniteNumber(candidate.target, 1))),
        suffix: typeof candidate.suffix === 'string' ? candidate.suffix : '%',
      };
    })
    .filter((item): item is GoalMetric => item !== null);
};

const normalizeRecommendations = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 4);
};

const normalizeSummary = (value: unknown, fallback: OverallMetrics): OverallMetrics => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Record<string, unknown>;
  return {
    overallScore: clamp(round(toFiniteNumber(candidate.overallScore, fallback.overallScore)), 0, 100),
    completionRate: clamp(round(toFiniteNumber(candidate.completionRate, fallback.completionRate)), 0, 100),
    onTimeRate: clamp(round(toFiniteNumber(candidate.onTimeRate, fallback.onTimeRate)), 0, 100),
    averageStudyHours: round(Math.max(0, toFiniteNumber(candidate.averageStudyHours, fallback.averageStudyHours))),
    trendDelta: round(toFiniteNumber(candidate.trendDelta, fallback.trendDelta)),
    attendanceRate: clamp(Math.round(toFiniteNumber(candidate.attendanceRate, fallback.attendanceRate)), 0, 100),
  };
};

const createCanvasSlices = (
  sourceCanvas: HTMLCanvasElement,
  usableWidthPt: number,
  usableHeightPt: number
): CanvasSlice[] => {
  const pixelPerPoint = sourceCanvas.width / usableWidthPt;
  const pageSliceHeightPx = Math.max(1, Math.floor(usableHeightPt * pixelPerPoint));
  const slices: CanvasSlice[] = [];

  for (let top = 0; top < sourceCanvas.height; top += pageSliceHeightPx) {
    const sliceHeight = Math.min(pageSliceHeightPx, sourceCanvas.height - top);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = sourceCanvas.width;
    pageCanvas.height = sliceHeight;

    const context = pageCanvas.getContext('2d');
    if (!context) {
      continue;
    }

    context.drawImage(sourceCanvas, 0, top, sourceCanvas.width, sliceHeight, 0, 0, sourceCanvas.width, sliceHeight);
    slices.push({
      dataUrl: pageCanvas.toDataURL('image/png'),
      heightPx: sliceHeight,
    });
  }

  return slices;
};

const Performancestats = () => {
  const navigate = useNavigate();
  const reportContentRef = useRef<HTMLElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>(FALLBACK_WEEKLY_METRICS);
  const [subjectMetrics, setSubjectMetrics] = useState<SubjectMetric[]>(FALLBACK_SUBJECT_METRICS);
  const [goalMetrics, setGoalMetrics] = useState<GoalMetric[]>(FALLBACK_GOAL_METRICS);
  const [recommendations, setRecommendations] = useState<string[]>(FALLBACK_RECOMMENDATIONS);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsNotice, setAnalyticsNotice] = useState('Syncing your latest performance insights...');
  const [isResultLedgerLoading, setIsResultLedgerLoading] = useState(false);
  const [resultLedgerNotice, setResultLedgerNotice] = useState('');
  const [resultLedgerEntries, setResultLedgerEntries] = useState<ResultLedgerEntry[]>([]);
  const [awaitingReleaseCount, setAwaitingReleaseCount] = useState(0);

  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const normalizedDepartment = useMemo(() => studentIdentity.department?.trim() || '', [studentIdentity.department]);
  const normalizedClassGroup = useMemo(() => studentIdentity.classGroup?.trim() || '', [studentIdentity.classGroup]);
  const academicProfile = useMemo(() => {
    const segments = [
      studentIdentity.schoolLevel ? `${studentIdentity.schoolLevel} level` : '',
      normalizedDepartment,
      normalizedClassGroup,
    ].filter(Boolean);

    return segments.length > 0 ? segments.join(' • ') : 'Academic profile pending';
  }, [normalizedClassGroup, normalizedDepartment, studentIdentity.schoolLevel]);

  const studentName = useMemo(() => {
    if (typeof window === 'undefined') {
      return studentIdentity.name || 'Student';
    }

    return (window.localStorage.getItem('edamaa_student_display_name') || '').trim() || studentIdentity.name || 'Student';
  }, [studentIdentity.name]);

  const learnerKey = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return (window.localStorage.getItem(LEARNER_KEY_STORAGE_KEY) || '').trim();
  }, []);

  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics>(() =>
    deriveOverallMetrics(FALLBACK_SUBJECT_METRICS, FALLBACK_WEEKLY_METRICS)
  );

  useEffect(() => {
    if (!isExportMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExportMenuOpen]);

  useEffect(() => {
    if (!exportNotice) {
      return;
    }

    const timer = window.setTimeout(() => setExportNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [exportNotice]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadLiveAnalytics = async () => {
      setIsAnalyticsLoading(true);
      setAnalyticsNotice('Refreshing your private analytics...');

      try {
        const meParams = new URLSearchParams();
        if (learnerKey) {
          meParams.set('learnerKey', learnerKey);
        }
        const meQuery = meParams.toString() ? `?${meParams.toString()}` : '';

        const requestAnalytics = async (endpoint: string, init?: RequestInit) => {
          const response = await fetch(endpoint, {
            signal: controller.signal,
            ...init,
          });
          if (!response.ok) {
            let message = '';
            try {
              const payload = (await response.json()) as { message?: string | string[] };
              if (Array.isArray(payload.message)) {
                message = payload.message.join(', ');
              } else if (typeof payload.message === 'string') {
                message = payload.message.trim();
              }
            } catch {
              // Try plain text fallback below.
            }

            if (!message) {
              try {
                const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
                if (textPayload && !/^</.test(textPayload)) {
                  message = textPayload;
                }
              } catch {
                // Fallback below.
              }
            }

            throw new Error(message || `Request failed with status ${response.status}`);
          }
          return (await response.json()) as PerformanceApiResponse;
        };

        const token = loadPersistedSupabaseAccessToken();
        if (!token) {
          const localDevSession = loadPersistedLocalDevAuthSession();
          setAnalyticsNotice(
            localDevSession
              ? 'You are signed in with local development mode, so a sample analytics snapshot is shown.'
              : 'Sign in to view your private analytics. A local snapshot is shown until authentication is available.'
          );
          return;
        }

        const payload = await requestAnalytics(`${API_BASE_URL}/student-analytics/me/performance${meQuery}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) {
          return;
        }

        const nextWeekly = normalizeWeeklyMetrics(payload.weeklyMetrics);
        const nextSubjects = normalizeSubjectMetrics(payload.subjectMetrics);
        const nextGoals = normalizeGoalMetrics(payload.goals);
        const nextRecommendations = normalizeRecommendations(payload.recommendations);

        const resolvedWeekly = nextWeekly.length > 0 ? nextWeekly : FALLBACK_WEEKLY_METRICS;
        const resolvedSubjects = nextSubjects.length > 0 ? nextSubjects : FALLBACK_SUBJECT_METRICS;

        setWeeklyMetrics(resolvedWeekly);
        setSubjectMetrics(resolvedSubjects);
        setGoalMetrics(nextGoals.length > 0 ? nextGoals : FALLBACK_GOAL_METRICS);
        setRecommendations(nextRecommendations.length > 0 ? nextRecommendations : FALLBACK_RECOMMENDATIONS);

        const derivedSummary = deriveOverallMetrics(resolvedSubjects, resolvedWeekly);
        setOverallMetrics(normalizeSummary(payload.summary, derivedSummary));

        const degraded = Boolean(payload.dataQuality?.degraded);
        setAnalyticsNotice(
          degraded
            ? 'Your private analytics loaded, but a few data sources are still syncing.'
            : 'Your private, account-linked analytics has been refreshed.'
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const message = error instanceof Error ? error.message : '';
        const isAuthFailure = message.includes('status 401') || message.includes('status 403');
        setAnalyticsNotice(
          isAuthFailure
            ? 'Your session expired. Please sign in again to load private analytics.'
            : 'Live analytics is temporarily unavailable, so your last known snapshot is being shown.'
        );
      } finally {
        if (!cancelled) {
          setIsAnalyticsLoading(false);
        }
      }
    };

    void loadLiveAnalytics();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [learnerKey]);

  useEffect(() => {
    let active = true;

    const loadResultLedger = async () => {
      if (!normalizedDepartment || !normalizedClassGroup) {
        setResultLedgerEntries([]);
        setAwaitingReleaseCount(0);
        setResultLedgerNotice('Add your department and class in your profile to unlock your published result ledger.');
        setIsResultLedgerLoading(false);
        return;
      }

      setIsResultLedgerLoading(true);
      try {
        const payload = await fetchStudentExams({
          department: normalizedDepartment,
          classGroup: normalizedClassGroup,
        });

        if (!active) {
          return;
        }

        const examLookup = (Array.isArray(payload.exams) ? payload.exams : []).reduce<Record<string, SchoolExam>>(
          (collection, exam) => {
            collection[exam.id] = exam;
            return collection;
          },
          {}
        );

        const submissions = Array.isArray(payload.submissions) ? payload.submissions : [];
        const nextLedgerEntries = submissions
          .flatMap((submission) => {
            if (submission.status !== 'published' || typeof submission.score !== 'number') {
              return [];
            }

            const exam = examLookup[submission.examId];
            if (!exam) {
              return [];
            }

            const level = resolveEducationLevel(studentIdentity.schoolLevel, exam.classGroup);
            const gradingScheme = resolveGradingScheme(exam, level);
            const percentage = submission.maxScore > 0 ? (submission.score / submission.maxScore) * 100 : 0;

            return [
              {
                examId: exam.id,
                title: exam.title,
                subject: exam.subject,
                department: exam.department,
                classGroup: exam.classGroup,
                publishedAt: submission.publishedAt || submission.gradedAt || submission.submittedAt,
                score: submission.score,
                maxScore: submission.maxScore,
                percentage,
                level,
                gradingScheme,
                gradeLabel: resolveGradeLabelWithScheme(level, gradingScheme, submission.score, submission.maxScore),
                gradePoint:
                  level === 'tertiary' ? computeGradePoint(submission.score, submission.maxScore, gradingScheme) : null,
              },
            ];
          })
          .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());

        setResultLedgerEntries(nextLedgerEntries);
        setAwaitingReleaseCount(
          submissions.filter((submission) => submission.status === 'submitted' || submission.status === 'graded').length
        );
        setResultLedgerNotice(
          nextLedgerEntries.length === 0
            ? 'No published exam results yet for your current class profile.'
            : ''
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Could not load your published result ledger right now.';
        setResultLedgerEntries([]);
        setAwaitingReleaseCount(0);
        setResultLedgerNotice(message);
      } finally {
        if (active) {
          setIsResultLedgerLoading(false);
        }
      }
    };

    void loadResultLedger();

    return () => {
      active = false;
    };
  }, [normalizedClassGroup, normalizedDepartment, studentIdentity.schoolLevel]);

  const strongestSubjects = useMemo(
    () => [...subjectMetrics].sort((left, right) => right.averageScore - left.averageScore).slice(0, 2),
    [subjectMetrics]
  );

  const riskSubjects = useMemo(
    () => subjectMetrics.filter((subject) => subject.averageScore < 82 || subject.onTimeRate < 82),
    [subjectMetrics]
  );

  const chart = useMemo(() => {
    const width = 820;
    const height = 280;
    const padding = 28;
    const scores = weeklyMetrics.map((item) => item.score);
    return {
      width,
      height,
      ...buildLinePath(scores, width, height, padding),
    };
  }, [weeklyMetrics]);

  const resultLedgerSnapshot = useMemo(() => {
    const publishedResultsCount = resultLedgerEntries.length;
    const averagePercentage =
      publishedResultsCount > 0
        ? resultLedgerEntries.reduce((total, entry) => total + entry.percentage, 0) / publishedResultsCount
        : null;
    const bestResult = [...resultLedgerEntries].sort((left, right) => right.percentage - left.percentage)[0] || null;
    const latestPublishedAt = resultLedgerEntries[0]?.publishedAt || null;
    const groupedBySubject = resultLedgerEntries.reduce<Record<string, { total: number; count: number }>>(
      (collection, entry) => {
        if (!collection[entry.subject]) {
          collection[entry.subject] = { total: 0, count: 0 };
        }
        collection[entry.subject].total += entry.percentage;
        collection[entry.subject].count += 1;
        return collection;
      },
      {}
    );
    const strongestLedgerSubject = Object.entries(groupedBySubject)
      .map(([subject, summary]) => ({
        subject,
        average: summary.total / Math.max(1, summary.count),
      }))
      .sort((left, right) => right.average - left.average)[0] || null;

    return {
      publishedResultsCount,
      averagePercentage,
      bestResult,
      latestPublishedAt,
      strongestLedgerSubject,
    };
  }, [resultLedgerEntries]);

  const buildReportSnapshot = () => {
    const generatedAt = new Date().toLocaleString();
    return {
      studentName,
      generatedAt,
      academicProfile,
      overallScore: overallMetrics.overallScore,
      completionRate: overallMetrics.completionRate,
      onTimeRate: overallMetrics.onTimeRate,
      averageStudyHours: overallMetrics.averageStudyHours,
      trendDelta: overallMetrics.trendDelta,
      attendanceRate: overallMetrics.attendanceRate,
      publishedResultsCount: resultLedgerSnapshot.publishedResultsCount,
      awaitingReleaseCount,
      latestPublishedAt: resultLedgerSnapshot.latestPublishedAt,
      strongestSubjects,
      riskSubjects,
      weeklyMetrics,
      subjectMetrics,
      resultLedgerEntries,
      recommendations,
    };
  };

  const handleDownloadTextReport = () => {
    const reportSnapshot = buildReportSnapshot();
    const reportText = buildReportText(reportSnapshot);
    const dateStamp = new Date().toISOString().split('T')[0];

    downloadFile(
      new Blob([reportText], { type: 'text/plain;charset=utf-8' }),
      `edamaa-performance-report-${dateStamp}.txt`
    );
    setExportNotice({
      kind: 'success',
      message: 'Text report download started.',
    });
  };

  const handleDownloadCsvReport = () => {
    const reportSnapshot = buildReportSnapshot();
    const reportCsv = buildReportCsv(reportSnapshot);
    const dateStamp = new Date().toISOString().split('T')[0];

    downloadFile(
      new Blob([reportCsv], { type: 'text/csv;charset=utf-8' }),
      `edamaa-performance-report-${dateStamp}.csv`
    );
    setExportNotice({
      kind: 'success',
      message: 'CSV report download started.',
    });
  };

  const handleDownloadPdfReport = async () => {
    if (isExportingPdf) {
      return;
    }

    const reportElement = reportContentRef.current;
    if (!reportElement) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const [html2canvasModule] = await Promise.all([
        import('html2canvas'),
      ]);

      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#f9fafb',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: reportElement.scrollWidth,
        windowHeight: reportElement.scrollHeight,
      });

      const pageWidthPt = 595.28;
      const pageHeightPt = 841.89;
      const marginPt = 24;
      const usableWidthPt = pageWidthPt - marginPt * 2;
      const usableHeightPt = pageHeightPt - marginPt * 2;
      const slices = createCanvasSlices(canvas, usableWidthPt, usableHeightPt);

      const reportSnapshot = buildReportSnapshot();

      const reportFrame = buildSchoolReportFrame({
        title: 'Student Performance Report',
        subtitle: reportSnapshot.studentName,
        documentLabel: 'Learner progress report',
        documentCode: `STU-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`,
        generatedAt: reportSnapshot.generatedAt,
        metaLines: [
          `Overall score: ${Math.round(reportSnapshot.overallScore)}%`,
          `Completion rate: ${Math.round(reportSnapshot.completionRate)}%`,
          `On-time rate: ${Math.round(reportSnapshot.onTimeRate)}%`,
        ],
        leftSignatoryRole: 'Prepared by',
        rightSignatoryRole: 'For learner records',
      });

      const content: Record<string, unknown>[] = [...reportFrame.headerContent];

      slices.forEach((slice, index) => {
        const renderedHeightPt = (slice.heightPx * usableWidthPt) / canvas.width;
        const imageBlock: Record<string, unknown> = {
          image: slice.dataUrl,
          width: usableWidthPt,
          height: renderedHeightPt,
          margin: [0, 0, 0, 6],
        };

        if (index < slices.length - 1) {
          imageBlock.pageBreak = 'after';
        }

        content.push(imageBlock);
      });

      const docDefinition: Record<string, unknown> = {
        pageSize: 'A4',
        pageMargins: [marginPt, marginPt, marginPt, marginPt],
        footer: reportFrame.footer,
        defaultStyle: {
          font: 'Helvetica',
        },
        content: [...content, ...reportFrame.signOffContent],
        styles: {
          ...schoolReportStyles,
          title: {
            fontSize: 16,
            bold: true,
            color: '#111827',
          },
          meta: {
            fontSize: 10,
            color: '#6b7280',
          },
        },
        info: {
          title: 'Edamaa Student Performance Report',
          author: 'Edamaa Analytics',
          subject: 'Student performance analytics',
        },
      };

      const dateStamp = new Date().toISOString().split('T')[0];
      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-performance-report-${dateStamp}.pdf`);
      setExportNotice({
        kind: 'success',
        message: 'PDF report download started.',
      });
    } catch (error) {
      console.error('Unable to export visual PDF report.', error);
      setExportNotice({
        kind: 'error',
        message: 'PDF export failed. Please try again.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSelectReportFormat = (format: ExportFormat) => {
    setIsExportMenuOpen(false);

    if (format === 'txt') {
      handleDownloadTextReport();
      return;
    }

    if (format === 'csv') {
      handleDownloadCsvReport();
      return;
    }

    void handleDownloadPdfReport();
  };

  const recommendationCards = [
    {
      title: 'Protect strong performance',
      icon: CheckCircleIcon,
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Improve deadline consistency',
      icon: ClockIcon,
      iconColor: 'text-[#3D08BA]',
    },
    {
      title: 'Focus on areas that need attention',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-600',
    },
    {
      title: 'Review report with your tutor',
      icon: LightBulbIcon,
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>

          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Performance Analytics</p>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">My Performance Report</h1>
          </div>

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((previous) => !previous)}
              disabled={isExportingPdf}
              className={`inline-flex items-center gap-2 rounded-lg bg-[#3D08BA] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2d0692] ${
                isExportingPdf ? 'cursor-not-allowed opacity-70' : ''
              }`}
              aria-haspopup="menu"
              aria-expanded={isExportMenuOpen}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span>{isExportingPdf ? 'Preparing PDF...' : 'Full Report'}</span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isExportMenuOpen && !isExportingPdf && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectReportFormat('txt')}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>Download as Text</span>
                  <span className="text-xs font-semibold text-gray-500">TXT</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectReportFormat('pdf')}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>Download as PDF</span>
                  <span className="text-xs font-semibold text-gray-500">PDF</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelectReportFormat('csv')}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <span>Download as CSV</span>
                  <span className="text-xs font-semibold text-gray-500">CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main ref={reportContentRef} className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {exportNotice && (
          <section
            className={`rounded-xl border px-4 py-3 text-sm ${
              exportNotice.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {exportNotice.message}
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">Hello {studentName}, here is your latest learning analytics summary.</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">Executive Overview</h2>
              <p className="mt-1 text-xs text-gray-500">
                {isAnalyticsLoading ? 'Updating from backend...' : analyticsNotice}
              </p>
            </div>
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              {formatTrend(overallMetrics.trendDelta)} in the last 12 weeks
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Overall score</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(overallMetrics.overallScore)}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Completion rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(overallMetrics.completionRate)}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">On-time submissions</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(overallMetrics.onTimeRate)}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Attendance</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(overallMetrics.attendanceRate)}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Avg study / week</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{overallMetrics.averageStudyHours}h</p>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">Result ledger</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">Published exam results</h2>
              <p className="mt-1 text-sm text-gray-600">
                Released scores tied to your saved academic profile, with quick access back to the full exam result.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {academicProfile}
              </span>
              <button
                type="button"
                onClick={() => navigate('/student-exams')}
                className="inline-flex items-center rounded-lg border border-[#3D08BA]/20 px-3 py-2 text-sm font-semibold text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/5"
              >
                Open exam centre
              </button>
            </div>
          </div>

          {resultLedgerNotice && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {resultLedgerNotice}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Published results</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{resultLedgerSnapshot.publishedResultsCount}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Average released score</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {resultLedgerSnapshot.averagePercentage === null
                  ? '--'
                  : `${Math.round(resultLedgerSnapshot.averagePercentage)}%`}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Best subject</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {resultLedgerSnapshot.strongestLedgerSubject?.subject || '--'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {resultLedgerSnapshot.strongestLedgerSubject
                  ? `${Math.round(resultLedgerSnapshot.strongestLedgerSubject.average)}% average`
                  : 'Waiting for released results'}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Awaiting release</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{awaitingReleaseCount}</p>
              <p className="mt-1 text-xs text-gray-500">
                {resultLedgerSnapshot.latestPublishedAt
                  ? `Latest release ${formatDateTime(resultLedgerSnapshot.latestPublishedAt, 'compact')}`
                  : 'No released result yet'}
              </p>
            </article>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 font-semibold">Assessment</th>
                  <th className="px-2 py-2 font-semibold">Released</th>
                  <th className="px-2 py-2 font-semibold">Score</th>
                  <th className="px-2 py-2 font-semibold">Grade</th>
                  <th className="px-2 py-2 font-semibold">Scheme</th>
                  <th className="px-2 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isResultLedgerLoading && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-sm text-gray-500">
                      Loading published result ledger...
                    </td>
                  </tr>
                )}

                {!isResultLedgerLoading && resultLedgerEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-sm text-gray-500">
                      No published results available for this student profile yet.
                    </td>
                  </tr>
                )}

                {!isResultLedgerLoading &&
                  resultLedgerEntries.map((entry) => (
                    <tr key={entry.examId} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-2 py-3">
                        <p className="font-semibold text-gray-900">{entry.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {entry.subject} • {[entry.department, entry.classGroup].filter(Boolean).join(' • ')}
                        </p>
                      </td>
                      <td className="px-2 py-3 text-gray-700">{formatDateTime(entry.publishedAt, 'compact')}</td>
                      <td className="px-2 py-3">
                        <p className="font-semibold text-gray-900">
                          {entry.score}/{entry.maxScore}
                        </p>
                        <p className="text-xs text-gray-500">{Math.round(entry.percentage)}%</p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="font-semibold text-gray-900">{entry.gradeLabel}</p>
                        <p className="text-xs text-gray-500">{entry.gradePoint || 'No grade point'}</p>
                      </td>
                      <td className="px-2 py-3 text-gray-700">
                        {formatGradingSchemeLabel(entry.level, entry.gradingScheme)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              examId: entry.examId,
                              department: entry.department,
                              classGroup: entry.classGroup,
                              view: 'result',
                            });
                            navigate(`/student-exams?${params.toString()}`);
                          }}
                          className="inline-flex items-center rounded-lg border border-[#3D08BA]/20 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/5"
                        >
                          Open result
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Performance Trend (12 Weeks)</h3>
                  <p className="text-sm text-gray-600">Tracks your average score progression over time.</p>
                </div>
                <ChartBarIcon className="h-5 w-5 text-gray-500" />
              </div>

              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                  className="h-64 min-w-[720px]"
                  role="img"
                  aria-label="Weekly performance trend chart"
                >
                  <defs>
                    <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3D08BA" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3D08BA" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {[0, 1, 2, 3, 4].map((line) => {
                    const y = 28 + line * 56;
                    return <line key={line} x1="28" x2="792" y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" />;
                  })}

                  {chart.areaPath && <path d={chart.areaPath} fill="url(#scoreFill)" />}
                  {chart.linePath && (
                    <path d={chart.linePath} fill="none" stroke="#3D08BA" strokeWidth="3" strokeLinecap="round" />
                  )}

                  {weeklyMetrics.map((week, index) => {
                    const x = 28 + (index / Math.max(1, weeklyMetrics.length - 1)) * (chart.width - 56);
                    const y = chart.height - 28 - ((week.score - chart.min) / chart.span) * (chart.height - 56);

                    return (
                      <g key={week.week}>
                        <circle cx={x} cy={y} r="4" fill="#3D08BA" />
                        <text x={x} y={chart.height - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
                          {week.week}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Subject-Level Analytics</h3>
                  <p className="text-sm text-gray-600">Detailed performance and consistency by subject.</p>
                </div>
                <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 font-semibold">Subject</th>
                      <th className="px-2 py-2 font-semibold">Score</th>
                      <th className="px-2 py-2 font-semibold">Completion</th>
                      <th className="px-2 py-2 font-semibold">On-time</th>
                      <th className="px-2 py-2 font-semibold">Attempts</th>
                      <th className="px-2 py-2 font-semibold">Trend</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectMetrics.map((subject) => {
                      const status = getStatusLabel(subject.averageScore);
                      return (
                        <tr key={subject.subject} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-2 py-3 font-semibold text-gray-900">{subject.subject}</td>
                          <td className="px-2 py-3 text-gray-700">{formatPercent(subject.averageScore)}</td>
                          <td className="px-2 py-3 text-gray-700">{formatPercent(subject.completionRate)}</td>
                          <td className="px-2 py-3 text-gray-700">{formatPercent(subject.onTimeRate)}</td>
                          <td className="px-2 py-3 text-gray-700">{subject.attempts}</td>
                          <td
                            className={`px-2 py-3 font-semibold ${
                              subject.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatTrend(subject.trend)}
                          </td>
                          <td className="px-2 py-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Strengths</h3>
              <div className="space-y-2">
                {strongestSubjects.map((subject) => (
                  <div key={subject.subject} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="font-semibold text-emerald-800">{subject.subject}</p>
                    <p className="text-sm text-emerald-700">
                      Score {formatPercent(subject.averageScore)} | On-time {formatPercent(subject.onTimeRate)}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Areas to Improve</h3>
              {riskSubjects.length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Great consistency right now. Keep your current learning rhythm.
                </div>
              ) : (
                <div className="space-y-2">
                  {riskSubjects.map((subject) => (
                    <div key={subject.subject} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="font-semibold text-amber-800">{subject.subject}</p>
                      <p className="text-sm text-amber-700">
                        Score {formatPercent(subject.averageScore)} | On-time {formatPercent(subject.onTimeRate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Goal Progress</h3>
              <div className="space-y-3">
                {goalMetrics.map((goal) => {
                  const progress = clamp((goal.current / goal.target) * 100, 0, 100);
                  return (
                    <div key={goal.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <p className="font-medium text-gray-800">{goal.title}</p>
                        <p className="text-gray-600">
                          {goal.current}
                          {goal.suffix} / {goal.target}
                          {goal.suffix}
                        </p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-[#3D08BA] to-[#F68C29]"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Recommended Actions</h3>
              <div className="space-y-2 text-sm">
                {recommendations.map((recommendation, index) => {
                  const card = recommendationCards[index] || recommendationCards[recommendationCards.length - 1];
                  const Icon = card.icon;
                  return (
                    <div key={`${card.title}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                      <p className="inline-flex items-center gap-2 font-semibold text-gray-900">
                        <Icon className={`h-4 w-4 ${card.iconColor}`} />
                        {card.title}
                      </p>
                      <p className="mt-1">{recommendation}</p>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Performancestats;
