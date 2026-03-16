import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCopy,
  FaEdit,
  FaFilter,
  FaShareAlt,
  FaListUl,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTable,
  FaTimes,
  FaTrash,
  FaUsers,
  FaVideo,
} from 'react-icons/fa';
import NavBar from '../../../components/layout/school-layout/NavBar';
import {
  buildSchoolReportFrame,
  createPdfBlob,
  downloadFile,
  joinCsvRow,
  schoolReportStyles,
} from '../../../utils/exportFiles';
import {
  createSchoolScheduleSession,
  createSchoolTeacher,
  deleteSchoolScheduleSession,
  deleteSchoolTeacher,
  fetchSchoolScheduleAttendance,
  fetchSchoolScheduleNotifications,
  fetchSchoolScheduleSessions,
  fetchSchoolScheduleTeacherAccess,
  fetchSchoolTeachers,
  regenerateSchoolScheduleTeacherAccess,
  resendSchoolTeacherInvite,
  updateSchoolScheduleSession,
  updateSchoolScheduleAttendance,
  upsertSchoolScheduleAttendance,
  updateSchoolTeacher,
  type SchoolScheduleAttendanceRecord,
  type SchoolScheduleAttendanceResponse,
  type SchoolScheduleNotification,
  type SchoolScheduleSession,
  type SchoolTeacherRosterItem,
} from '../utils/schoolScheduleApi';

type ScheduleStatus = 'upcoming' | 'live' | 'completed';

type SessionFormState = {
  title: string;
  subject: string;
  instructor: string;
  assignedTutorEmail: string;
  assignedTutorName: string;
  department: string;
  classGroup: string;
  audienceTag: string;
  startAt: string;
  durationMinutes: string;
  expectedStudents: string;
  attendanceGracePeriodMinutes: string;
  notes: string;
};

type TeacherFormState = {
  name: string;
  email: string;
  department: string;
  classGroup: string;
  subjectFocus: string;
};

type AttendanceFormState = {
  participantName: string;
  participantId: string;
  status: 'present' | 'absent';
  note: string;
};

type AttendanceFilter = 'all' | 'present' | 'late' | 'pending' | 'absent';

type AttendanceReportSessionItem = {
  session: SchoolScheduleSession;
  attendance: SchoolScheduleAttendanceResponse;
};

type AttendanceReportRow = {
  sessionId: string;
  sessionTitle: string;
  sessionSubject: string;
  sessionAudience: string;
  sessionStartAt: string;
  participantName: string;
  participantId: string | null;
  status: Exclude<AttendanceFilter, 'all'>;
  source: 'live' | 'manual' | 'check_in';
  checkedInAt: string | null;
  joinedAt: string | null;
  lastSeenAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
  note: string | null;
};

type AttendanceSessionTrend = {
  sessionId: string;
  title: string;
  subject: string;
  instructor: string;
  audience: string;
  startAt: string;
  coverage: number;
  expectedStudents: number;
  attendedCount: number;
  lateCount: number;
  absentCount: number;
  pendingCount: number;
};

type AttendanceGroupedTrend = {
  key: string;
  label: string;
  secondaryLabel: string;
  classCount: number;
  averageCoverage: number;
  attendedCount: number;
  expectedStudents: number;
  lateCount: number;
  latestCoverage: number | null;
  previousCoverage: number | null;
  deltaCoverage: number | null;
};

type SessionDraftMode = 'create' | 'edit' | 'duplicate' | 'reschedule';

type SchoolScheduleRouteState = {
  inviteTeacher?: {
    name?: string;
    email?: string;
    department?: string;
    classGroup?: string;
    subjectFocus?: string;
  };
  openCreate?: boolean;
  highlightSessionId?: string;
};

const buildSeedSchedule = () => {
  const now = Date.now();
  return [
    {
      id: 'SCH-SCHED-001',
      title: 'SS3 Mathematics Intensive',
      subject: 'Mathematics',
      instructor: 'Mr. Joseph',
      startAt: new Date(now + 1000 * 60 * 35).toISOString(),
      endAt: new Date(now + 1000 * 60 * 110).toISOString(),
      durationMinutes: 75,
      expectedStudents: 48,
      roomCode: 'MATH-SS3-INT',
      notes: 'Focus on WAEC past questions and timed drills.',
      status: 'upcoming' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'SCH-SCHED-002',
      title: 'Physics Concept Clinic',
      subject: 'Physics',
      instructor: 'Dr. Adebayo',
      startAt: new Date(now + 1000 * 60 * 120).toISOString(),
      endAt: new Date(now + 1000 * 60 * 180).toISOString(),
      durationMinutes: 60,
      expectedStudents: 35,
      roomCode: 'PHY-CLINIC',
      notes: 'Open Q&A and quick classwork checkpoint.',
      status: 'upcoming' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'SCH-SCHED-003',
      title: 'English Language Revision',
      subject: 'English',
      instructor: 'Mrs. Chinedu',
      startAt: new Date(now - 1000 * 60 * 20).toISOString(),
      endAt: new Date(now + 1000 * 60 * 70).toISOString(),
      durationMinutes: 90,
      expectedStudents: 42,
      roomCode: 'ENG-REV-01',
      notes: 'Essay outline walkthrough and assignment briefing.',
      status: 'live' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as SchoolScheduleSession[];
};

const getSessionStatus = (session: SchoolScheduleSession, nowMs: number): ScheduleStatus => {
  const startMs = new Date(session.startAt).getTime();
  const endMs = startMs + session.durationMinutes * 60 * 1000;

  if (!Number.isFinite(startMs)) {
    return 'upcoming';
  }
  if (nowMs >= startMs && nowMs < endMs) {
    return 'live';
  }
  if (nowMs >= endMs) {
    return 'completed';
  }
  return 'upcoming';
};

const statusPillClass = (status: ScheduleStatus) => {
  if (status === 'live') {
    return 'bg-red-100 text-red-700';
  }
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700';
  }
  return 'bg-[#3D08BA]/10 text-[#3D08BA]';
};

const statusLabel = (status: ScheduleStatus) => {
  if (status === 'live') {
    return 'Live now';
  }
  if (status === 'completed') {
    return 'Completed';
  }
  return 'Upcoming';
};

const formatDateTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDateTimeInputValue = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const formatAttendanceMoment = (value: string | null) => {
  if (!value) {
    return 'Not recorded';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid time';
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDateInputValue = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  return addDays(copy, diff);
};

const getLocalDayKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekRangeLabel = (weekStart: Date) => {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

  if (sameMonth && sameYear) {
    return `${weekStart.toLocaleDateString([], {
      month: 'short',
    })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }

  return `${weekStart.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })} - ${weekEnd.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const formatSessionTime = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeScheduleCompareLabel = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getSessionAudienceLabel = (session: SchoolScheduleSession) =>
  session.audienceTag || [session.department, session.classGroup].filter(Boolean).join(' • ') || '';

const teacherInviteStatusLabel = (teacher: SchoolTeacherRosterItem) => {
  if (!teacher.isActive || teacher.inviteStatus === 'inactive') {
    return 'Inactive';
  }
  if (teacher.inviteStatus === 'accepted') {
    return 'Accepted';
  }
  return 'Invited';
};

const teacherInviteStatusClass = (teacher: SchoolTeacherRosterItem) => {
  if (!teacher.isActive || teacher.inviteStatus === 'inactive') {
    return 'bg-gray-100 text-gray-700';
  }
  if (teacher.inviteStatus === 'accepted') {
    return 'bg-emerald-100 text-emerald-700';
  }
  return 'bg-amber-100 text-amber-700';
};

const inviteActivityTypeLabel = (kind: SchoolScheduleNotification['kind']) => {
  if (kind === 'teacher_access_accepted') {
    return 'Accepted';
  }
  if (kind === 'class_assignment') {
    return 'Class Invite';
  }
  if (kind === 'teacher_invite') {
    return 'Teacher Invite';
  }
  return 'Update';
};

const inviteActivityTypeClass = (kind: SchoolScheduleNotification['kind']) => {
  if (kind === 'teacher_access_accepted') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (kind === 'class_assignment') {
    return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  }
  if (kind === 'teacher_invite') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const premiumShellClass =
  'rounded-[30px] border border-slate-200/70 bg-white/88 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.34)] backdrop-blur-xl';

const premiumPanelClass =
  'rounded-[26px] border border-slate-200/75 bg-white/84 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.3)] backdrop-blur-xl';

const premiumInsetClass =
  'rounded-2xl border border-slate-200/75 bg-slate-50/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]';

const premiumInputClass =
  'w-full rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.42)] outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10';

const premiumSelectClass =
  'rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-3 text-sm text-slate-700 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.42)] outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(61,8,186,0.82)] transition hover:-translate-y-0.5 hover:bg-[#2F078F] hover:shadow-[0_20px_40px_-20px_rgba(61,8,186,0.88)] disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const tintedButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-4 py-2.5 text-sm font-semibold text-[#3D08BA] shadow-[0_10px_30px_-24px_rgba(61,8,186,0.42)] transition hover:-translate-y-0.5 hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60';

const iconButtonClass =
  'group inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

const getNameInitials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TR';

const DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES = 5;

const attendanceFilterLabel = (value: AttendanceFilter) => {
  switch (value) {
    case 'present':
      return 'Present';
    case 'late':
      return 'Late';
    case 'pending':
      return 'Pending';
    case 'absent':
      return 'Absent';
    default:
      return 'All';
  }
};

const SchoolSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasConsumedInvite = useRef(false);
  const sessionCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [sessions, setSessions] = useState<SchoolScheduleSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ScheduleStatus>('all');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => startOfWeek(new Date()));
  const [notice, setNotice] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [timetableExportAction, setTimetableExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [teacherTimetableExportAction, setTeacherTimetableExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [isBulkRescheduleOpen, setIsBulkRescheduleOpen] = useState(false);
  const [bulkRescheduleDays, setBulkRescheduleDays] = useState('7');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionDraftMode, setSessionDraftMode] = useState<SessionDraftMode>('create');
  const [sessionDraftOrigin, setSessionDraftOrigin] = useState<{
    id: string;
    title: string;
    startAt: string;
  } | null>(null);
  const [formState, setFormState] = useState<SessionFormState>({
    title: '',
    subject: '',
    instructor: '',
    assignedTutorEmail: '',
    assignedTutorName: '',
    department: '',
    classGroup: '',
    audienceTag: '',
    startAt: '',
    durationMinutes: '60',
    expectedStudents: '',
    attendanceGracePeriodMinutes: String(DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES),
    notes: '',
  });
  const [teacherRoster, setTeacherRoster] = useState<SchoolTeacherRosterItem[]>([]);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);
  const [teacherNotice, setTeacherNotice] = useState<string | null>(null);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherInviteFilter, setTeacherInviteFilter] = useState<'all' | 'invited' | 'accepted' | 'inactive'>('all');
  const [teacherForm, setTeacherForm] = useState<TeacherFormState>({
    name: '',
    email: '',
    department: '',
    classGroup: '',
    subjectFocus: '',
  });
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [isTeacherSubmitting, setIsTeacherSubmitting] = useState(false);
  const [activeTeacherActionId, setActiveTeacherActionId] = useState<string | null>(null);
  const [timetableTeacher, setTimetableTeacher] = useState<SchoolTeacherRosterItem | null>(null);
  const [teacherTimetableWeekStart, setTeacherTimetableWeekStart] = useState<Date>(() =>
    startOfWeek(new Date())
  );
  const [inviteActivity, setInviteActivity] = useState<SchoolScheduleNotification[]>([]);
  const [isInviteActivityLoading, setIsInviteActivityLoading] = useState(false);
  const [inviteActivityFilter, setInviteActivityFilter] = useState<'all' | 'accepted' | 'pending'>(
    'all'
  );
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [copiedFieldKey, setCopiedFieldKey] = useState<string | null>(null);
  const [attendanceTargetSession, setAttendanceTargetSession] = useState<SchoolScheduleSession | null>(null);
  const [attendancePayload, setAttendancePayload] = useState<SchoolScheduleAttendanceResponse | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceBusyId, setAttendanceBusyId] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [attendanceExportAction, setAttendanceExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [isAttendanceReportOpen, setIsAttendanceReportOpen] = useState(false);
  const [attendanceReportStartDate, setAttendanceReportStartDate] = useState(() =>
    formatDateInputValue(startOfWeek(new Date()))
  );
  const [attendanceReportEndDate, setAttendanceReportEndDate] = useState(() =>
    formatDateInputValue(addDays(startOfWeek(new Date()), 6))
  );
  const [attendanceReportFilter, setAttendanceReportFilter] = useState<AttendanceFilter>('all');
  const [attendanceReportItems, setAttendanceReportItems] = useState<AttendanceReportSessionItem[]>([]);
  const [isAttendanceReportLoading, setIsAttendanceReportLoading] = useState(false);
  const [attendanceReportExportAction, setAttendanceReportExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormState>({
    participantName: '',
    participantId: '',
    status: 'absent',
    note: '',
  });
  const liveSyncIntervalMs = 15000;
  const calendarYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 41 }, (_, index) => currentYear - 20 + index);
  }, []);
  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'Jan' },
      { value: 2, label: 'Feb' },
      { value: 3, label: 'Mar' },
      { value: 4, label: 'Apr' },
      { value: 5, label: 'May' },
      { value: 6, label: 'Jun' },
      { value: 7, label: 'Jul' },
      { value: 8, label: 'Aug' },
      { value: 9, label: 'Sep' },
      { value: 10, label: 'Oct' },
      { value: 11, label: 'Nov' },
      { value: 12, label: 'Dec' },
    ],
    []
  );
  const copiedFieldTimeoutRef = useRef<number | null>(null);

  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await fetchSchoolScheduleSessions();
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load school schedule workspace.';
      setNotice(message);
      // Keep local seed data as a safe fallback in local-dev when API is temporarily down.
      setSessions((current) => (current.length > 0 ? current : buildSeedSchedule()));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTeacherRoster = useCallback(async () => {
    setIsTeacherLoading(true);
    try {
      const payload = await fetchSchoolTeachers({
        search: teacherSearch.trim() || undefined,
        includeInactive: true,
      });
      setTeacherRoster(Array.isArray(payload.teachers) ? payload.teachers : []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load the teacher roster right now.';
      setTeacherNotice(message);
    } finally {
      setIsTeacherLoading(false);
    }
  }, [teacherSearch]);

  const refreshInviteActivity = useCallback(async () => {
    setIsInviteActivityLoading(true);
    try {
      const payload = await fetchSchoolScheduleNotifications();
      const events = (payload.notifications || [])
        .filter(
          (item) =>
            item.kind === 'teacher_invite' ||
            item.kind === 'class_assignment' ||
            item.kind === 'teacher_access_accepted'
        )
        .slice(0, 10);
      setInviteActivity(events);
    } catch {
      // Keep previous activity when notification feed is unavailable.
    } finally {
      setIsInviteActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    void refreshTeacherRoster();
  }, [refreshTeacherRoster]);

  useEffect(() => {
    void refreshInviteActivity();
  }, [refreshInviteActivity]);

  useEffect(() => {
    const refreshLiveState = () => {
      void refreshTeacherRoster();
      void refreshInviteActivity();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveState();
      }
    };

    const onWindowFocus = () => {
      refreshLiveState();
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      refreshLiveState();
    }, liveSyncIntervalMs);

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [liveSyncIntervalMs, refreshInviteActivity, refreshTeacherRoster]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!teacherNotice) {
      return;
    }
    const timer = window.setTimeout(() => setTeacherNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [teacherNotice]);

  useEffect(() => {
    if (!highlightedSessionId) {
      return;
    }
    const timer = window.setTimeout(() => setHighlightedSessionId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedSessionId]);

  useEffect(() => {
    const routeState = (location.state || null) as SchoolScheduleRouteState | null;
    if (!routeState) {
      return;
    }

    let shouldClearState = false;

    if (routeState.openCreate) {
      setIsCreateOpen(true);
      shouldClearState = true;
    }

    if (routeState.highlightSessionId) {
      setViewMode('list');
      setFilter('all');
      setSearchQuery('');
      setHighlightedSessionId(routeState.highlightSessionId);
      shouldClearState = true;
    }

    const invited = routeState.inviteTeacher;
    if (invited?.email && !hasConsumedInvite.current) {
      hasConsumedInvite.current = true;
      setTeacherForm({
        name: String(invited.name || '').trim(),
        email: String(invited.email || '').trim().toLowerCase(),
        department: String(invited.department || '').trim(),
        classGroup: String(invited.classGroup || '').trim(),
        subjectFocus: String(invited.subjectFocus || '').trim(),
      });
      setTeacherNotice(
        `Tutor ${invited.name || invited.email} selected from directory. Review details and click "Add teacher".`
      );
      shouldClearState = true;
    }

    if (shouldClearState) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const scheduleStats = useMemo(() => {
    const now = Date.now();
    const counts = {
      all: sessions.length,
      live: 0,
      upcoming: 0,
      completed: 0,
    };
    sessions.forEach((session) => {
      const status = getSessionStatus(session, now);
      counts[status] += 1;
    });
    return counts;
  }, [sessions]);

  const nextScheduledSession = useMemo(() => {
    const now = Date.now();
    return (
      sessions
        .filter((session) => getSessionStatus(session, now) !== 'completed')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] || null
    );
  }, [sessions]);

  const todayScheduleCount = useMemo(() => {
    const todayKey = getLocalDayKey(new Date());
    return sessions.filter((session) => getLocalDayKey(session.startAt) === todayKey).length;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    return sessions
      .filter((session) => {
        const status = getSessionStatus(session, now);
        if (filter !== 'all' && status !== filter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          session.title.toLowerCase().includes(query) ||
          session.subject.toLowerCase().includes(query) ||
          session.instructor.toLowerCase().includes(query) ||
          session.roomCode.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [filter, searchQuery, sessions]);

  const attendanceReportCandidateSessions = useMemo(() => {
    const startBoundary = attendanceReportStartDate ? new Date(`${attendanceReportStartDate}T00:00:00`) : null;
    const endBoundary = attendanceReportEndDate ? new Date(`${attendanceReportEndDate}T23:59:59.999`) : null;

    return filteredSessions.filter((session) => {
      const sessionStartMs = new Date(session.startAt).getTime();
      if (!Number.isFinite(sessionStartMs)) {
        return false;
      }
      if (startBoundary && sessionStartMs < startBoundary.getTime()) {
        return false;
      }
      if (endBoundary && sessionStartMs > endBoundary.getTime()) {
        return false;
      }
      return true;
    });
  }, [attendanceReportEndDate, attendanceReportStartDate, filteredSessions]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    return teacherRoster
      .filter((teacher) => {
        if (teacherInviteFilter === 'all') {
          return true;
        }
        return teacherInviteStatusLabel(teacher).toLowerCase() === teacherInviteFilter;
      })
      .filter((teacher) => {
        if (!query) {
          return true;
        }
        return (
          teacher.name.toLowerCase().includes(query) ||
          teacher.email.toLowerCase().includes(query) ||
          (teacher.department || '').toLowerCase().includes(query) ||
          (teacher.classGroup || '').toLowerCase().includes(query) ||
          (teacher.subjectFocus || '').toLowerCase().includes(query)
        );
      });
  }, [teacherInviteFilter, teacherRoster, teacherSearch]);

  const teacherInsights = useMemo(() => {
    const now = Date.now();
    const nextWeekMs = now + 1000 * 60 * 60 * 24 * 7;
    const map = new Map<
      string,
      {
        liveCount: number;
        upcomingCount: number;
        weekCount: number;
        nextSession: SchoolScheduleSession | null;
      }
    >();

    teacherRoster.forEach((teacher) => {
      map.set(teacher.email, {
        liveCount: 0,
        upcomingCount: 0,
        weekCount: 0,
        nextSession: null,
      });
    });

    sessions.forEach((session) => {
      const assignedEmail = normalizeScheduleCompareLabel(session.assignedTutorEmail);
      if (!assignedEmail) {
        return;
      }

      const insight = map.get(assignedEmail) || {
        liveCount: 0,
        upcomingCount: 0,
        weekCount: 0,
        nextSession: null,
      };
      const status = getSessionStatus(session, now);
      const startMs = new Date(session.startAt).getTime();

      if (status === 'live') {
        insight.liveCount += 1;
      }
      if (status === 'upcoming') {
        insight.upcomingCount += 1;
        if (Number.isFinite(startMs) && startMs <= nextWeekMs) {
          insight.weekCount += 1;
        }
        if (
          !insight.nextSession ||
          new Date(insight.nextSession.startAt).getTime() > startMs
        ) {
          insight.nextSession = session;
        }
      }

      map.set(assignedEmail, insight);
    });

    return map;
  }, [sessions, teacherRoster]);

  const teacherRosterStats = useMemo(() => {
    let activeCount = 0;
    let acceptedCount = 0;
    let liveCount = 0;
    let weekLoadCount = 0;

    teacherRoster.forEach((teacher) => {
      if (teacher.isActive) {
        activeCount += 1;
      }
      if (teacher.inviteStatus === 'accepted') {
        acceptedCount += 1;
      }
      const insight = teacherInsights.get(teacher.email);
      if (insight) {
        if (insight.liveCount > 0) {
          liveCount += 1;
        }
        if (insight.weekCount > 0) {
          weekLoadCount += 1;
        }
      }
    });

    return {
      total: teacherRoster.length,
      activeCount,
      acceptedCount,
      liveCount,
      weekLoadCount,
    };
  }, [teacherInsights, teacherRoster]);

  const selectedAssignedTeacher = useMemo(() => {
    const selectedEmail = normalizeScheduleCompareLabel(formState.assignedTutorEmail);
    if (!selectedEmail) {
      return null;
    }
    return (
      teacherRoster.find((teacher) => normalizeScheduleCompareLabel(teacher.email) === selectedEmail) ||
      null
    );
  }, [formState.assignedTutorEmail, teacherRoster]);

  const selectedTeacherInsight = useMemo(() => {
    if (!selectedAssignedTeacher) {
      return null;
    }
    return teacherInsights.get(selectedAssignedTeacher.email) || null;
  }, [selectedAssignedTeacher, teacherInsights]);

  const timetableTeacherInsight = useMemo(() => {
    if (!timetableTeacher) {
      return null;
    }
    return teacherInsights.get(timetableTeacher.email) || null;
  }, [teacherInsights, timetableTeacher]);

  const timetableTeacherSessions = useMemo(() => {
    if (!timetableTeacher) {
      return [];
    }

    const normalizedTeacherEmail = normalizeScheduleCompareLabel(timetableTeacher.email);
    return sessions
      .filter(
        (session) =>
          normalizeScheduleCompareLabel(session.assignedTutorEmail) === normalizedTeacherEmail
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [sessions, timetableTeacher]);

  const teacherTimetableWeekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(teacherTimetableWeekStart, index);
      return {
        date,
        key: getLocalDayKey(date),
        dayLabel: date.toLocaleDateString([], { weekday: 'short' }),
        dayNumber: date.getDate(),
        monthLabel: date.toLocaleDateString([], { month: 'short' }),
      };
    });
  }, [teacherTimetableWeekStart]);

  const teacherTimetableWeekSessionsByDay = useMemo(() => {
    const dayKeys = new Set(teacherTimetableWeekDays.map((day) => day.key));
    const grouped: Record<string, SchoolScheduleSession[]> = {};

    teacherTimetableWeekDays.forEach((day) => {
      grouped[day.key] = [];
    });

    timetableTeacherSessions.forEach((session) => {
      const dayKey = getLocalDayKey(session.startAt);
      if (!dayKey || !dayKeys.has(dayKey)) {
        return;
      }
      grouped[dayKey].push(session);
    });

    Object.keys(grouped).forEach((dayKey) => {
      grouped[dayKey].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    });

    return grouped;
  }, [teacherTimetableWeekDays, timetableTeacherSessions]);

  const visibleTeacherWeekSessions = useMemo(
    () =>
      teacherTimetableWeekDays.flatMap((day) =>
        (teacherTimetableWeekSessionsByDay[day.key] || []).map((session) => ({ day, session }))
      ),
    [teacherTimetableWeekDays, teacherTimetableWeekSessionsByDay]
  );

  const scheduleConflictPreview = useMemo(() => {
    const startAt = formState.startAt.trim();
    const durationMinutes = Number(formState.durationMinutes);
    const startDate = new Date(startAt);
    if (!startAt || Number.isNaN(startDate.getTime()) || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return [];
    }

    const endMs = startDate.getTime() + durationMinutes * 60 * 1000;
    const normalizedInstructor = normalizeScheduleCompareLabel(formState.instructor);
    const normalizedAssignedTutorEmail = normalizeScheduleCompareLabel(formState.assignedTutorEmail);
    const normalizedAudience = normalizeScheduleCompareLabel(
      formState.audienceTag || [formState.department, formState.classGroup].filter(Boolean).join(' • ')
    );

    return sessions
      .map((session) => {
        if (editingSessionId && session.id === editingSessionId) {
          return null;
        }

        const sessionStartMs = new Date(session.startAt).getTime();
        const sessionEndMs = new Date(session.endAt).getTime();
        if (
          !Number.isFinite(sessionStartMs) ||
          !Number.isFinite(sessionEndMs) ||
          sessionStartMs >= endMs ||
          sessionEndMs <= startDate.getTime()
        ) {
          return null;
        }

        const reasons: string[] = [];
        if (
          normalizedInstructor &&
          normalizeScheduleCompareLabel(session.instructor) === normalizedInstructor
        ) {
          reasons.push('same instructor');
        }
        if (
          normalizedAssignedTutorEmail &&
          normalizeScheduleCompareLabel(session.assignedTutorEmail) === normalizedAssignedTutorEmail
        ) {
          reasons.push('same assigned teacher');
        }
        if (
          normalizedAudience &&
          normalizeScheduleCompareLabel(getSessionAudienceLabel(session)) === normalizedAudience
        ) {
          reasons.push('same class audience');
        }

        if (reasons.length === 0) {
          return null;
        }

        return {
          session,
          reasons,
        };
      })
      .filter(
        (
          item
        ): item is {
          session: SchoolScheduleSession;
          reasons: string[];
        } => Boolean(item)
      )
      .slice(0, 3);
  }, [editingSessionId, formState, sessions]);

  const scheduleConflictSummary = useMemo(
    () =>
      scheduleConflictPreview.reduce(
        (summary, item) => {
          if (item.reasons.includes('same instructor')) {
            summary.instructor += 1;
          }
          if (item.reasons.includes('same assigned teacher')) {
            summary.teacher += 1;
          }
          if (item.reasons.includes('same class audience')) {
            summary.audience += 1;
          }
          return summary;
        },
        {
          instructor: 0,
          teacher: 0,
          audience: 0,
        }
      ),
    [scheduleConflictPreview]
  );

  const filteredInviteActivity = useMemo(() => {
    return inviteActivity.filter((event) => {
      if (inviteActivityFilter === 'accepted') {
        return event.kind === 'teacher_access_accepted';
      }
      if (inviteActivityFilter === 'pending') {
        return event.kind === 'teacher_invite' || event.kind === 'class_assignment';
      }
      return true;
    });
  }, [inviteActivity, inviteActivityFilter]);

  const acceptedInviteBySessionId = useMemo(() => {
    const map = new Map<string, SchoolScheduleNotification>();
    inviteActivity
      .filter((event) => event.kind === 'teacher_access_accepted')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((event) => {
        if (!map.has(event.sessionId)) {
          map.set(event.sessionId, event);
        }
      });
    return map;
  }, [inviteActivity]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(weekStartDate, index);
      return {
        date,
        key: getLocalDayKey(date),
        dayLabel: date.toLocaleDateString([], { weekday: 'short' }),
        dayNumber: date.getDate(),
        monthLabel: date.toLocaleDateString([], { month: 'short' }),
      };
    });
  }, [weekStartDate]);

  const weekSessionsByDay = useMemo(() => {
    const weekDaySet = new Set(weekDays.map((day) => day.key));
    const grouped: Record<string, SchoolScheduleSession[]> = {};
    weekDays.forEach((day) => {
      grouped[day.key] = [];
    });

    filteredSessions.forEach((session) => {
      const dayKey = getLocalDayKey(session.startAt);
      if (!dayKey || !weekDaySet.has(dayKey)) {
        return;
      }
      grouped[dayKey].push(session);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    });

    return grouped;
  }, [filteredSessions, weekDays]);

  const visibleWeekSessions = useMemo(
    () =>
      weekDays.flatMap((day) => (weekSessionsByDay[day.key] || []).map((session) => ({ day, session }))),
    [weekDays, weekSessionsByDay]
  );

  const bulkRescheduleCandidates = useMemo(
    () =>
      visibleWeekSessions
        .map(({ session }) => session)
        .filter((session) => getSessionStatus(session, Date.now()) !== 'completed'),
    [visibleWeekSessions]
  );

  const bulkReschedulePreview = useMemo(() => {
    const shiftDays = Number.parseInt(bulkRescheduleDays, 10);
    if (!Number.isFinite(shiftDays) || shiftDays === 0 || bulkRescheduleCandidates.length === 0) {
      return [];
    }

    const candidateIds = new Set(bulkRescheduleCandidates.map((session) => session.id));
    const otherSessions = sessions.filter((session) => !candidateIds.has(session.id));

    return bulkRescheduleCandidates
      .map((session) => {
        const shiftedStart = addDays(new Date(session.startAt), shiftDays);
        const shiftedEnd = addDays(new Date(session.endAt), shiftDays);
        const shiftedStartMs = shiftedStart.getTime();
        const shiftedEndMs = shiftedEnd.getTime();

        if (!Number.isFinite(shiftedStartMs) || !Number.isFinite(shiftedEndMs)) {
          return null;
        }

        const conflicts = otherSessions
          .map((otherSession) => {
            const otherStartMs = new Date(otherSession.startAt).getTime();
            const otherEndMs = new Date(otherSession.endAt).getTime();
            if (
              !Number.isFinite(otherStartMs) ||
              !Number.isFinite(otherEndMs) ||
              otherStartMs >= shiftedEndMs ||
              otherEndMs <= shiftedStartMs
            ) {
              return null;
            }

            const reasons: string[] = [];
            if (
              normalizeScheduleCompareLabel(otherSession.instructor) ===
              normalizeScheduleCompareLabel(session.instructor)
            ) {
              reasons.push('same instructor');
            }
            if (
              normalizeScheduleCompareLabel(otherSession.roomCode) ===
              normalizeScheduleCompareLabel(session.roomCode)
            ) {
              reasons.push('same room');
            }
            if (
              normalizeScheduleCompareLabel(otherSession.assignedTutorEmail) ===
              normalizeScheduleCompareLabel(session.assignedTutorEmail)
            ) {
              reasons.push('same assigned teacher');
            }
            if (
              normalizeScheduleCompareLabel(getSessionAudienceLabel(otherSession)) ===
              normalizeScheduleCompareLabel(getSessionAudienceLabel(session))
            ) {
              reasons.push('same class audience');
            }

            if (reasons.length === 0) {
              return null;
            }

            return {
              session: otherSession,
              reasons,
            };
          })
          .filter(
            (
              item
            ): item is {
              session: SchoolScheduleSession;
              reasons: string[];
            } => Boolean(item)
          )
          .slice(0, 3);

        if (conflicts.length === 0) {
          return null;
        }

        return {
          session,
          shiftedStart,
          conflicts,
        };
      })
      .filter(
        (
          item
        ): item is {
          session: SchoolScheduleSession;
          shiftedStart: Date;
          conflicts: Array<{
            session: SchoolScheduleSession;
            reasons: string[];
          }>;
        } => Boolean(item)
      )
      .slice(0, 4);
  }, [bulkRescheduleCandidates, bulkRescheduleDays, sessions]);

  const resetForm = () => {
    setFormState({
      title: '',
      subject: '',
      instructor: '',
      assignedTutorEmail: '',
      assignedTutorName: '',
      department: '',
      classGroup: '',
      audienceTag: '',
      startAt: '',
      durationMinutes: '60',
      expectedStudents: '',
      attendanceGracePeriodMinutes: String(DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES),
      notes: '',
    });
    setEditingSessionId(null);
    setSessionDraftMode('create');
    setSessionDraftOrigin(null);
  };

  const resetTeacherForm = () => {
    setTeacherForm({
      name: '',
      email: '',
      department: '',
      classGroup: '',
      subjectFocus: '',
    });
    setEditingTeacherId(null);
  };

  const copyTextToClipboard = async (value: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return false;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalized);
      return true;
    }

    return false;
  };

  const showCopiedFeedback = useCallback((key: string) => {
    setCopiedFieldKey(key);
    if (copiedFieldTimeoutRef.current !== null) {
      window.clearTimeout(copiedFieldTimeoutRef.current);
    }
    copiedFieldTimeoutRef.current = window.setTimeout(() => {
      setCopiedFieldKey((current) => (current === key ? null : current));
      copiedFieldTimeoutRef.current = null;
    }, 1800);
  }, []);

  const handleCopyField = useCallback(
    async (key: string, value: string, successMessage: string) => {
      const copied = await copyTextToClipboard(value);
      setNotice(copied ? successMessage : 'Clipboard is unavailable right now.');
      if (copied) {
        showCopiedFeedback(key);
      }
      return copied;
    },
    [showCopiedFeedback]
  );

  useEffect(() => {
    return () => {
      if (copiedFieldTimeoutRef.current !== null) {
        window.clearTimeout(copiedFieldTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveSession = async () => {
    if (activeActionId) {
      return;
    }

    const title = formState.title.trim();
    const subject = formState.subject.trim();
    const instructor = formState.instructor.trim();
    const startAt = formState.startAt.trim();
    const durationMinutes = Number(formState.durationMinutes);
    const expectedStudents = Number(formState.expectedStudents);
    const attendanceGracePeriodMinutes = Number(formState.attendanceGracePeriodMinutes);

    if (!title || !subject || !instructor || !startAt) {
      setNotice('Please complete title, subject, instructor, and start time before saving.');
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setNotice('Class duration should be a valid number of minutes.');
      return;
    }

    if (
      !Number.isFinite(attendanceGracePeriodMinutes) ||
      attendanceGracePeriodMinutes <= 0 ||
      attendanceGracePeriodMinutes > 60
    ) {
      setNotice('Attendance grace period should be between 1 and 60 minutes.');
      return;
    }

    const startDate = new Date(startAt);
    if (Number.isNaN(startDate.getTime())) {
      setNotice('Please choose a valid date and time for this class.');
      return;
    }

    setActiveActionId('save-session');
    try {
      const sessionInput = {
        title,
        subject,
        instructor,
        startAt: startDate.toISOString(),
        durationMinutes: Math.round(durationMinutes),
        expectedStudents:
          Number.isFinite(expectedStudents) && expectedStudents >= 0
            ? Math.round(expectedStudents)
            : 0,
        attendanceGracePeriodMinutes: Math.round(attendanceGracePeriodMinutes),
        notes: formState.notes.trim() || undefined,
        assignedTutorEmail: formState.assignedTutorEmail.trim() || undefined,
        assignedTutorName: formState.assignedTutorName.trim() || undefined,
        department: formState.department.trim() || undefined,
        classGroup: formState.classGroup.trim() || undefined,
        audienceTag: formState.audienceTag.trim() || undefined,
      };

      if (editingSessionId) {
        const payload = await updateSchoolScheduleSession(editingSessionId, {
          ...sessionInput,
          notes: formState.notes.trim() || null,
          assignedTutorEmail: formState.assignedTutorEmail.trim() || null,
          assignedTutorName: formState.assignedTutorName.trim() || null,
          department: formState.department.trim() || null,
          classGroup: formState.classGroup.trim() || null,
          audienceTag: formState.audienceTag.trim() || null,
        });

        if (payload?.session) {
          setSessions((current) =>
            current
              .map((session) => (session.id === payload.session.id ? payload.session : session))
              .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
          );
          setHighlightedSessionId(payload.session.id);
        } else {
          await refreshSessions();
        }

        resetForm();
        setIsCreateOpen(false);
        setNotice(payload.message || 'Class updated successfully.');
        void refreshInviteActivity();
      } else {
        const payload = await createSchoolScheduleSession(sessionInput);

        if (payload?.session) {
          setSessions((current) =>
            [payload.session, ...current].sort(
              (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
            )
          );
        } else {
          await refreshSessions();
        }

        resetForm();
        setIsCreateOpen(false);
        const teacherAccessLines = [
          payload?.session?.id ? `Session ID: ${payload.session.id}` : '',
          payload?.session?.tutorJoinLink ? `Teacher link: ${payload.session.tutorJoinLink}` : '',
          payload?.session?.tutorAccessCode ? `Teacher code: ${payload.session.tutorAccessCode}` : '',
        ].filter(Boolean);
        if (teacherAccessLines.length > 0) {
          const copied = await copyTextToClipboard(teacherAccessLines.join('\n'));
          if (copied) {
            setNotice(
              'Class scheduled. Teacher link + access code copied. Share it with the assigned teacher.'
            );
            void refreshInviteActivity();
            return;
          }
        }
        const inviteChannelLabel =
          payload?.classInvite?.channel === 'both'
            ? 'In-app + Email'
            : payload?.classInvite?.channel === 'in_app'
              ? 'In-app'
              : payload?.classInvite?.channel === 'email'
                ? 'Email'
                : '';
        const inviteSummary = payload?.classInvite
          ? ` Invite channel: ${inviteChannelLabel || 'N/A'}. ${payload.classInvite.note || ''}`.trim()
          : '';
        setNotice(
          `${payload?.message || 'Class added to your schedule successfully.'}${inviteSummary}`
        );
        void refreshInviteActivity();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingSessionId
            ? 'Could not update this class schedule right now.'
            : 'Could not create this class schedule right now.';
      setNotice(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleStartAtYearChange = (yearText: string) => {
    const selectedYear = Number.parseInt(yearText, 10);
    if (!Number.isFinite(selectedYear)) {
      return;
    }

    setFormState((prev) => {
      if (!prev.startAt) {
        const now = new Date();
        now.setFullYear(selectedYear);
        const isoValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16);
        return { ...prev, startAt: isoValue };
      }

      const parsed = new Date(prev.startAt);
      if (Number.isNaN(parsed.getTime())) {
        return prev;
      }

      parsed.setFullYear(selectedYear);
      const normalized = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
      return { ...prev, startAt: normalized };
    });
  };

  const handleStartAtMonthChange = (monthText: string) => {
    const selectedMonth = Number.parseInt(monthText, 10);
    if (!Number.isFinite(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
      return;
    }

    setFormState((prev) => {
      if (!prev.startAt) {
        const now = new Date();
        now.setMonth(selectedMonth - 1);
        const isoValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16);
        return { ...prev, startAt: isoValue };
      }

      const parsed = new Date(prev.startAt);
      if (Number.isNaN(parsed.getTime())) {
        return prev;
      }

      parsed.setMonth(selectedMonth - 1);
      const normalized = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
      return { ...prev, startAt: normalized };
    });
  };

  const handleCreateTeacher = async () => {
    if (isTeacherSubmitting) {
      return;
    }

    const name = teacherForm.name.trim();
    const email = teacherForm.email.trim().toLowerCase();

    if (!name || !email || !email.includes('@')) {
      setTeacherNotice('Please enter a teacher name and email address.');
      return;
    }

    setIsTeacherSubmitting(true);
    try {
      if (editingTeacherId) {
        const payload = await updateSchoolTeacher(editingTeacherId, {
          name,
          email,
          department: teacherForm.department.trim() || null,
          classGroup: teacherForm.classGroup.trim() || null,
          subjectFocus: teacherForm.subjectFocus.trim() || null,
        });
        setTeacherRoster(payload.teachers || []);
        resetTeacherForm();
        setTeacherNotice(payload.message || 'Teacher profile updated.');
      } else {
        const payload = await createSchoolTeacher({
          name,
          email,
          department: teacherForm.department.trim() || undefined,
          classGroup: teacherForm.classGroup.trim() || undefined,
          subjectFocus: teacherForm.subjectFocus.trim() || undefined,
          isActive: true,
        });
        setTeacherRoster(payload.teachers || []);
        resetTeacherForm();
        setTeacherNotice([payload.message, payload.invite?.note].filter(Boolean).join(' '));
      }
      void refreshInviteActivity();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : editingTeacherId
            ? 'Could not update this teacher right now.'
            : 'Could not add this teacher right now.';
      setTeacherNotice(message);
    } finally {
      setIsTeacherSubmitting(false);
    }
  };

  const handleEditTeacher = (teacher: SchoolTeacherRosterItem) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      department: teacher.department || '',
      classGroup: teacher.classGroup || '',
      subjectFocus: teacher.subjectFocus || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleTeacher = async (teacher: SchoolTeacherRosterItem) => {
    if (activeTeacherActionId) {
      return;
    }

    setActiveTeacherActionId(`toggle-${teacher.id}`);
    try {
      const payload = await updateSchoolTeacher(teacher.id, {
        isActive: !teacher.isActive,
      });
      setTeacherRoster(payload.teachers || []);
      setTeacherNotice(
        teacher.isActive ? 'Teacher set to inactive.' : 'Teacher reactivated.'
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update teacher status.';
      setTeacherNotice(message);
    } finally {
      setActiveTeacherActionId(null);
    }
  };

  const handleRemoveTeacher = async (teacher: SchoolTeacherRosterItem) => {
    if (activeTeacherActionId) {
      return;
    }

    setActiveTeacherActionId(`remove-${teacher.id}`);
    try {
      const payload = await deleteSchoolTeacher(teacher.id);
      setTeacherRoster(payload.teachers || []);
      setTeacherNotice(payload.message || 'Teacher removed from roster.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not remove this teacher right now.';
      setTeacherNotice(message);
    } finally {
      setActiveTeacherActionId(null);
    }
  };

  const handleResendTeacherInvite = async (teacher: SchoolTeacherRosterItem) => {
    if (activeTeacherActionId) {
      return;
    }

    if (!teacher.isActive) {
      setTeacherNotice('Activate this teacher before resending invite.');
      return;
    }

    setActiveTeacherActionId(`invite-${teacher.id}`);
    try {
      const payload = await resendSchoolTeacherInvite(teacher.id);
      setTeacherRoster(payload.teachers || []);
      setTeacherNotice([payload.message, payload.invite?.note].filter(Boolean).join(' '));
      void refreshInviteActivity();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not resend invite right now.';
      setTeacherNotice(message);
    } finally {
      setActiveTeacherActionId(null);
    }
  };

  const handleResendPendingInvites = async () => {
    if (activeTeacherActionId) {
      return;
    }

    const pending = teacherRoster.filter(
      (teacher) => teacher.isActive && teacher.inviteStatus === 'invited'
    );
    if (pending.length === 0) {
      setTeacherNotice('No pending invited teachers to resend right now.');
      return;
    }

    setActiveTeacherActionId('bulk-invite');
    let successful = 0;
    let failed = 0;

    for (const teacher of pending) {
      try {
        const payload = await resendSchoolTeacherInvite(teacher.id);
        setTeacherRoster(payload.teachers || []);
        successful += 1;
      } catch {
        failed += 1;
      }
    }

    setActiveTeacherActionId(null);
    if (failed > 0) {
      setTeacherNotice(`Resent ${successful} invite(s), ${failed} failed. You can retry failed ones.`);
      return;
    }
    setTeacherNotice(`Successfully resent ${successful} pending invite(s).`);
  };

  const handleExportInvitedTeachersCsv = () => {
    const invitedTeachers = teacherRoster.filter(
      (teacher) => teacher.isActive && teacher.inviteStatus === 'invited'
    );
    if (invitedTeachers.length === 0) {
      setTeacherNotice('No invited teachers available to export.');
      return;
    }

    const toCsvCell = (value: unknown) => {
      const text = String(value ?? '').replace(/"/g, '""');
      return `"${text}"`;
    };

    const headers = [
      'Teacher Name',
      'Teacher Email',
      'Department',
      'Class Group',
      'Subject Focus',
      'Invite Status',
      'Invite Channel',
      'Delivery Status',
      'Invite Sent At',
      'Accepted At',
      'Delivery Note',
    ];

    const rows = invitedTeachers.map((teacher) => [
      teacher.name,
      teacher.email,
      teacher.department || '',
      teacher.classGroup || '',
      teacher.subjectFocus || '',
      teacher.inviteStatus,
      teacher.lastInviteChannel || '',
      teacher.lastInviteDeliveryStatus || '',
      teacher.lastInviteSentAt || '',
      teacher.acceptedAt || '',
      teacher.lastInviteDeliveryNote || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => toCsvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `school-invited-teachers-${stamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setTeacherNotice(`Exported ${invitedTeachers.length} invited teacher(s) to CSV.`);
  };

  const handleAssignTeacherToClass = (teacher: SchoolTeacherRosterItem) => {
    setFormState((prev) => ({
      ...prev,
      instructor: teacher.name || prev.instructor,
      assignedTutorName: teacher.name || prev.assignedTutorName,
      assignedTutorEmail: teacher.email || prev.assignedTutorEmail,
      department: teacher.department || prev.department,
      classGroup: teacher.classGroup || prev.classGroup,
      audienceTag: prev.audienceTag,
    }));
    setEditingSessionId(null);
    setSessionDraftMode('create');
    setSessionDraftOrigin(null);
    setIsCreateOpen(true);
  };

  const openTeacherTimetable = (teacher: SchoolTeacherRosterItem) => {
    setTimetableTeacher(teacher);
    setTeacherTimetableWeekStart(startOfWeek(new Date()));
  };

  const closeTeacherTimetable = () => {
    setTimetableTeacher(null);
  };

  const shiftTeacherTimetableWeek = (direction: -1 | 1) => {
    setTeacherTimetableWeekStart((current) => addDays(current, direction * 7));
  };

  const handleExportTeacherTimetableCsv = () => {
    if (!timetableTeacher || teacherTimetableExportAction || visibleTeacherWeekSessions.length === 0) {
      return;
    }

    setTeacherTimetableExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Teacher Timetable', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow(['Teacher Timetable', 'Teacher', timetableTeacher.name]),
        joinCsvRow(['Teacher Timetable', 'Teacher Email', timetableTeacher.email]),
        joinCsvRow(['Teacher Timetable', 'Week Range', formatWeekRangeLabel(teacherTimetableWeekStart)]),
        joinCsvRow(['Teacher Timetable', 'Classes Exported', visibleTeacherWeekSessions.length]),
        '',
        joinCsvRow(['Day', 'Date', 'Time', 'Class Title', 'Subject', 'Audience', 'Room', 'Status']),
      ];

      visibleTeacherWeekSessions.forEach(({ day, session }) => {
        lines.push(
          joinCsvRow([
            day.dayLabel,
            new Date(session.startAt).toLocaleDateString(),
            `${formatSessionTime(session.startAt)} - ${formatSessionTime(session.endAt)}`,
            session.title,
            session.subject,
            getSessionAudienceLabel(session),
            session.roomCode,
            statusLabel(getSessionStatus(session, Date.now())),
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-teacher-timetable-${dateStamp}.csv`
      );
      setNotice('Teacher timetable CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Teacher timetable CSV export failed.');
    } finally {
      setTeacherTimetableExportAction(null);
    }
  };

  const handleExportTeacherTimetablePdf = async () => {
    if (!timetableTeacher || teacherTimetableExportAction || visibleTeacherWeekSessions.length === 0) {
      return;
    }

    setTeacherTimetableExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const reportFrame = buildSchoolReportFrame({
        title: `${timetableTeacher.name} Weekly Timetable`,
        subtitle: formatWeekRangeLabel(teacherTimetableWeekStart),
        metaLines: [
          `Teacher email: ${timetableTeacher.email}`,
          `Classes shown: ${visibleTeacherWeekSessions.length}`,
        ],
        documentLabel: 'Teacher timetable export',
        documentCode: `TEACHER-TIMETABLE-${dateStamp.replaceAll('-', '')}`,
        leftSignatoryRole: 'Prepared by',
        rightSignatoryRole: 'Teacher record',
      });

      const tableBody: Array<Array<string>> = [
        ['Day', 'Date', 'Time', 'Class', 'Audience', 'Room', 'Status'],
        ...visibleTeacherWeekSessions.map(({ day, session }) => [
          day.dayLabel,
          new Date(session.startAt).toLocaleDateString(),
          `${formatSessionTime(session.startAt)} - ${formatSessionTime(session.endAt)}`,
          `${session.title}\n${session.subject}`,
          getSessionAudienceLabel(session),
          session.roomCode,
          statusLabel(getSessionStatus(session, Date.now())),
        ]),
      ];

      const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [28, 36, 28, 28],
        header: () => ({
          margin: [28, 24, 28, 0],
          stack: reportFrame.headerContent,
        }),
        footer: reportFrame.footer,
        content: [
          {
            text: 'This export reflects the teacher timetable currently visible in the school schedule workspace.',
            style: 'muted',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              headerRows: 1,
              widths: [42, 58, 72, '*', 100, 62, 58],
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
          ...reportFrame.signOffContent,
        ],
        styles: {
          ...schoolReportStyles,
          header: { fontSize: 17, bold: true, margin: [0, 0, 0, 6] },
          subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
          sectionHeader: { fontSize: 12, bold: true, margin: [0, 8, 0, 6] },
          muted: { fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 2] },
        },
      } as Record<string, unknown>;

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-teacher-timetable-${dateStamp}.pdf`);
      setNotice('Teacher timetable PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Teacher timetable PDF export failed.');
    } finally {
      setTeacherTimetableExportAction(null);
    }
  };

  const handleEditSession = (session: SchoolScheduleSession) => {
    setEditingSessionId(session.id);
    setSessionDraftMode('edit');
    setSessionDraftOrigin({
      id: session.id,
      title: session.title,
      startAt: session.startAt,
    });
    setFormState({
      title: session.title || '',
      subject: session.subject || '',
      instructor: session.instructor || '',
      assignedTutorEmail: session.assignedTutorEmail || '',
      assignedTutorName: session.assignedTutorName || '',
      department: session.department || '',
      classGroup: session.classGroup || '',
      audienceTag: session.audienceTag || '',
      startAt: formatDateTimeInputValue(session.startAt),
      durationMinutes: String(session.durationMinutes || 60),
      expectedStudents: String(session.expectedStudents ?? ''),
      attendanceGracePeriodMinutes: String(
        session.attendanceWindow?.gracePeriodMinutes || DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES
      ),
      notes: session.notes || '',
    });
    closeTeacherTimetable();
    setIsCreateOpen(true);
  };

  const handleRescheduleSession = (session: SchoolScheduleSession) => {
    setEditingSessionId(session.id);
    setSessionDraftMode('reschedule');
    setSessionDraftOrigin({
      id: session.id,
      title: session.title,
      startAt: session.startAt,
    });
    setFormState({
      title: session.title || '',
      subject: session.subject || '',
      instructor: session.instructor || '',
      assignedTutorEmail: session.assignedTutorEmail || '',
      assignedTutorName: session.assignedTutorName || '',
      department: session.department || '',
      classGroup: session.classGroup || '',
      audienceTag: session.audienceTag || '',
      startAt: formatDateTimeInputValue(session.startAt),
      durationMinutes: String(session.durationMinutes || 60),
      expectedStudents: String(session.expectedStudents ?? ''),
      attendanceGracePeriodMinutes: String(
        session.attendanceWindow?.gracePeriodMinutes || DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES
      ),
      notes: session.notes || '',
    });
    closeTeacherTimetable();
    setIsCreateOpen(true);
    setNotice('Update the class date or time, then save to reschedule it.');
  };

  const handleDuplicateSession = (session: SchoolScheduleSession) => {
    const sourceStart = new Date(session.startAt);
    const duplicateStart = Number.isNaN(sourceStart.getTime())
      ? ''
      : formatDateTimeInputValue(addDays(sourceStart, 7).toISOString());

    setEditingSessionId(null);
    setSessionDraftMode('duplicate');
    setSessionDraftOrigin({
      id: session.id,
      title: session.title,
      startAt: session.startAt,
    });
    setFormState({
      title: session.title || '',
      subject: session.subject || '',
      instructor: session.instructor || '',
      assignedTutorEmail: session.assignedTutorEmail || '',
      assignedTutorName: session.assignedTutorName || '',
      department: session.department || '',
      classGroup: session.classGroup || '',
      audienceTag: session.audienceTag || '',
      startAt: duplicateStart,
      durationMinutes: String(session.durationMinutes || 60),
      expectedStudents: String(session.expectedStudents ?? ''),
      attendanceGracePeriodMinutes: String(
        session.attendanceWindow?.gracePeriodMinutes || DEFAULT_ATTENDANCE_GRACE_PERIOD_MINUTES
      ),
      notes: session.notes || '',
    });
    closeTeacherTimetable();
    setIsCreateOpen(true);
    setNotice('Class copied into a new draft. Review the date and save when ready.');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`delete-${sessionId}`);
    try {
      await deleteSchoolScheduleSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setNotice('Class removed from schedule.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not remove this class schedule right now.';
      setNotice(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleCopyTeacherAccess = async (sessionId: string) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`teacher-access-${sessionId}`);
    try {
      const payload = await fetchSchoolScheduleTeacherAccess(sessionId);
      const lines = [
        payload.sessionId ? `Session ID: ${payload.sessionId}` : '',
        payload.tutorJoinLink ? `Teacher link: ${payload.tutorJoinLink}` : '',
        payload.tutorAccessCode ? `Teacher code: ${payload.tutorAccessCode}` : '',
      ].filter(Boolean);

      if (lines.length === 0) {
        setNotice('Teacher access has not been generated for this class yet.');
        return;
      }

      const copied = await copyTextToClipboard(lines.join('\n'));
      if (!copied) {
        setNotice('Clipboard is unavailable right now. Please copy manually from the class details.');
        return;
      }

      setNotice('Teacher link and code copied. Share this with the assigned teacher.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load teacher access details right now.';
      setNotice(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleRegenerateTeacherAccess = async (sessionId: string) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`teacher-access-regenerate-${sessionId}`);
    try {
      const payload = await regenerateSchoolScheduleTeacherAccess(sessionId);
      const lines = [
        payload.tutorJoinLink ? `Teacher link: ${payload.tutorJoinLink}` : '',
        payload.tutorAccessCode ? `Teacher code: ${payload.tutorAccessCode}` : '',
      ].filter(Boolean);
      if (lines.length > 0) {
        await copyTextToClipboard(lines.join('\n'));
      }
      setNotice(
        payload.message ||
          'Teacher access has been refreshed. Share the latest link and code with your teacher.'
      );
      await refreshSessions();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not regenerate teacher access right now.';
      setNotice(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const handleStartLiveClass = (session: SchoolScheduleSession) => {
    const classItem = {
      id: session.id,
      code: session.roomCode,
      name: session.title,
      subject: session.subject,
      instructor: session.instructor,
      schedule: formatDateTime(session.startAt),
      students: session.expectedStudents,
      description: session.notes || `Live session for ${session.subject}.`,
      level: 'Intermediate' as const,
      duration: `${session.durationMinutes} mins`,
    };

    navigate(`/live-class/${encodeURIComponent(session.id)}?role=teacher&actor=school`, {
      state: { classItem },
    });
  };

  const handleShareTeacherAccess = async (session: SchoolScheduleSession) => {
    if (activeActionId) {
      return;
    }

    setActiveActionId(`teacher-share-${session.id}`);
    try {
      let joinLink = session.tutorJoinLink || '';
      let accessCode = session.tutorAccessCode || '';

      if (!joinLink || !accessCode) {
        const payload = await fetchSchoolScheduleTeacherAccess(session.id);
        joinLink = payload.tutorJoinLink || joinLink;
        accessCode = payload.tutorAccessCode || accessCode;
      }

      const messageLines = [
        `Class: ${session.title}`,
        `Subject: ${session.subject}`,
        `Session ID: ${session.id}`,
        joinLink ? `Teacher link: ${joinLink}` : '',
        accessCode ? `Teacher access code: ${accessCode}` : '',
      ].filter(Boolean);

      const message = messageLines.join('\n');
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text: message });
        return;
      }

      const copied = await copyTextToClipboard(message);
      if (copied) {
        setNotice('Share message copied. Paste into any app to send.');
      } else {
        setNotice('Share is unavailable. Please copy the details manually.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not prepare share message right now.';
      setNotice(message);
    } finally {
      setActiveActionId(null);
    }
  };

  const loadAttendance = useCallback(async (session: SchoolScheduleSession) => {
    setAttendanceTargetSession(session);
    setIsAttendanceLoading(true);
    setAttendancePayload(null);
    try {
      const payload = await fetchSchoolScheduleAttendance(session.id);
      setAttendancePayload(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load attendance for this class right now.';
      setNotice(message);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, []);

  const handleManualAttendanceSubmit = async () => {
    if (!attendanceTargetSession || attendanceBusyId) {
      return;
    }

    const participantName = attendanceForm.participantName.trim();
    if (!participantName) {
      setNotice('Enter the student name before saving attendance.');
      return;
    }

    setAttendanceBusyId('manual');
    try {
      const payload = await upsertSchoolScheduleAttendance(attendanceTargetSession.id, {
        participantName,
        participantId: attendanceForm.participantId.trim() || undefined,
        status: attendanceForm.status,
        note: attendanceForm.note.trim() || undefined,
      });
      setAttendancePayload(payload.attendance);
      setAttendanceForm({
        participantName: '',
        participantId: '',
        status: 'absent',
        note: '',
      });
      setNotice(payload.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save this attendance update right now.';
      setNotice(message);
    } finally {
      setAttendanceBusyId(null);
    }
  };

  const handleAttendanceStatusUpdate = async (
    record: SchoolScheduleAttendanceRecord,
    status: 'present' | 'absent'
  ) => {
    if (!attendanceTargetSession || attendanceBusyId) {
      return;
    }

    setAttendanceBusyId(record.id);
    try {
      const payload = await updateSchoolScheduleAttendance(attendanceTargetSession.id, record.id, {
        status,
        note: record.note || undefined,
      });
      setAttendancePayload(payload.attendance);
      setNotice(payload.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update this attendance record.';
      setNotice(message);
    } finally {
      setAttendanceBusyId(null);
    }
  };

  const closeAttendanceModal = () => {
    setAttendanceTargetSession(null);
    setAttendancePayload(null);
    setAttendanceBusyId(null);
    setAttendanceFilter('all');
    setAttendanceExportAction(null);
    setAttendanceForm({
      participantName: '',
      participantId: '',
      status: 'absent',
      note: '',
    });
  };

  const attendanceReportRows = useMemo<AttendanceReportRow[]>(() => {
    const rows = attendanceReportItems.flatMap(({ session, attendance }) =>
      attendance.records.map((record) => ({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionSubject: session.subject,
        sessionAudience: getSessionAudienceLabel(session),
        sessionStartAt: session.startAt,
        participantName: record.participantName,
        participantId: record.participantId,
        status: record.status,
        source: record.source,
        checkedInAt: record.checkedInAt,
        joinedAt: record.joinedAt,
        lastSeenAt: record.lastSeenAt,
        leftAt: record.leftAt,
        durationMinutes: record.durationMinutes,
        note: record.note,
      }))
    );

    if (attendanceReportFilter === 'all') {
      return rows;
    }

    return rows.filter((row) => row.status === attendanceReportFilter);
  }, [attendanceReportFilter, attendanceReportItems]);

  const attendanceReportSummary = useMemo(() => {
    return attendanceReportItems.reduce(
      (summary, item) => {
        summary.sessionCount += 1;
        summary.expectedStudents += item.attendance.summary.expectedStudents;
        summary.presentCount += item.attendance.summary.presentCount;
        summary.lateCount += item.attendance.summary.lateCount;
        summary.pendingCount += item.attendance.summary.pendingCount;
        summary.absentCount += item.attendance.summary.absentCount;
        summary.checkedInCount += item.attendance.summary.checkedInCount;
        return summary;
      },
      {
        sessionCount: 0,
        expectedStudents: 0,
        presentCount: 0,
        lateCount: 0,
        pendingCount: 0,
        absentCount: 0,
        checkedInCount: 0,
      }
    );
  }, [attendanceReportItems]);

  const attendanceReportCoverage = useMemo(() => {
    const attendedCount = attendanceReportSummary.presentCount + attendanceReportSummary.lateCount;
    if (attendanceReportSummary.expectedStudents <= 0) {
      return attendedCount > 0 ? 100 : 0;
    }
    return Math.round((attendedCount / attendanceReportSummary.expectedStudents) * 100);
  }, [attendanceReportSummary]);

  const attendanceReportSessionTrends = useMemo<AttendanceSessionTrend[]>(() => {
    return attendanceReportItems
      .map(({ session, attendance }) => {
        const attendedCount = attendance.summary.presentCount + attendance.summary.lateCount;
        const coverage =
          attendance.summary.expectedStudents > 0
            ? Math.round((attendedCount / attendance.summary.expectedStudents) * 100)
            : attendedCount > 0
              ? 100
              : 0;

        return {
          sessionId: session.id,
          title: session.title,
          subject: session.subject,
          instructor: session.instructor,
          audience: getSessionAudienceLabel(session),
          startAt: session.startAt,
          coverage,
          expectedStudents: attendance.summary.expectedStudents,
          attendedCount,
          lateCount: attendance.summary.lateCount,
          absentCount: attendance.summary.absentCount,
          pendingCount: attendance.summary.pendingCount,
        };
      })
      .sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime());
  }, [attendanceReportItems]);

  const attendanceReportTeacherTrends = useMemo<AttendanceGroupedTrend[]>(() => {
    const grouped = new Map<
      string,
      {
        label: string;
        sessions: AttendanceSessionTrend[];
      }
    >();

    attendanceReportSessionTrends.forEach((trend) => {
      const key = trend.instructor.trim().toLowerCase() || 'unassigned-teacher';
      const current = grouped.get(key) || {
        label: trend.instructor || 'Unassigned teacher',
        sessions: [],
      };
      current.sessions.push(trend);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([key, group]) => {
        const sortedSessions = [...group.sessions].sort(
          (left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime()
        );
        const totalCoverage = group.sessions.reduce((sum, session) => sum + session.coverage, 0);
        const attendedCount = group.sessions.reduce((sum, session) => sum + session.attendedCount, 0);
        const expectedStudents = group.sessions.reduce((sum, session) => sum + session.expectedStudents, 0);
        const lateCount = group.sessions.reduce((sum, session) => sum + session.lateCount, 0);
        const latestCoverage = sortedSessions[0]?.coverage ?? null;
        const previousCoverage = sortedSessions[1]?.coverage ?? null;
        return {
          key,
          label: group.label,
          secondaryLabel: `${group.sessions.length} class${group.sessions.length === 1 ? '' : 'es'}`,
          classCount: group.sessions.length,
          averageCoverage: Math.round(totalCoverage / Math.max(1, group.sessions.length)),
          attendedCount,
          expectedStudents,
          lateCount,
          latestCoverage,
          previousCoverage,
          deltaCoverage:
            latestCoverage !== null && previousCoverage !== null
              ? latestCoverage - previousCoverage
              : null,
        };
      })
      .sort((left, right) => right.averageCoverage - left.averageCoverage);
  }, [attendanceReportSessionTrends]);

  const attendanceReportAudienceTrends = useMemo<AttendanceGroupedTrend[]>(() => {
    const grouped = new Map<
      string,
      {
        label: string;
        sessions: AttendanceSessionTrend[];
      }
    >();

    attendanceReportSessionTrends.forEach((trend) => {
      const key = trend.audience.trim().toLowerCase() || 'all-classes';
      const current = grouped.get(key) || {
        label: trend.audience || 'All classes',
        sessions: [],
      };
      current.sessions.push(trend);
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([key, group]) => {
        const sortedSessions = [...group.sessions].sort(
          (left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime()
        );
        const totalCoverage = group.sessions.reduce((sum, session) => sum + session.coverage, 0);
        const attendedCount = group.sessions.reduce((sum, session) => sum + session.attendedCount, 0);
        const expectedStudents = group.sessions.reduce((sum, session) => sum + session.expectedStudents, 0);
        const lateCount = group.sessions.reduce((sum, session) => sum + session.lateCount, 0);
        const latestCoverage = sortedSessions[0]?.coverage ?? null;
        const previousCoverage = sortedSessions[1]?.coverage ?? null;
        return {
          key,
          label: group.label,
          secondaryLabel: `${group.sessions.length} class session${group.sessions.length === 1 ? '' : 's'}`,
          classCount: group.sessions.length,
          averageCoverage: Math.round(totalCoverage / Math.max(1, group.sessions.length)),
          attendedCount,
          expectedStudents,
          lateCount,
          latestCoverage,
          previousCoverage,
          deltaCoverage:
            latestCoverage !== null && previousCoverage !== null
              ? latestCoverage - previousCoverage
              : null,
        };
      })
      .sort((left, right) => right.averageCoverage - left.averageCoverage);
  }, [attendanceReportSessionTrends]);

  const openAttendanceReport = () => {
    const rangeStart =
      viewMode === 'week' ? weekStartDate : startOfWeek(new Date());
    const rangeEnd =
      viewMode === 'week' ? addDays(weekStartDate, 6) : addDays(startOfWeek(new Date()), 6);
    setAttendanceReportStartDate(formatDateInputValue(rangeStart));
    setAttendanceReportEndDate(formatDateInputValue(rangeEnd));
    setAttendanceReportFilter('all');
    setAttendanceReportItems([]);
    setAttendanceReportExportAction(null);
    setIsAttendanceReportOpen(true);
  };

  const closeAttendanceReport = () => {
    if (isAttendanceReportLoading || attendanceReportExportAction) {
      return;
    }
    setIsAttendanceReportOpen(false);
    setAttendanceReportFilter('all');
    setAttendanceReportItems([]);
    setAttendanceReportExportAction(null);
  };

  const handleGenerateAttendanceReport = async () => {
    if (isAttendanceReportLoading) {
      return;
    }

    if (!attendanceReportStartDate || !attendanceReportEndDate) {
      setNotice('Choose a valid attendance report date range.');
      return;
    }

    if (attendanceReportCandidateSessions.length === 0) {
      setNotice('No classes match the current date range and schedule filters.');
      setAttendanceReportItems([]);
      return;
    }

    setIsAttendanceReportLoading(true);
    setNotice(null);

    try {
      const payloads = await Promise.all(
        attendanceReportCandidateSessions.map(async (session) => ({
          session,
          attendance: await fetchSchoolScheduleAttendance(session.id),
        }))
      );
      setAttendanceReportItems(payloads);
      setAttendanceReportFilter('all');
      setNotice(`Attendance report generated for ${payloads.length} class${payloads.length === 1 ? '' : 'es'}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not generate attendance report right now.');
    } finally {
      setIsAttendanceReportLoading(false);
    }
  };

  const handleExportAttendanceRangeCsv = () => {
    if (attendanceReportRows.length === 0 || attendanceReportExportAction) {
      return;
    }

    setAttendanceReportExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Attendance Range Report', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow(['Attendance Range Report', 'Date From', attendanceReportStartDate || 'N/A']),
        joinCsvRow(['Attendance Range Report', 'Date To', attendanceReportEndDate || 'N/A']),
        joinCsvRow(['Attendance Range Report', 'Status Filter', attendanceFilterLabel(attendanceReportFilter)]),
        joinCsvRow(['Attendance Range Report', 'Classes Included', attendanceReportSummary.sessionCount]),
        joinCsvRow(['Attendance Range Report', 'Expected Students', attendanceReportSummary.expectedStudents]),
        joinCsvRow(['Attendance Range Report', 'Present', attendanceReportSummary.presentCount]),
        joinCsvRow(['Attendance Range Report', 'Late', attendanceReportSummary.lateCount]),
        joinCsvRow(['Attendance Range Report', 'Pending', attendanceReportSummary.pendingCount]),
        joinCsvRow(['Attendance Range Report', 'Absent', attendanceReportSummary.absentCount]),
        joinCsvRow(['Attendance Range Report', 'Coverage', `${attendanceReportCoverage}%`]),
        joinCsvRow([
          'Attendance Range Report',
          'Top Teacher Trend',
          attendanceReportTeacherTrends[0]
            ? `${attendanceReportTeacherTrends[0].label} (${attendanceReportTeacherTrends[0].averageCoverage}%)`
            : 'N/A',
        ]),
        joinCsvRow([
          'Attendance Range Report',
          'Top Class Trend',
          attendanceReportAudienceTrends[0]
            ? `${attendanceReportAudienceTrends[0].label} (${attendanceReportAudienceTrends[0].averageCoverage}%)`
            : 'N/A',
        ]),
        '',
        joinCsvRow([
          'Class',
          'Subject',
          'Audience',
          'Class Time',
          'Student',
          'Student ID',
          'Status',
          'Source',
          'Checked In',
          'Duration',
          'Note',
        ]),
      ];

      attendanceReportRows.forEach((row) => {
        lines.push(
          joinCsvRow([
            row.sessionTitle,
            row.sessionSubject,
            row.sessionAudience,
            formatDateTime(row.sessionStartAt),
            row.participantName,
            row.participantId || 'N/A',
            attendanceFilterLabel(row.status),
            row.source === 'check_in' ? 'Student check-in' : row.source === 'live' ? 'Live presence' : 'Manual',
            formatAttendanceMoment(row.checkedInAt),
            row.durationMinutes !== null ? `${row.durationMinutes} min` : 'Not recorded',
            row.note || '',
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-attendance-range-${dateStamp}.csv`
      );
      setNotice('Attendance range CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Attendance range CSV export failed.');
    } finally {
      setAttendanceReportExportAction(null);
    }
  };

  const handleExportAttendanceRangePdf = async () => {
    if (attendanceReportRows.length === 0 || attendanceReportExportAction) {
      return;
    }

    setAttendanceReportExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const reportFrame = buildSchoolReportFrame({
        title: 'Attendance Range Report',
        subtitle: `${attendanceReportStartDate || 'N/A'} to ${attendanceReportEndDate || 'N/A'}`,
        metaLines: [
          `Status filter: ${attendanceFilterLabel(attendanceReportFilter)}`,
          `Classes included: ${attendanceReportSummary.sessionCount}`,
          `Coverage: ${attendanceReportCoverage}%`,
          `Top teacher: ${
            attendanceReportTeacherTrends[0]
              ? `${attendanceReportTeacherTrends[0].label} (${attendanceReportTeacherTrends[0].averageCoverage}%)`
              : 'N/A'
          }`,
          `Top class trend: ${
            attendanceReportAudienceTrends[0]
              ? `${attendanceReportAudienceTrends[0].label} (${attendanceReportAudienceTrends[0].averageCoverage}%)`
              : 'N/A'
          }`,
          `Rows exported: ${attendanceReportRows.length}`,
        ],
        documentLabel: 'Attendance analytics export',
        documentCode: `ATT-RANGE-${dateStamp.replaceAll('-', '')}`,
      });

      const summaryBody = [
        [
          { text: 'Expected', style: 'tableHeader' },
          { text: 'Present', style: 'tableHeader' },
          { text: 'Late', style: 'tableHeader' },
          { text: 'Pending', style: 'tableHeader' },
          { text: 'Absent', style: 'tableHeader' },
          { text: 'Coverage', style: 'tableHeader' },
        ],
        [
          String(attendanceReportSummary.expectedStudents),
          String(attendanceReportSummary.presentCount),
          String(attendanceReportSummary.lateCount),
          String(attendanceReportSummary.pendingCount),
          String(attendanceReportSummary.absentCount),
          `${attendanceReportCoverage}%`,
        ],
      ];

      const rowBody = [
        [
          { text: 'Class', style: 'tableHeader' },
          { text: 'Student', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' },
          { text: 'Checked In', style: 'tableHeader' },
          { text: 'Duration', style: 'tableHeader' },
        ],
        ...attendanceReportRows.map((row) => [
          `${row.sessionTitle}\n${row.sessionSubject}`,
          row.participantName,
          attendanceFilterLabel(row.status),
          formatAttendanceMoment(row.checkedInAt),
          row.durationMinutes !== null ? `${row.durationMinutes} min` : 'Not recorded',
        ]),
      ];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [32, 36, 32, 44],
        content: [
          ...reportFrame.headerContent,
          { text: 'Attendance Summary', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*', '*', '*'],
              body: summaryBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 16],
          },
          { text: 'Attendance Rows', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', 'auto', 'auto', 'auto'],
              body: rowBody,
            },
            layout: 'lightHorizontalLines',
          },
          ...reportFrame.signOffContent,
        ],
        styles: {
          ...schoolReportStyles,
          header: { fontSize: 18, bold: true, color: '#0f172a' },
          subheader: { fontSize: 11, color: '#475569', margin: [0, 2, 0, 0] },
          muted: { fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] },
          sectionHeader: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 0, 0, 8] },
          tableHeader: { bold: true, color: '#0f172a', fillColor: '#eef2ff' },
        },
        footer: reportFrame.footer,
      };

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-attendance-range-${dateStamp}.pdf`);
      setNotice('Attendance range PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Attendance range PDF export failed.');
    } finally {
      setAttendanceReportExportAction(null);
    }
  };

  const jumpToSessionFromActivity = (sessionId: string) => {
    setViewMode('list');
    setHighlightedSessionId(sessionId);
    window.setTimeout(() => {
      const target = sessionCardRefs.current[sessionId];
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const shiftWeek = (direction: -1 | 1) => {
    setWeekStartDate((current) => addDays(current, direction * 7));
  };

  const openBulkReschedule = () => {
    setBulkRescheduleDays('7');
    setIsBulkRescheduleOpen(true);
  };

  const closeBulkReschedule = () => {
    if (activeActionId === 'bulk-reschedule') {
      return;
    }
    setIsBulkRescheduleOpen(false);
    setBulkRescheduleDays('7');
  };

  const handleExportWeeklyTimetableCsv = () => {
    if (timetableExportAction || visibleWeekSessions.length === 0) {
      return;
    }

    setTimetableExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Weekly Timetable', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow(['Weekly Timetable', 'Week Range', formatWeekRangeLabel(weekStartDate)]),
        joinCsvRow(['Weekly Timetable', 'View Filter', filter === 'all' ? 'All' : statusLabel(filter)]),
        joinCsvRow(['Weekly Timetable', 'Search Query', searchQuery.trim() || 'None']),
        joinCsvRow(['Weekly Timetable', 'Classes Exported', visibleWeekSessions.length]),
        '',
        joinCsvRow([
          'Day',
          'Date',
          'Time',
          'Class Title',
          'Subject',
          'Teacher',
          'Audience',
          'Room',
          'Status',
          'Students',
        ]),
      ];

      visibleWeekSessions.forEach(({ day, session }) => {
        lines.push(
          joinCsvRow([
            day.dayLabel,
            new Date(session.startAt).toLocaleDateString(),
            `${formatSessionTime(session.startAt)} - ${formatSessionTime(session.endAt)}`,
            session.title,
            session.subject,
            session.instructor,
            getSessionAudienceLabel(session),
            session.roomCode,
            statusLabel(getSessionStatus(session, Date.now())),
            session.expectedStudents,
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-weekly-timetable-${dateStamp}.csv`
      );
      setNotice('Weekly timetable CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Weekly timetable CSV export failed.');
    } finally {
      setTimetableExportAction(null);
    }
  };

  const filteredAttendanceRecords = useMemo(() => {
    if (!attendancePayload) {
      return [];
    }

    if (attendanceFilter === 'all') {
      return attendancePayload.records;
    }

    return attendancePayload.records.filter((record) => record.status === attendanceFilter);
  }, [attendanceFilter, attendancePayload]);

  const handleExportAttendanceCsv = () => {
    if (!attendanceTargetSession || !attendancePayload || filteredAttendanceRecords.length === 0 || attendanceExportAction) {
      return;
    }

    setAttendanceExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Attendance Report', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow(['Attendance Report', 'Class', attendanceTargetSession.title]),
        joinCsvRow(['Attendance Report', 'Subject', attendanceTargetSession.subject]),
        joinCsvRow(['Attendance Report', 'Session ID', attendanceTargetSession.id]),
        joinCsvRow(['Attendance Report', 'Class Time', formatDateTime(attendanceTargetSession.startAt)]),
        joinCsvRow(['Attendance Report', 'Filter', attendanceFilterLabel(attendanceFilter)]),
        joinCsvRow(['Attendance Report', 'Window Status', attendancePayload.window.isOpen ? 'Open' : 'Closed']),
        joinCsvRow(['Attendance Report', 'Grace Period', `${attendancePayload.window.gracePeriodMinutes} minutes`]),
        joinCsvRow(['Attendance Report', 'Expected Students', attendancePayload.summary.expectedStudents]),
        joinCsvRow(['Attendance Report', 'Present', attendancePayload.summary.presentCount]),
        joinCsvRow(['Attendance Report', 'Late', attendancePayload.summary.lateCount]),
        joinCsvRow(['Attendance Report', 'Pending', attendancePayload.summary.pendingCount]),
        joinCsvRow(['Attendance Report', 'Absent', attendancePayload.summary.absentCount]),
        joinCsvRow(['Attendance Report', 'Coverage', `${attendancePayload.summary.attendanceRate}%`]),
        '',
        joinCsvRow([
          'Student',
          'Student ID',
          'Status',
          'Source',
          'Joined',
          'Checked In',
          'Last Seen',
          'Left',
          'Duration',
          'Note',
        ]),
      ];

      filteredAttendanceRecords.forEach((record) => {
        lines.push(
          joinCsvRow([
            record.participantName,
            record.participantId || 'N/A',
            attendanceFilterLabel(record.status as AttendanceFilter),
            record.source === 'check_in' ? 'Student check-in' : record.source === 'live' ? 'Live presence' : 'Manual',
            formatAttendanceMoment(record.joinedAt),
            formatAttendanceMoment(record.checkedInAt),
            formatAttendanceMoment(record.lastSeenAt),
            formatAttendanceMoment(record.leftAt),
            record.durationMinutes !== null ? `${record.durationMinutes} min` : 'Not recorded',
            record.note || '',
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-attendance-${attendanceTargetSession.id}-${dateStamp}.csv`
      );
      setNotice('Attendance CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Attendance CSV export failed.');
    } finally {
      setAttendanceExportAction(null);
    }
  };

  const handleExportAttendancePdf = async () => {
    if (!attendanceTargetSession || !attendancePayload || filteredAttendanceRecords.length === 0 || attendanceExportAction) {
      return;
    }

    setAttendanceExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const reportFrame = buildSchoolReportFrame({
        title: 'Class Attendance Report',
        subtitle: attendanceTargetSession.title,
        metaLines: [
          `Subject: ${attendanceTargetSession.subject}`,
          `Session ID: ${attendanceTargetSession.id}`,
          `Class time: ${formatDateTime(attendanceTargetSession.startAt)}`,
          `Filter: ${attendanceFilterLabel(attendanceFilter)}`,
          `Grace period: ${attendancePayload.window.gracePeriodMinutes} minutes`,
          `Records exported: ${filteredAttendanceRecords.length}`,
        ],
        documentLabel: 'Attendance export',
        documentCode: `ATTENDANCE-${attendanceTargetSession.id}`,
      });

      const summaryTableBody = [
        [
          { text: 'Expected', style: 'tableHeader' },
          { text: 'Present', style: 'tableHeader' },
          { text: 'Late', style: 'tableHeader' },
          { text: 'Pending', style: 'tableHeader' },
          { text: 'Absent', style: 'tableHeader' },
          { text: 'Coverage', style: 'tableHeader' },
        ],
        [
          String(attendancePayload.summary.expectedStudents),
          String(attendancePayload.summary.presentCount),
          String(attendancePayload.summary.lateCount),
          String(attendancePayload.summary.pendingCount),
          String(attendancePayload.summary.absentCount),
          `${attendancePayload.summary.attendanceRate}%`,
        ],
      ];

      const recordTableBody = [
        [
          { text: 'Student', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' },
          { text: 'Source', style: 'tableHeader' },
          { text: 'Checked In', style: 'tableHeader' },
          { text: 'Duration', style: 'tableHeader' },
        ],
        ...filteredAttendanceRecords.map((record) => [
          record.participantName,
          attendanceFilterLabel(record.status as AttendanceFilter),
          record.source === 'check_in' ? 'Student check-in' : record.source === 'live' ? 'Live presence' : 'Manual',
          formatAttendanceMoment(record.checkedInAt),
          record.durationMinutes !== null ? `${record.durationMinutes} min` : 'Not recorded',
        ]),
      ];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [32, 36, 32, 44],
        content: [
          ...reportFrame.headerContent,
          { text: 'Attendance Summary', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*', '*', '*'],
              body: summaryTableBody,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 16],
          },
          { text: 'Attendance Register', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto'],
              body: recordTableBody,
            },
            layout: 'lightHorizontalLines',
          },
          ...reportFrame.signOffContent,
        ],
        styles: {
          ...schoolReportStyles,
          header: { fontSize: 18, bold: true, color: '#0f172a' },
          subheader: { fontSize: 11, color: '#475569', margin: [0, 2, 0, 0] },
          muted: { fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] },
          sectionHeader: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 0, 0, 8] },
          tableHeader: { bold: true, color: '#0f172a', fillColor: '#eef2ff' },
        },
        footer: reportFrame.footer,
      };

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-attendance-${attendanceTargetSession.id}-${dateStamp}.pdf`);
      setNotice('Attendance PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Attendance PDF export failed.');
    } finally {
      setAttendanceExportAction(null);
    }
  };

  const handleExportWeeklyTimetablePdf = async () => {
    if (timetableExportAction || visibleWeekSessions.length === 0) {
      return;
    }

    setTimetableExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const reportFrame = buildSchoolReportFrame({
        title: 'Weekly Class Timetable',
        subtitle: formatWeekRangeLabel(weekStartDate),
        metaLines: [
          `Filter: ${filter === 'all' ? 'All classes' : statusLabel(filter)}`,
          `Search: ${searchQuery.trim() || 'None'}`,
          `Classes shown: ${visibleWeekSessions.length}`,
        ],
        documentLabel: 'Timetable export',
        documentCode: `TIMETABLE-${dateStamp.replaceAll('-', '')}`,
        leftSignatoryRole: 'Prepared by',
        rightSignatoryRole: 'Approved for use',
      });

      const tableBody: Array<Array<string>> = [
        ['Day', 'Date', 'Time', 'Class', 'Teacher', 'Audience', 'Room'],
        ...visibleWeekSessions.map(({ day, session }) => [
          day.dayLabel,
          new Date(session.startAt).toLocaleDateString(),
          `${formatSessionTime(session.startAt)} - ${formatSessionTime(session.endAt)}`,
          `${session.title}\n${session.subject}`,
          session.instructor,
          getSessionAudienceLabel(session),
          session.roomCode,
        ]),
      ];

      const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [28, 36, 28, 28],
        header: () => ({
          margin: [28, 24, 28, 0],
          stack: reportFrame.headerContent,
        }),
        footer: reportFrame.footer,
        content: [
          {
            text:
              visibleWeekSessions.length === 0
                ? 'No classes are visible for this week and filter.'
                : 'This export reflects the timetable currently visible in the school schedule workspace.',
            style: 'muted',
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              headerRows: 1,
              widths: [42, 58, 70, '*', 92, 92, 58],
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
          ...reportFrame.signOffContent,
        ],
        styles: {
          ...schoolReportStyles,
          header: { fontSize: 17, bold: true, margin: [0, 0, 0, 6] },
          subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
          sectionHeader: { fontSize: 12, bold: true, margin: [0, 8, 0, 6] },
          muted: { fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 2] },
        },
      } as Record<string, unknown>;

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-weekly-timetable-${dateStamp}.pdf`);
      setNotice('Weekly timetable PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Weekly timetable PDF export failed.');
    } finally {
      setTimetableExportAction(null);
    }
  };

  const handleApplyBulkReschedule = async () => {
    if (activeActionId || bulkRescheduleCandidates.length === 0) {
      return;
    }

    const shiftDays = Number.parseInt(bulkRescheduleDays, 10);
    if (!Number.isFinite(shiftDays) || shiftDays === 0) {
      setNotice('Enter a valid number of days to shift the visible classes.');
      return;
    }

    setActiveActionId('bulk-reschedule');
    setNotice(null);

    try {
      let updatedCount = 0;
      const failures: string[] = [];
      const updatedSessions: SchoolScheduleSession[] = [];

      for (const session of bulkRescheduleCandidates) {
        const shiftedStart = addDays(new Date(session.startAt), shiftDays);
        if (Number.isNaN(shiftedStart.getTime())) {
          failures.push(`${session.title}: invalid start time`);
          continue;
        }

        try {
          const payload = await updateSchoolScheduleSession(session.id, {
            startAt: shiftedStart.toISOString(),
          });
          if (payload.session) {
            updatedSessions.push(payload.session);
          }
          updatedCount += 1;
        } catch (error) {
          failures.push(
            `${session.title}: ${
              error instanceof Error ? error.message : 'Could not reschedule this class.'
            }`
          );
        }
      }

      if (updatedSessions.length > 0) {
        setSessions((current) =>
          current
            .map((session) => updatedSessions.find((updated) => updated.id === session.id) || session)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        );
      } else {
        await refreshSessions();
      }

      if (updatedCount > 0 && failures.length === 0) {
        setNotice(
          `Shifted ${updatedCount} class${updatedCount === 1 ? '' : 'es'} by ${shiftDays} day${
            Math.abs(shiftDays) === 1 ? '' : 's'
          }.`
        );
      } else if (updatedCount > 0) {
        setNotice(
          `Shifted ${updatedCount} class${updatedCount === 1 ? '' : 'es'}. ${
            failures.length
          } could not be moved. ${failures.slice(0, 2).join(' ')}`
        );
      } else {
        setNotice(
          failures[0] || 'No visible classes could be rescheduled with the current settings.'
        );
      }

      setIsBulkRescheduleOpen(false);
      setBulkRescheduleDays('7');
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#eef1ff] via-[#f8fafc] to-[#f8fafc] pb-24 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        <section className={`${premiumShellClass} relative overflow-hidden`}>
          <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#3D08BA]/10 blur-3xl" />

          <div className="relative grid gap-6 px-5 py-6 lg:grid-cols-[1.45fr_0.95fr] lg:px-8 lg:py-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D08BA]">
                <FaCalendarAlt size={10} />
                School schedule
              </div>

              <div className="mt-5 flex items-start gap-4">
                <button
                  onClick={() => navigate('/school-dashboard')}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#3D08BA]/15 bg-white text-[#3D08BA] shadow-[0_14px_32px_-22px_rgba(61,8,186,0.55)] transition hover:-translate-y-0.5 hover:bg-[#3D08BA]/5"
                  aria-label="Back to school dashboard"
                  title="Back to school dashboard"
                >
                  <FaArrowLeft size={14} />
                </button>
                <div className="max-w-2xl">
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2.35rem]">
                    Class Schedule Workspace
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                    Plan live and offline classes, assign the right teachers, and keep weekly operations clear for every department.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
                      <FaClock size={11} className="text-[#3D08BA]" />
                      Week of {formatWeekRangeLabel(weekStartDate)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
                      <FaUsers size={11} className="text-[#3D08BA]" />
                      {teacherRosterStats.total} teachers on roster
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
                      <FaTable size={11} className="text-[#3D08BA]" />
                      {viewMode === 'week' ? `${visibleWeekSessions.length} classes in visible week` : `${filteredSessions.length} filtered classes`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-900/10 bg-slate-950 px-5 py-5 text-white shadow-[0_28px_60px_-36px_rgba(15,23,42,0.9)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                    Operations snapshot
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">
                    Keep the school week under control
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                  {scheduleStats.live} live now
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                  <p className="text-[11px] font-medium text-white/60">Today</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{todayScheduleCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                  <p className="text-[11px] font-medium text-white/60">Visible week</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{visibleWeekSessions.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                  <p className="text-[11px] font-medium text-white/60">Teachers busy</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{teacherRosterStats.weekLoadCount}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Next class in queue
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {nextScheduledSession ? nextScheduledSession.title : 'No live or upcoming class yet'}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  {nextScheduledSession
                    ? `${formatDateTime(nextScheduledSession.startAt)} • ${nextScheduledSession.subject} • ${nextScheduledSession.instructor}`
                    : 'Create the next class session to start filling this schedule.'}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  onClick={() => {
                    resetForm();
                    setIsCreateOpen(true);
                  }}
                  className={primaryButtonClass}
                >
                  <FaPlus size={12} />
                  Add class
                </button>
                <button
                  onClick={() => navigate('/tutor-list-school')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/88 transition hover:bg-white/12"
                >
                  <FaUsers size={12} />
                  Find teachers
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {notice && (
        <div className="mx-auto mt-5 max-w-7xl px-4 lg:px-6">
          <div className="rounded-[22px] border border-[#3D08BA]/15 bg-white/80 px-4 py-3 text-sm text-[#3D08BA] shadow-[0_18px_40px_-32px_rgba(61,8,186,0.45)] backdrop-blur-xl">
            {notice}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`${premiumPanelClass} p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">All classes</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{scheduleStats.all}</p>
            <p className="mt-2 text-sm text-slate-500">Full timetable volume across live, upcoming, and completed sessions.</p>
          </div>
          <div className={`${premiumPanelClass} border-red-100/80 p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">Live now</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-red-600">{scheduleStats.live}</p>
            <p className="mt-2 text-sm text-slate-500">Classes currently in progress and ready for immediate oversight.</p>
          </div>
          <div className={`${premiumPanelClass} border-[#3D08BA]/15 p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Upcoming</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#3D08BA]">{scheduleStats.upcoming}</p>
            <p className="mt-2 text-sm text-slate-500">Classes ahead of schedule that still need teacher and student readiness.</p>
          </div>
          <div className={`${premiumPanelClass} border-emerald-100/80 p-5`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Completed</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-emerald-600">{scheduleStats.completed}</p>
            <p className="mt-2 text-sm text-slate-500">Historical sessions already delivered and available for review.</p>
          </div>
        </section>

        <section className={`${premiumShellClass} mt-6 p-5 lg:p-6`}>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <FaFilter size={10} />
                Schedule controls
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Search, filter, and move through the timetable faster
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Narrow the schedule by status, switch between list and weekly views, and export or shift the exact week you are working on.
              </p>
            </div>

            <div className={`${premiumInsetClass} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Showing {filteredSessions.length} of {sessions.length} classes
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {viewMode === 'week'
                    ? `Weekly view focused on ${formatWeekRangeLabel(weekStartDate)}`
                    : 'List view focused on individual class actions'}
                </p>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.45)]">
                <button
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === 'list' ? 'bg-[#3D08BA] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FaListUl size={11} />
                  List
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === 'week' ? 'bg-[#3D08BA] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FaTable size={11} />
                  Week grid
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="space-y-3">
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by class title, subject, teacher, or room code"
                  className={`${premiumInputClass} pl-11`}
                />
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'live', 'upcoming', 'completed'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      filter === value
                        ? 'border-[#3D08BA] bg-[#3D08BA] text-white shadow-[0_12px_24px_-18px_rgba(61,8,186,0.85)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {value === 'all' ? 'All classes' : statusLabel(value)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                onClick={openAttendanceReport}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3D08BA]/20 bg-[#3D08BA]/6 px-4 py-2.5 text-sm font-semibold text-[#3D08BA] transition hover:-translate-y-0.5 hover:bg-[#3D08BA]/10"
              >
                <FaUsers size={12} />
                Attendance report
              </button>
              {viewMode === 'week' && (
                <>
                  <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-1 py-1 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.42)]">
                    <button
                      onClick={() => shiftWeek(-1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50"
                      aria-label="Previous week"
                    >
                      <FaChevronLeft size={11} />
                    </button>
                    <p className="px-2 text-xs font-semibold text-slate-700">{formatWeekRangeLabel(weekStartDate)}</p>
                    <button
                      onClick={() => shiftWeek(1)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50"
                      aria-label="Next week"
                    >
                      <FaChevronRight size={11} />
                    </button>
                  </div>
                  <button
                    onClick={openBulkReschedule}
                    disabled={activeActionId !== null || bulkRescheduleCandidates.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Shift visible week
                  </button>
                  <button
                    onClick={handleExportWeeklyTimetableCsv}
                    disabled={timetableExportAction !== null || visibleWeekSessions.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {timetableExportAction === 'csv' ? 'Exporting CSV...' : 'Export week CSV'}
                  </button>
                  <button
                    onClick={() => void handleExportWeeklyTimetablePdf()}
                    disabled={timetableExportAction !== null || visibleWeekSessions.length === 0}
                    className={tintedButtonClass}
                  >
                    {timetableExportAction === 'pdf' ? 'Exporting PDF...' : 'Export week PDF'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="teacher-roster-section" className={`${premiumShellClass} mt-6 p-5 lg:p-6`}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                <FaUsers size={10} />
                Teacher roster
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Manage your internal teachers without breaking the class flow
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Keep a trusted internal roster, monitor invite status, and assign teachers quickly when classes need to go live.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                This roster is for school teachers. External tutors should still come through the tutor directory flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                onClick={() => void handleResendPendingInvites()}
                disabled={Boolean(activeTeacherActionId)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeTeacherActionId === 'bulk-invite' ? 'Resending...' : 'Resend pending invites'}
              </button>
              <button onClick={handleExportInvitedTeachersCsv} className={secondaryButtonClass}>
                Export invited CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search teachers by name, email, department, class, or subject focus"
                className={`${premiumInputClass} pl-11`}
              />
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
            <select
              value={teacherInviteFilter}
              onChange={(event) =>
                setTeacherInviteFilter(
                  event.target.value as 'all' | 'invited' | 'accepted' | 'inactive'
                )
              }
              className={premiumSelectClass}
            >
              <option value="all">All statuses</option>
              <option value="invited">Invited</option>
              <option value="accepted">Accepted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {teacherNotice && (
            <div className="mt-4 rounded-[20px] border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-4 py-3 text-sm text-[#3D08BA] shadow-[0_18px_40px_-32px_rgba(61,8,186,0.45)]">
              {teacherNotice}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`${premiumPanelClass} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total teachers</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{teacherRosterStats.total}</p>
              <p className="mt-2 text-xs text-slate-500">Everyone currently available in the school roster.</p>
            </div>
            <div className={`${premiumPanelClass} border-emerald-200/80 p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Active</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-emerald-700">{teacherRosterStats.activeCount}</p>
              <p className="mt-2 text-xs text-slate-500">Teachers still available for assignment right now.</p>
            </div>
            <div className={`${premiumPanelClass} border-[#3D08BA]/15 p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">Accepted</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#3D08BA]">{teacherRosterStats.acceptedCount}</p>
              <p className="mt-2 text-xs text-slate-500">Teachers who already accepted access and can take classes.</p>
            </div>
            <div className={`${premiumPanelClass} border-amber-200/80 p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Busy this week</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-amber-700">{teacherRosterStats.weekLoadCount}</p>
              <p className="mt-2 text-xs text-slate-500">Teachers already carrying at least one class this week.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_1.08fr_1.84fr]">
            <div className={`${premiumPanelClass} p-4`}>
              <p className="text-sm font-semibold text-slate-900">
                {editingTeacherId ? 'Edit teacher profile' : 'Add teacher'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {editingTeacherId
                  ? 'Update the teacher profile, class ownership, and subject coverage without removing the teacher from your roster.'
                  : 'Add the same email the teacher uses to sign in. They will access assigned classes with the generated teacher link and access code.'}
              </p>
              <div className="mt-4 space-y-3">
                <input
                  value={teacherForm.name}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  className={premiumInputClass}
                />
                <input
                  value={teacherForm.email}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className={premiumInputClass}
                />
                <input
                  value={teacherForm.department}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, department: event.target.value }))}
                  placeholder="Department (optional)"
                  className={premiumInputClass}
                />
                <input
                  value={teacherForm.classGroup}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, classGroup: event.target.value }))}
                  placeholder="Class group (optional)"
                  className={premiumInputClass}
                />
                <input
                  value={teacherForm.subjectFocus}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, subjectFocus: event.target.value }))}
                  placeholder="Subject focus (optional)"
                  className={premiumInputClass}
                />
              </div>
              <button onClick={handleCreateTeacher} disabled={isTeacherSubmitting} className={`${primaryButtonClass} mt-4 w-full`}>
                {isTeacherSubmitting
                  ? 'Saving...'
                  : editingTeacherId
                    ? 'Save teacher changes'
                    : 'Add teacher'}
              </button>
              {editingTeacherId && (
                <button onClick={resetTeacherForm} className={`${secondaryButtonClass} mt-2 w-full`}>
                  Cancel edit
                </button>
              )}
              <button onClick={() => navigate('/tutor-list-school')} className={`${tintedButtonClass} mt-2 w-full`}>
                Need to hire? Browse tutor directory
              </button>
            </div>

            <div className={`${premiumPanelClass} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Invite activity</p>
                  <p className="mt-1 text-xs text-slate-500">Track invites, class assignments, and accepted access.</p>
                </div>
                <button onClick={() => void refreshInviteActivity()} className={secondaryButtonClass}>
                  Refresh
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(['all', 'accepted', 'pending'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setInviteActivityFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                      inviteActivityFilter === value
                        ? value === 'accepted'
                          ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                          : value === 'pending'
                            ? 'border-amber-300 bg-amber-100 text-amber-700'
                            : 'border-[#3D08BA]/30 bg-[#3D08BA]/10 text-[#3D08BA]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {value === 'all' ? 'All activity' : value === 'accepted' ? 'Accepted' : 'Pending'}
                  </button>
                ))}
              </div>

              {isInviteActivityLoading && (
                <p className={`${premiumInsetClass} mt-4 px-3 py-3 text-xs text-slate-500`}>
                  Loading invite activity...
                </p>
              )}

              {!isInviteActivityLoading && filteredInviteActivity.length === 0 && (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-xs text-slate-500">
                  No invite activity for this filter yet.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {filteredInviteActivity.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-2xl border px-3.5 py-3 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.34)] ${
                      event.kind === 'teacher_access_accepted'
                        ? 'border-emerald-200 bg-emerald-50/85'
                        : 'border-slate-200 bg-slate-50/85'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {event.kind === 'teacher_access_accepted' && (
                          <FaCheckCircle className="text-[11px] text-emerald-600" />
                        )}
                        <p className="text-xs font-semibold text-slate-800">{event.title}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">{event.createdAtLabel}</span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${inviteActivityTypeClass(
                          event.kind
                        )}`}
                      >
                        {inviteActivityTypeLabel(event.kind)}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-600">{event.message}</p>
                    <button onClick={() => jumpToSessionFromActivity(event.sessionId)} className={`${secondaryButtonClass} mt-3 !px-3 !py-2 !text-xs`}>
                      Open class
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${premiumPanelClass} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Teacher list</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {filteredTeachers.length} teacher{filteredTeachers.length === 1 ? '' : 's'} visible with live workload and invite state.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  {teacherRosterStats.liveCount} teaching live
                </span>
              </div>

              {isTeacherLoading && (
                <p className={`${premiumInsetClass} mt-4 px-4 py-3 text-sm text-slate-600`}>
                  Loading teacher roster...
                </p>
              )}

              {!isTeacherLoading && filteredTeachers.length === 0 && (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                  No teachers match this search yet.
                </div>
              )}

              <div className="mt-4 space-y-3">
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="rounded-[24px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:border-[#3D08BA]/15"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-[240px] flex-1 gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#3D08BA]/10 text-sm font-semibold text-[#3D08BA]">
                          {getNameInitials(teacher.name)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950">{teacher.name}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${teacherInviteStatusClass(
                                teacher
                              )}`}
                            >
                              {teacherInviteStatusLabel(teacher)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">{teacher.email}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[teacher.department, teacher.classGroup, teacher.subjectFocus]
                              .filter(Boolean)
                              .join(' • ') || 'No profile tags yet'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                              Live now: {teacherInsights.get(teacher.email)?.liveCount || 0}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                              Upcoming: {teacherInsights.get(teacher.email)?.upcomingCount || 0}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                              This week: {teacherInsights.get(teacher.email)?.weekCount || 0}
                            </span>
                          </div>
                          {teacherInsights.get(teacher.email)?.nextSession && (
                            <p className="mt-3 text-[11px] text-slate-500">
                              Next class:{' '}
                              {teacherInsights.get(teacher.email)?.nextSession?.title} •{' '}
                              {formatDateTime(teacherInsights.get(teacher.email)?.nextSession?.startAt || '')}
                            </p>
                          )}
                          {teacher.lastInviteSentAt && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Invite sent: {new Date(teacher.lastInviteSentAt).toLocaleString()}
                            </p>
                          )}
                          {teacher.lastInviteChannel && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Channel:{' '}
                              {teacher.lastInviteChannel === 'in_app'
                                ? 'In-app'
                                : teacher.lastInviteChannel === 'email'
                                  ? 'Email'
                                  : 'In-app + Email'}
                            </p>
                          )}
                          {teacher.lastInviteDeliveryNote && (
                            <p className="mt-1 text-[11px] text-slate-500">{teacher.lastInviteDeliveryNote}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openTeacherTimetable(teacher)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100"
                        >
                          Timetable
                        </button>
                        <button
                          onClick={() => handleEditTeacher(teacher)}
                          disabled={Boolean(activeTeacherActionId)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FaEdit size={10} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleAssignTeacherToClass(teacher)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3.5 py-2 text-xs font-semibold text-[#3D08BA] transition hover:-translate-y-0.5 hover:bg-[#3D08BA]/10"
                        >
                          Assign to class
                        </button>
                        <button
                          onClick={() => handleResendTeacherInvite(teacher)}
                          disabled={Boolean(activeTeacherActionId) || !teacher.isActive}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition hover:-translate-y-0.5 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeTeacherActionId === `invite-${teacher.id}` ? 'Sending...' : 'Resend invite'}
                        </button>
                        <button
                          onClick={() => handleToggleTeacher(teacher)}
                          disabled={Boolean(activeTeacherActionId)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeTeacherActionId === `toggle-${teacher.id}`
                            ? 'Updating...'
                            : teacher.isActive
                              ? 'Set inactive'
                              : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleRemoveTeacher(teacher)}
                          disabled={Boolean(activeTeacherActionId)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeTeacherActionId === `remove-${teacher.id}` ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]">
                <FaCalendarAlt size={10} />
                Scheduled classes
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Work from a cleaner class timeline
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review each class in detail, jump straight into live sessions, or switch to the weekly grid when you need the broader operating picture.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.38)]">
              <p className="text-xs font-semibold text-slate-700">
                {filteredSessions.length} visible class{filteredSessions.length === 1 ? '' : 'es'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {viewMode === 'week'
                  ? `Weekly grid for ${formatWeekRangeLabel(weekStartDate)}`
                  : 'Expanded list with live actions, attendance, and teacher access'}
              </p>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="space-y-3">
              {isLoading && (
                <div className={`${premiumPanelClass} px-5 py-4 text-sm text-slate-600`}>
                  Loading school schedule sessions...
                </div>
              )}

              {!isLoading && filteredSessions.length === 0 && (
                <div className={`${premiumShellClass} p-10 text-center`}>
                  <FaCalendarAlt className="mx-auto mb-4 text-4xl text-slate-300" />
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    No classes match your filters
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Try another search term, switch the status filter, or add a new class to this schedule.
                  </p>
                </div>
              )}

              {filteredSessions.map((session) => {
                const status = getSessionStatus(session, Date.now());
                const acceptedEvent = acceptedInviteBySessionId.get(session.id);
                const sessionIdCopyKey = `session-id-${session.id}`;
                const teacherCodeCopyKey = `teacher-code-${session.id}`;
                return (
                  <article
                    key={session.id}
                    ref={(element) => {
                      sessionCardRefs.current[session.id] = element;
                    }}
                    className={`overflow-hidden rounded-[28px] border bg-white/92 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.34)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-34px_rgba(15,23,42,0.38)] ${
                      highlightedSessionId === session.id
                        ? 'border-emerald-300 ring-4 ring-emerald-100'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.95fr)]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(status)}`}>
                            {statusLabel(status)}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {session.subject}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                          {session.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          {session.subject} • {session.instructor}
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className={`${premiumInsetClass} px-3.5 py-3`}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Session identity
                            </p>
                            <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                              Session ID: {session.id}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleCopyField(sessionIdCopyKey, session.id, 'Session ID copied.')
                                }
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-xl border transition ${
                                  copiedFieldKey === sessionIdCopyKey
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                }`}
                                aria-label={
                                  copiedFieldKey === sessionIdCopyKey ? 'Session ID copied' : 'Copy session ID'
                                }
                                title={copiedFieldKey === sessionIdCopyKey ? 'Copied' : 'Copy session ID'}
                              >
                                {copiedFieldKey === sessionIdCopyKey ? (
                                  <FaCheckCircle size={10} />
                                ) : (
                                  <FaCopy size={10} />
                                )}
                              </button>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">Room: {session.roomCode}</p>
                            {(session.department || session.classGroup || session.audienceTag) && (
                              <p className="mt-1 text-xs text-slate-500">
                                Audience:{' '}
                                {session.audienceTag ||
                                  [session.department, session.classGroup].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>

                          <div className={`${premiumInsetClass} px-3.5 py-3`}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Teacher access
                            </p>
                            {session.assignedTutorEmail ? (
                              <p className="mt-2 text-xs text-slate-600">
                                {session.assignedTutorName || 'Teacher'} ({session.assignedTutorEmail})
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">No teacher assigned yet.</p>
                            )}
                            {session.tutorAccessCode && (
                              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                Code: <span className="font-semibold tracking-[0.2em] text-slate-700">{session.tutorAccessCode}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyField(
                                      teacherCodeCopyKey,
                                      session.tutorAccessCode || '',
                                      'Teacher access code copied.'
                                    )
                                  }
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-xl border transition ${
                                    copiedFieldKey === teacherCodeCopyKey
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                  }`}
                                  aria-label={
                                    copiedFieldKey === teacherCodeCopyKey
                                      ? 'Teacher access code copied'
                                      : 'Copy teacher access code'
                                  }
                                  title={
                                    copiedFieldKey === teacherCodeCopyKey ? 'Copied' : 'Copy teacher access code'
                                  }
                                >
                                  {copiedFieldKey === teacherCodeCopyKey ? (
                                    <FaCheckCircle size={10} />
                                  ) : (
                                    <FaCopy size={10} />
                                  )}
                                </button>
                              </p>
                            )}
                          </div>
                        </div>

                        {acceptedEvent && (
                          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                            Accepted: {acceptedEvent.message}
                          </p>
                        )}
                        {session.notes && (
                          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{session.notes}</p>
                        )}
                      </div>

                      <div className={`${premiumInsetClass} grid gap-3 p-3`}>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                          <p className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)]">
                            <FaClock size={11} className="text-[#3D08BA]" />
                            {formatDateTime(session.startAt)}
                          </p>
                          <p className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)]">
                            <FaCheckCircle size={11} className="text-[#3D08BA]" />
                            {session.durationMinutes} mins
                          </p>
                          <p className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)]">
                            <FaUsers size={11} className="text-[#3D08BA]" />
                            {session.expectedStudents} students
                          </p>
                          <p className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.45)]">
                            <FaCalendarAlt size={11} className="text-[#3D08BA]" />
                            {new Date(session.startAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 bg-slate-50/80 px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleDuplicateSession(session)}
                          disabled={Boolean(activeActionId)}
                          className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleRescheduleSession(session)}
                          disabled={Boolean(activeActionId)}
                          className="rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reschedule
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSession(session)}
                          disabled={Boolean(activeActionId)}
                          className={`${iconButtonClass} border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100`}
                          aria-label="Edit class"
                          title="Edit"
                        >
                          <FaEdit size={11} />
                        </button>
                        <button
                          onClick={() => void loadAttendance(session)}
                          className={`${iconButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100`}
                          aria-label="Open attendance"
                          title="Attendance"
                        >
                          <FaUsers size={11} />
                        </button>
                        <button
                          onClick={() => void handleCopyTeacherAccess(session.id)}
                          disabled={Boolean(activeActionId)}
                          className={iconButtonClass}
                          aria-label="Copy teacher link and access code"
                          title="Copy teacher link + code"
                        >
                          <FaCopy size={12} />
                        </button>
                        <button
                          onClick={() => void handleRegenerateTeacherAccess(session.id)}
                          disabled={Boolean(activeActionId)}
                          className={`${iconButtonClass} border-[#3D08BA]/20 bg-[#3D08BA]/6 text-[#3D08BA] hover:border-[#3D08BA]/30 hover:bg-[#3D08BA]/10`}
                          aria-label="Regenerate teacher access"
                          title="Regenerate access"
                        >
                          <FaSyncAlt size={12} />
                        </button>
                        <button
                          onClick={() => void handleShareTeacherAccess(session)}
                          disabled={Boolean(activeActionId)}
                          className={`${iconButtonClass} border-[#3D08BA]/20 bg-[#3D08BA]/6 text-[#3D08BA] hover:border-[#3D08BA]/30 hover:bg-[#3D08BA]/10`}
                          aria-label="Share class access"
                          title="Share"
                        >
                          <FaShareAlt size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={Boolean(activeActionId)}
                          className={`${iconButtonClass} border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100`}
                          aria-label="Remove class"
                          title="Remove"
                        >
                          <FaTrash size={10} />
                        </button>
                        <button
                          onClick={() => handleStartLiveClass(session)}
                          className="group relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 text-white shadow-[0_16px_30px_-22px_rgba(220,38,38,0.85)] transition hover:-translate-y-0.5 hover:bg-red-700"
                          aria-label={status === 'live' ? 'Rejoin live room' : 'Go live'}
                          title={status === 'live' ? 'Rejoin live room' : 'Go live'}
                        >
                          <FaVideo size={11} />
                          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow">
                            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`${premiumShellClass} p-4`}>
              <p className="mb-4 text-sm text-slate-600">
                Weekly timetable view for {formatWeekRangeLabel(weekStartDate)}.
              </p>

              <div className="hidden grid-cols-7 gap-2 lg:grid">
                {weekDays.map((day) => {
                  const daySessions = weekSessionsByDay[day.key] || [];
                  const isToday = getLocalDayKey(new Date()) === day.key;
                  return (
                    <div
                      key={day.key}
                      className={`min-h-[320px] rounded-[24px] border p-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.35)] ${
                        isToday ? 'border-[#3D08BA]/35 bg-[#3D08BA]/6' : 'border-slate-200 bg-slate-50/80'
                      }`}
                    >
                      <div className="mb-3 border-b border-slate-200 pb-3">
                        <p className="text-sm font-semibold text-slate-800">{day.dayLabel}</p>
                        <p className="text-xs text-slate-500">
                          {day.monthLabel} {day.dayNumber}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {daySessions.length === 0 && (
                          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-2 py-4 text-center text-[11px] text-slate-400">
                            No classes
                          </p>
                        )}

                        {daySessions.map((session) => {
                          const status = getSessionStatus(session, Date.now());
                          return (
                            <button
                              key={session.id}
                              onClick={() => handleStartLiveClass(session)}
                              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-[0_12px_30px_-24px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:border-[#3D08BA]/20 hover:bg-[#faf8ff]"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="line-clamp-2 text-[11px] font-semibold text-slate-900">{session.title}</p>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusPillClass(status)}`}>
                                  {status === 'live' ? 'Live' : status === 'completed' ? 'Done' : 'Soon'}
                                </span>
                              </div>
                              <p className="mt-2 text-[10px] text-slate-600">{session.subject}</p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                {formatSessionTime(session.startAt)} • {session.durationMinutes}m
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 lg:hidden">
                {weekDays.map((day) => {
                  const daySessions = weekSessionsByDay[day.key] || [];
                  const isToday = getLocalDayKey(new Date()) === day.key;
                  return (
                    <div key={day.key} className={`${premiumPanelClass} p-4`}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className={`text-sm font-semibold ${isToday ? 'text-[#3D08BA]' : 'text-slate-800'}`}>
                          {day.dayLabel}, {day.monthLabel} {day.dayNumber}
                        </p>
                        <span className="text-xs text-slate-500">{daySessions.length} classes</span>
                      </div>
                      <div className="space-y-2">
                        {daySessions.length === 0 && (
                          <p className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">No classes scheduled.</p>
                        )}
                        {daySessions.map((session) => {
                          const status = getSessionStatus(session, Date.now());
                          return (
                            <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50/85 px-3 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-900">{session.title}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(status)}`}>
                                  {statusLabel(status)}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-600">
                                {formatSessionTime(session.startAt)} • {session.subject} • {session.instructor}
                              </p>
                              <button
                                onClick={() => handleStartLiveClass(session)}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#3D08BA] px-3 py-2 text-[11px] font-semibold text-white shadow-[0_12px_24px_-18px_rgba(61,8,186,0.8)] transition hover:-translate-y-0.5 hover:bg-[#2D0690]"
                              >
                                <span className="relative inline-flex">
                                  <FaVideo size={9} />
                                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                </span>
                                Open class
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      {timetableTeacher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center">
            <div className="my-auto flex w-full max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-100 bg-linear-to-r from-sky-50 via-white to-white px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                    <FaCalendarAlt size={10} />
                    Teacher timetable
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">{timetableTeacher.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{timetableTeacher.email}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {[timetableTeacher.department, timetableTeacher.classGroup, timetableTeacher.subjectFocus]
                      .filter(Boolean)
                      .join(' • ') || 'No profile tags yet'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      handleAssignTeacherToClass(timetableTeacher);
                      closeTeacherTimetable();
                    }}
                    className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690]"
                  >
                    Schedule class
                  </button>
                  <button
                    onClick={closeTeacherTimetable}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    aria-label="Close teacher timetable"
                    title="Close teacher timetable"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Assigned classes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {timetableTeacherSessions.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
                      Live now
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-red-700">
                      {timetableTeacherInsight?.liveCount || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                      Upcoming
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">
                      {timetableTeacherInsight?.upcomingCount || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      This week
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">
                      {Object.values(teacherTimetableWeekSessionsByDay).reduce(
                        (count, daySessions) => count + daySessions.length,
                        0
                      )}
                    </p>
                  </div>
                </section>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Weekly teaching load</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Review this teacher&apos;s assigned classes week by week before scheduling more.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1">
                        <button
                          onClick={() => shiftTeacherTimetableWeek(-1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-white"
                          aria-label="Previous teacher timetable week"
                        >
                          <FaChevronLeft size={11} />
                        </button>
                        <p className="px-2 text-xs font-semibold text-gray-700">
                          {formatWeekRangeLabel(teacherTimetableWeekStart)}
                        </p>
                        <button
                          onClick={() => shiftTeacherTimetableWeek(1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-white"
                          aria-label="Next teacher timetable week"
                        >
                          <FaChevronRight size={11} />
                        </button>
                      </div>
                      <button
                        onClick={handleExportTeacherTimetableCsv}
                        disabled={
                          teacherTimetableExportAction !== null || visibleTeacherWeekSessions.length === 0
                        }
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {teacherTimetableExportAction === 'csv'
                          ? 'Exporting CSV...'
                          : 'Export teacher CSV'}
                      </button>
                      <button
                        onClick={() => void handleExportTeacherTimetablePdf()}
                        disabled={
                          teacherTimetableExportAction !== null || visibleTeacherWeekSessions.length === 0
                        }
                        className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {teacherTimetableExportAction === 'pdf'
                          ? 'Exporting PDF...'
                          : 'Export teacher PDF'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 hidden gap-3 lg:grid lg:grid-cols-7">
                    {teacherTimetableWeekDays.map((day) => {
                      const daySessions = teacherTimetableWeekSessionsByDay[day.key] || [];
                      const isToday = getLocalDayKey(new Date()) === day.key;
                      return (
                        <div
                          key={day.key}
                          className={`min-h-[280px] rounded-xl border p-2 ${
                            isToday ? 'border-sky-300 bg-sky-50/80' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="mb-2 border-b border-slate-200 pb-2">
                            <p className="text-xs font-semibold text-slate-700">{day.dayLabel}</p>
                            <p className="text-xs text-slate-500">
                              {day.monthLabel} {day.dayNumber}
                            </p>
                          </div>
                          <div className="space-y-2">
                            {daySessions.length === 0 && (
                              <p className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-3 text-center text-[11px] text-slate-400">
                                Free
                              </p>
                            )}
                            {daySessions.map((session) => {
                              const status = getSessionStatus(session, Date.now());
                              return (
                                <div
                                  key={session.id}
                                  className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="line-clamp-2 text-[11px] font-semibold text-slate-900">
                                      {session.title}
                                    </p>
                                    <span
                                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusPillClass(status)}`}
                                    >
                                      {status === 'live'
                                        ? 'Live'
                                        : status === 'completed'
                                          ? 'Done'
                                          : 'Soon'}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[10px] text-slate-600">
                                    {formatSessionTime(session.startAt)} • {session.durationMinutes}m
                                  </p>
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    {session.subject} • {getSessionAudienceLabel(session)}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <button
                                      onClick={() => handleDuplicateSession(session)}
                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => handleRescheduleSession(session)}
                                      className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-100"
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      onClick={() => handleEditSession(session)}
                                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleStartLiveClass(session)}
                                      className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                    >
                                      {status === 'live' ? 'Rejoin' : 'Open'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 space-y-3 lg:hidden">
                    {teacherTimetableWeekDays.map((day) => {
                      const daySessions = teacherTimetableWeekSessionsByDay[day.key] || [];
                      return (
                        <div key={day.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {day.dayLabel}, {day.monthLabel} {day.dayNumber}
                            </p>
                            <span className="text-xs text-slate-500">{daySessions.length} classes</span>
                          </div>
                          <div className="mt-2 space-y-2">
                            {daySessions.length === 0 && (
                              <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                                No classes assigned.
                              </p>
                            )}
                            {daySessions.map((session) => {
                              const status = getSessionStatus(session, Date.now());
                              return (
                                <div
                                  key={session.id}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-900">{session.title}</p>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(status)}`}
                                    >
                                      {statusLabel(status)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    {formatSessionTime(session.startAt)} • {session.subject}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {getSessionAudienceLabel(session)}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleDuplicateSession(session)}
                                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => handleRescheduleSession(session)}
                                      className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-100"
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      onClick={() => handleEditSession(session)}
                                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleStartLiveClass(session)}
                                      className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                    >
                                      {status === 'live' ? 'Rejoin live' : 'Open class'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkRescheduleOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6">
          <div className="mx-auto flex min-h-full w-full max-w-4xl items-start justify-center">
            <div className="my-auto flex w-full max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-amber-100 bg-linear-to-r from-amber-50 via-white to-white px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    <FaCalendarAlt size={10} />
                    Bulk reschedule
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">
                    Shift visible week
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Move the currently visible non-completed classes in this week by a fixed number of days.
                  </p>
                </div>
                <button
                  onClick={closeBulkReschedule}
                  disabled={activeActionId === 'bulk-reschedule'}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close bulk reschedule"
                  title="Close bulk reschedule"
                >
                  <FaTimes size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
                <section className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Week range
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatWeekRangeLabel(weekStartDate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Classes to move
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-700">
                      {bulkRescheduleCandidates.length}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Completed classes are ignored.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Visible filter
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {filter === 'all' ? 'All visible classes' : statusLabel(filter)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Search: {searchQuery.trim() || 'None'}
                    </p>
                  </div>
                </section>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Shift settings</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Positive numbers move classes forward. Negative numbers move them backward.
                  </p>
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">
                        Shift by days
                      </label>
                      <input
                        type="number"
                        step={1}
                        value={bulkRescheduleDays}
                        onChange={(event) => setBulkRescheduleDays(event.target.value)}
                        className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[-7, -1, 1, 7, 14].map((value) => (
                        <button
                          key={value}
                          onClick={() => setBulkRescheduleDays(String(value))}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            bulkRescheduleDays === String(value)
                              ? 'border-[#3D08BA]/30 bg-[#3D08BA]/10 text-[#3D08BA]'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {value > 0 ? `+${value}` : value} day{Math.abs(value) === 1 ? '' : 's'}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {bulkReschedulePreview.length > 0 && (
                  <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-amber-800">
                      Possible conflicts after shift
                    </h3>
                    <p className="mt-1 text-xs text-amber-700">
                      These are clashes with classes outside the visible bulk-reschedule set. The backend will still do the final validation.
                    </p>
                    <div className="mt-4 space-y-3">
                      {bulkReschedulePreview.map((item) => (
                        <div
                          key={item.session.id}
                          className="rounded-xl border border-amber-200 bg-white p-3"
                        >
                          <p className="text-xs font-semibold text-slate-900">{item.session.title}</p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            New time: {formatDateTime(item.shiftedStart.toISOString())}
                          </p>
                          <div className="mt-2 space-y-2">
                            {item.conflicts.map((conflict) => (
                              <div
                                key={`${item.session.id}-${conflict.session.id}`}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-slate-700"
                              >
                                <p className="font-semibold text-slate-900">{conflict.session.title}</p>
                                <p className="mt-1 text-slate-600">
                                  {formatDateTime(conflict.session.startAt)} • {conflict.reasons.join(' • ')}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {bulkRescheduleCandidates.length === 0 && (
                  <section className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500 shadow-sm">
                    There are no visible live or upcoming classes in this week to move.
                  </section>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
                <button
                  onClick={closeBulkReschedule}
                  disabled={activeActionId === 'bulk-reschedule'}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleApplyBulkReschedule()}
                  disabled={activeActionId === 'bulk-reschedule' || bulkRescheduleCandidates.length === 0}
                  className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {activeActionId === 'bulk-reschedule'
                    ? 'Shifting...'
                    : `Shift ${bulkRescheduleCandidates.length} class${
                        bulkRescheduleCandidates.length === 1 ? '' : 'es'
                      }`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl items-start justify-center">
            <div className="my-auto w-full overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {sessionDraftMode === 'duplicate'
                    ? 'Duplicate Class Draft'
                    : sessionDraftMode === 'reschedule'
                      ? 'Reschedule Class'
                      : editingSessionId
                        ? 'Edit Scheduled Class'
                        : 'Add New Class to Schedule'}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {sessionDraftMode === 'duplicate'
                    ? 'Start from an existing class, adjust the date or audience, then save as a new schedule.'
                    : sessionDraftMode === 'reschedule'
                      ? 'Move the class to a new date or time without rebuilding it.'
                      : editingSessionId
                        ? 'Update teacher, timing, and class audience without removing the session.'
                        : 'Set the teacher, audience, and time for the next class.'}
                </p>
                {sessionDraftOrigin && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        sessionDraftMode === 'duplicate'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          : sessionDraftMode === 'reschedule'
                            ? 'border border-sky-200 bg-sky-50 text-sky-700'
                            : 'border border-gray-200 bg-gray-50 text-gray-600'
                      }`}
                    >
                      {sessionDraftMode === 'duplicate'
                        ? 'Duplicating class'
                        : sessionDraftMode === 'reschedule'
                          ? 'Rescheduling class'
                          : 'Editing class'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {sessionDraftOrigin.title} • {formatDateTime(sessionDraftOrigin.startAt)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  if (activeActionId === 'save-session') {
                    return;
                  }
                  setIsCreateOpen(false);
                  resetForm();
                }}
                disabled={activeActionId === 'save-session'}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto">
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Assign from roster</label>
                <select
                  value={formState.assignedTutorEmail}
                  onChange={(event) => {
                    const selectedEmail = event.target.value;
                    const selectedTeacher = teacherRoster.find(
                      (teacher) => teacher.email === selectedEmail
                    );
                    if (!selectedTeacher) {
                      setFormState((prev) => ({
                        ...prev,
                        assignedTutorEmail: '',
                        assignedTutorName: '',
                      }));
                      return;
                    }
                    setFormState((prev) => ({
                      ...prev,
                      instructor: selectedTeacher.name || prev.instructor,
                      assignedTutorEmail: selectedTeacher.email,
                      assignedTutorName: selectedTeacher.name,
                      department: selectedTeacher.department || prev.department,
                      classGroup: selectedTeacher.classGroup || prev.classGroup,
                    }));
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-600 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                >
                  <option value="">Select a teacher (optional)</option>
                  {teacherRoster
                    .filter((teacher) => teacher.isActive)
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.email}>
                        {teacher.name} • {teacher.email}
                      </option>
                    ))}
                </select>
              </div>
              {selectedAssignedTeacher && (
                <div className="sm:col-span-2 rounded-xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#3D08BA]">
                        {selectedAssignedTeacher.name}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-600">
                        {[selectedAssignedTeacher.department, selectedAssignedTeacher.classGroup, selectedAssignedTeacher.subjectFocus]
                          .filter(Boolean)
                          .join(' • ') || 'No profile tags yet'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
                      <span className="rounded-full border border-white/70 bg-white px-2 py-1 text-slate-600">
                        Live: {selectedTeacherInsight?.liveCount || 0}
                      </span>
                      <span className="rounded-full border border-white/70 bg-white px-2 py-1 text-slate-600">
                        Upcoming: {selectedTeacherInsight?.upcomingCount || 0}
                      </span>
                      <span className="rounded-full border border-white/70 bg-white px-2 py-1 text-slate-600">
                        This week: {selectedTeacherInsight?.weekCount || 0}
                      </span>
                    </div>
                  </div>
                  {selectedTeacherInsight?.nextSession && (
                    <p className="mt-2 text-[11px] text-gray-600">
                      Next assigned class: {selectedTeacherInsight.nextSession.title} •{' '}
                      {formatDateTime(selectedTeacherInsight.nextSession.startAt)}
                    </p>
                  )}
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Class title</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. SS2 Biology Practicals"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Subject</label>
                <input
                  value={formState.subject}
                  onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="Biology"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Lead teacher / Instructor</label>
                <input
                  value={formState.instructor}
                  onChange={(event) => setFormState((prev) => ({ ...prev, instructor: event.target.value }))}
                  placeholder="Teacher name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Assigned teacher email</label>
                <input
                  type="email"
                  value={formState.assignedTutorEmail}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, assignedTutorEmail: event.target.value }))
                  }
                  placeholder="teacher@school.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Use the teacher&apos;s sign-in email. They can join even if their default account role is not tutor.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Assigned teacher name</label>
                <input
                  value={formState.assignedTutorName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, assignedTutorName: event.target.value }))
                  }
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Department</label>
                <input
                  value={formState.department}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, department: event.target.value }))
                  }
                  placeholder="e.g. Science"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Class group / Level</label>
                <input
                  value={formState.classGroup}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, classGroup: event.target.value }))
                  }
                  placeholder="e.g. SS2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Audience tag</label>
                <input
                  value={formState.audienceTag}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, audienceTag: event.target.value }))
                  }
                  placeholder="Optional override, e.g. SS2 Science"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Start date and time</label>
                <div className="space-y-2">
                  <input
                    type="datetime-local"
                    value={formState.startAt}
                    onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-gray-500">Jump year:</label>
                    <select
                      value={
                        formState.startAt && Number.isFinite(new Date(formState.startAt).getTime())
                          ? String(new Date(formState.startAt).getFullYear())
                          : ''
                      }
                      onChange={(event) => handleStartAtYearChange(event.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
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
                      value={
                        formState.startAt && Number.isFinite(new Date(formState.startAt).getTime())
                          ? String(new Date(formState.startAt).getMonth() + 1)
                          : ''
                      }
                      onChange={(event) => handleStartAtMonthChange(event.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
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
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Duration (minutes)</label>
                <input
                  type="number"
                  min={15}
                  step={5}
                  value={formState.durationMinutes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Attendance grace period (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={formState.attendanceGracePeriodMinutes}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      attendanceGracePeriodMinutes: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Students who check in after this window are marked late.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Expected students</label>
                <input
                  type="number"
                  min={0}
                  value={formState.expectedStudents}
                  onChange={(event) => setFormState((prev) => ({ ...prev, expectedStudents: event.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Class notes</label>
                <textarea
                  value={formState.notes}
                  onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Optional context for assigned teachers and school admins."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>
              {scheduleConflictPreview.length > 0 && (
                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-800">
                        {sessionDraftMode === 'duplicate'
                          ? 'Duplicate draft has schedule clashes'
                          : sessionDraftMode === 'reschedule'
                            ? 'New time creates schedule clashes'
                            : 'Potential clash detected'}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-700">
                        These overlaps are based on the schedule already loaded on this page. The backend will still do the final check.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      {scheduleConflictSummary.teacher > 0 && (
                        <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-700">
                          Teacher clashes: {scheduleConflictSummary.teacher}
                        </span>
                      )}
                      {scheduleConflictSummary.audience > 0 && (
                        <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-700">
                          Audience clashes: {scheduleConflictSummary.audience}
                        </span>
                      )}
                      {scheduleConflictSummary.instructor > 0 && (
                        <span className="rounded-full border border-amber-200 bg-white px-2 py-1 text-amber-700">
                          Instructor clashes: {scheduleConflictSummary.instructor}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {scheduleConflictPreview.map(({ session, reasons }) => (
                      <div
                        key={session.id}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px] text-gray-700"
                      >
                        <p className="font-semibold text-gray-900">{session.title}</p>
                        <p className="mt-1 text-gray-600">
                          {formatDateTime(session.startAt)} • {reasons.join(' • ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
              <button
                onClick={() => {
                  if (activeActionId === 'save-session') {
                    return;
                  }
                  setIsCreateOpen(false);
                  resetForm();
                }}
                disabled={activeActionId === 'save-session'}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSession}
                disabled={activeActionId === 'save-session'}
                className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeActionId === 'save-session'
                  ? editingSessionId
                    ? 'Updating...'
                    : 'Saving...'
                  : editingSessionId
                    ? 'Update class'
                    : 'Save class'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {isAttendanceReportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-start justify-center">
            <div className="my-auto flex w-full max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-[#3D08BA]/10 bg-linear-to-r from-[#f4efff] via-white to-white px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                    <FaUsers size={10} />
                    Attendance range report
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">Attendance across classes</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Generate a report from the current schedule filters, then narrow it by date range and attendance status.
                  </p>
                </div>
                <button
                  onClick={closeAttendanceReport}
                  disabled={isAttendanceReportLoading || attendanceReportExportAction !== null}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close attendance report"
                  title="Close attendance report"
                >
                  <FaTimes size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
                <div className="space-y-5">
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Date from
                          </label>
                          <input
                            type="date"
                            value={attendanceReportStartDate}
                            onChange={(event) => setAttendanceReportStartDate(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Date to
                          </label>
                          <input
                            type="date"
                            value={attendanceReportEndDate}
                            onChange={(event) => setAttendanceReportEndDate(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                          />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Candidate classes
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {attendanceReportCandidateSessions.length}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Based on the current search and status filter
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Generated rows
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{attendanceReportRows.length}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {attendanceReportItems.length === 0 ? 'Generate the report first' : 'Rows after status filter'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleGenerateAttendanceReport()}
                          disabled={isAttendanceReportLoading}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(61,8,186,0.82)] transition hover:-translate-y-0.5 hover:bg-[#2F078F] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAttendanceReportLoading ? 'Generating...' : 'Generate report'}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportAttendanceRangeCsv}
                          disabled={attendanceReportExportAction !== null || attendanceReportRows.length === 0}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {attendanceReportExportAction === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleExportAttendanceRangePdf()}
                          disabled={attendanceReportExportAction !== null || attendanceReportRows.length === 0}
                          className="rounded-2xl border border-[#3D08BA]/20 bg-[#3D08BA]/6 px-4 py-2.5 text-sm font-semibold text-[#3D08BA] transition hover:-translate-y-0.5 hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {attendanceReportExportAction === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Classes</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceReportSummary.sessionCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Expected</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{attendanceReportSummary.expectedStudents}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Present</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-700">{attendanceReportSummary.presentCount}</p>
                    </div>
                    <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">Late</p>
                      <p className="mt-2 text-2xl font-semibold text-orange-700">{attendanceReportSummary.lateCount}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pending</p>
                      <p className="mt-2 text-2xl font-semibold text-amber-700">{attendanceReportSummary.pendingCount}</p>
                    </div>
                    <div className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">Coverage</p>
                      <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">{attendanceReportCoverage}%</p>
                    </div>
                  </section>

                  {attendanceReportItems.length > 0 && (
                    <>
                      <section className="grid gap-5 xl:grid-cols-2">
                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">Teacher attendance trend</h3>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Average attendance coverage across the generated classes, with movement against the previous session.
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {attendanceReportTeacherTrends.length} teacher{attendanceReportTeacherTrends.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {attendanceReportTeacherTrends.slice(0, 5).map((trend) => (
                              <article key={trend.key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{trend.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">{trend.secondaryLabel}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">{trend.averageCoverage}%</p>
                                    <p
                                      className={`mt-1 text-[11px] font-medium ${
                                        trend.deltaCoverage === null
                                          ? 'text-slate-400'
                                          : trend.deltaCoverage >= 0
                                            ? 'text-emerald-600'
                                            : 'text-rose-600'
                                      }`}
                                    >
                                      {trend.deltaCoverage === null
                                        ? 'Need 2 sessions for trend'
                                        : `${trend.deltaCoverage >= 0 ? '+' : ''}${trend.deltaCoverage} pts vs previous`}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-slate-200">
                                  <div
                                    className="h-2 rounded-full bg-[#3D08BA]"
                                    style={{ width: `${Math.max(6, trend.averageCoverage)}%` }}
                                  />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                                  <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                    Attended: {trend.attendedCount}/{trend.expectedStudents || 0}
                                  </span>
                                  <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                    Late: {trend.lateCount}
                                  </span>
                                  {trend.latestCoverage !== null && (
                                    <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                      Latest: {trend.latestCoverage}%
                                    </span>
                                  )}
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">Class audience trend</h3>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Coverage trend by class group or department audience across the selected report period.
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {attendanceReportAudienceTrends.length} audience{attendanceReportAudienceTrends.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {attendanceReportAudienceTrends.slice(0, 5).map((trend) => (
                              <article key={trend.key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{trend.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">{trend.secondaryLabel}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-900">{trend.averageCoverage}%</p>
                                    <p
                                      className={`mt-1 text-[11px] font-medium ${
                                        trend.deltaCoverage === null
                                          ? 'text-slate-400'
                                          : trend.deltaCoverage >= 0
                                            ? 'text-emerald-600'
                                            : 'text-rose-600'
                                      }`}
                                    >
                                      {trend.deltaCoverage === null
                                        ? 'Need 2 sessions for trend'
                                        : `${trend.deltaCoverage >= 0 ? '+' : ''}${trend.deltaCoverage} pts vs previous`}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-slate-200">
                                  <div
                                    className="h-2 rounded-full bg-emerald-500"
                                    style={{ width: `${Math.max(6, trend.averageCoverage)}%` }}
                                  />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                                  <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                    Attended: {trend.attendedCount}/{trend.expectedStudents || 0}
                                  </span>
                                  <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                    Late: {trend.lateCount}
                                  </span>
                                  {trend.latestCoverage !== null && (
                                    <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                      Latest: {trend.latestCoverage}%
                                    </span>
                                  )}
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Recent session coverage</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Track how individual classes performed over time and spot sessions with low attendance coverage quickly.
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Latest {Math.min(attendanceReportSessionTrends.length, 6)} sessions
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {attendanceReportSessionTrends.slice(0, 6).map((trend) => (
                            <article key={trend.sessionId} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{trend.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {trend.subject} • {trend.instructor} • {trend.audience}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(trend.startAt)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-900">{trend.coverage}%</p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {trend.attendedCount}/{trend.expectedStudents || 0} attended
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 h-2 rounded-full bg-slate-200">
                                <div
                                  className={`h-2 rounded-full ${
                                    trend.coverage >= 75
                                      ? 'bg-emerald-500'
                                      : trend.coverage >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.max(6, trend.coverage)}%` }}
                                />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                                <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                  Late: {trend.lateCount}
                                </span>
                                <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                  Pending: {trend.pendingCount}
                                </span>
                                <span className="rounded-full border border-white bg-white px-2.5 py-1 text-slate-600">
                                  Absent: {trend.absentCount}
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    </>
                  )}

                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Attendance rows</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Filter the generated report by attendance status, then export the exact view you need.
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {attendanceReportRows.length} row{attendanceReportRows.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(['all', 'present', 'late', 'pending', 'absent'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAttendanceReportFilter(value)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                            attendanceReportFilter === value
                              ? value === 'present'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : value === 'late'
                                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                                  : value === 'pending'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : value === 'absent'
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-[#3D08BA]/20 bg-[#3D08BA]/6 text-[#3D08BA]'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {attendanceFilterLabel(value)}
                        </button>
                      ))}
                    </div>

                    {attendanceReportItems.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        Generate a report to see class attendance across the selected date range.
                      </div>
                    ) : attendanceReportRows.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                        No {attendanceFilterLabel(attendanceReportFilter).toLowerCase()} rows in this attendance report.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {attendanceReportRows.map((row, index) => (
                          <article
                            key={`${row.sessionId}-${row.participantId || row.participantName}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{row.participantName}</p>
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                      row.status === 'present'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : row.status === 'late'
                                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                                          : row.status === 'pending'
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-rose-200 bg-rose-50 text-rose-700'
                                    }`}
                                  >
                                    {attendanceFilterLabel(row.status)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {row.participantId ? `ID: ${row.participantId}` : 'No student ID attached'}
                                </p>
                                <p className="mt-2 text-xs font-medium text-slate-700">
                                  {row.sessionTitle} • {row.sessionSubject} • {row.sessionAudience}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {formatDateTime(row.sessionStartAt)}
                                </p>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <div className="rounded-xl border border-white bg-white px-3 py-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Checked in</p>
                                  <p className="mt-1 text-xs font-medium text-slate-700">{formatAttendanceMoment(row.checkedInAt)}</p>
                                </div>
                                <div className="rounded-xl border border-white bg-white px-3 py-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duration</p>
                                  <p className="mt-1 text-xs font-medium text-slate-700">
                                    {row.durationMinutes !== null ? `${row.durationMinutes} min` : 'Not recorded'}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-white bg-white px-3 py-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Source</p>
                                  <p className="mt-1 text-xs font-medium text-slate-700">
                                    {row.source === 'check_in' ? 'Student check-in' : row.source === 'live' ? 'Live presence' : 'Manual'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {row.note && (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                {row.note}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {attendanceTargetSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6">
          <div className="mx-auto flex min-h-full w-full max-w-5xl items-start justify-center">
            <div className="my-auto flex w-full max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-emerald-100 bg-linear-to-r from-emerald-50 via-white to-white px-6 py-5">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <FaUsers size={10} />
                    Attendance
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-slate-900">
                    {attendanceTargetSession.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {attendanceTargetSession.subject} • {attendanceTargetSession.classGroup || 'All classes'} •{' '}
                    {formatDateTime(attendanceTargetSession.startAt)}
                  </p>
                </div>
                <button
                  onClick={closeAttendanceModal}
                  disabled={Boolean(attendanceBusyId)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Close attendance"
                  title="Close attendance"
                >
                  <FaTimes size={12} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50/70 px-6 py-5">
                {isAttendanceLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                    Loading attendance...
                  </div>
                )}

                {!isAttendanceLoading && attendancePayload && (
                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-emerald-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                attendancePayload.window.isOpen
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  attendancePayload.window.isOpen ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {attendancePayload.window.isOpen ? 'Attendance window open' : 'Attendance window closed'}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {attendancePayload.summary.checkedInCount} checked in
                            </span>
                            {attendancePayload.summary.lateCount > 0 && (
                              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                                {attendancePayload.summary.lateCount} late
                              </span>
                            )}
                            {attendancePayload.summary.pendingCount > 0 && (
                              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                {attendancePayload.summary.pendingCount} waiting to confirm
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-sm font-semibold text-slate-900">
                            Live attendance confirmation
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Students first appear as connected. They become fully present after tapping the attendance
                            button inside the live classroom while the window is open. Check-ins after{' '}
                            {attendancePayload.window.gracePeriodMinutes} minutes are recorded as late.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Last opened
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-700">
                              {formatAttendanceMoment(attendancePayload.window.openedAt)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Opened by
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-700">
                              {attendancePayload.window.openedByName || 'Teacher'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-8">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Expected
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {attendancePayload.summary.expectedStudents}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          Present
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-700">
                          {attendancePayload.summary.presentCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                          Absent
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-rose-700">
                          {attendancePayload.summary.absentCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                          Checked in
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">
                          {attendancePayload.summary.checkedInCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">
                          Late
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-orange-700">
                          {attendancePayload.summary.lateCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Pending
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-amber-700">
                          {attendancePayload.summary.pendingCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                          In class now
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-sky-700">
                          {attendancePayload.summary.liveCount}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                          Coverage
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#3D08BA]">
                          {attendancePayload.summary.attendanceRate}%
                        </p>
                      </div>
                    </section>

                    <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Mark attendance manually</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Use this for late corrections, offline learners, or students the live room did not capture.
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Manual
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Student name
                            </label>
                            <input
                              value={attendanceForm.participantName}
                              onChange={(event) =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  participantName: event.target.value,
                                }))
                              }
                              placeholder="Enter student name"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Student ID
                            </label>
                            <input
                              value={attendanceForm.participantId}
                              onChange={(event) =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  participantId: event.target.value,
                                }))
                              }
                              placeholder="Optional admission number"
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Status
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {(['present', 'absent'] as const).map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    setAttendanceForm((prev) => ({
                                      ...prev,
                                      status: value,
                                    }))
                                  }
                                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                    attendanceForm.status === value
                                      ? value === 'present'
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-300 bg-amber-50 text-amber-700'
                                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {value === 'present' ? 'Present' : 'Absent'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              Note
                            </label>
                            <textarea
                              value={attendanceForm.note}
                              onChange={(event) =>
                                setAttendanceForm((prev) => ({
                                  ...prev,
                                  note: event.target.value,
                                }))
                              }
                              rows={4}
                              placeholder="Optional note, e.g. Excused, joined from shared device."
                              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleManualAttendanceSubmit()}
                          disabled={attendanceBusyId === 'manual'}
                          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#3D08BA] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {attendanceBusyId === 'manual' ? 'Saving attendance...' : 'Save attendance'}
                        </button>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">Attendance register</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Live learners are captured automatically. You can still correct any record below.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {filteredAttendanceRecords.length} record
                              {filteredAttendanceRecords.length === 1 ? '' : 's'}
                            </span>
                            <button
                              type="button"
                              onClick={handleExportAttendanceCsv}
                              disabled={attendanceExportAction !== null || filteredAttendanceRecords.length === 0}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {attendanceExportAction === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleExportAttendancePdf()}
                              disabled={attendanceExportAction !== null || filteredAttendanceRecords.length === 0}
                              className="rounded-xl border border-[#3D08BA]/20 bg-[#3D08BA]/6 px-3 py-2 text-[11px] font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {attendanceExportAction === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(['all', 'present', 'late', 'pending', 'absent'] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setAttendanceFilter(value)}
                              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                                attendanceFilter === value
                                  ? value === 'present'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : value === 'late'
                                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                                      : value === 'pending'
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : value === 'absent'
                                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                                          : 'border-[#3D08BA]/20 bg-[#3D08BA]/6 text-[#3D08BA]'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {attendanceFilterLabel(value)}
                            </button>
                          ))}
                        </div>

                        {filteredAttendanceRecords.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                            {attendancePayload.records.length === 0
                              ? 'No attendance record yet. Live join events or manual entries will appear here.'
                              : `No ${attendanceFilterLabel(attendanceFilter).toLowerCase()} attendance record in this view yet.`}
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {filteredAttendanceRecords.map((record) => {
                              const isUpdating = attendanceBusyId === record.id;
                              const statusClass =
                                record.status === 'present'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : record.status === 'late'
                                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                                  : record.status === 'pending'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700';
                              const sourceClass =
                                record.source === 'live'
                                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                                  : record.source === 'check_in'
                                    ? 'border-[#3D08BA]/15 bg-[#3D08BA]/5 text-[#3D08BA]'
                                  : 'border-slate-200 bg-slate-50 text-slate-600';
                              const statusLabel =
                                record.status === 'present'
                                  ? 'Present'
                                  : record.status === 'late'
                                    ? 'Late'
                                  : record.status === 'pending'
                                    ? 'Pending'
                                    : 'Absent';
                              const sourceLabel =
                                record.source === 'live'
                                  ? 'Live presence'
                                  : record.source === 'check_in'
                                    ? 'Student check-in'
                                    : 'Manual';

                              return (
                                <div
                                  key={record.id}
                                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900">
                                          {record.participantName}
                                        </p>
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass}`}
                                        >
                                          {statusLabel}
                                        </span>
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${sourceClass}`}
                                        >
                                          {sourceLabel}
                                        </span>
                                        {record.isLive && (
                                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
                                            In class
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {record.participantId
                                          ? `ID: ${record.participantId}`
                                          : 'No student ID attached'}
                                      </p>
                                      {record.status === 'pending' && (
                                        <p className="mt-2 text-xs text-amber-700">
                                          Connected to class but has not tapped the live attendance button yet.
                                        </p>
                                      )}
                                      {record.status === 'late' && (
                                        <p className="mt-2 text-xs text-orange-700">
                                          Attendance was confirmed after the {attendancePayload.window.gracePeriodMinutes}-minute grace period.
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleAttendanceStatusUpdate(record, 'present')
                                        }
                                        disabled={isUpdating || record.status === 'present'}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Mark present
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleAttendanceStatusUpdate(record, 'absent')}
                                        disabled={isUpdating || record.status === 'absent'}
                                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Mark absent
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Joined
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">
                                        {formatAttendanceMoment(record.joinedAt)}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Last seen
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">
                                        {formatAttendanceMoment(record.lastSeenAt)}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Left class
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">
                                        {formatAttendanceMoment(record.leftAt)}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Checked in
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">
                                        {formatAttendanceMoment(record.checkedInAt)}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-white bg-white px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Duration
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-700">
                                        {record.durationMinutes !== null
                                          ? `${record.durationMinutes} min`
                                          : 'Not recorded'}
                                      </p>
                                    </div>
                                  </div>

                                  {record.note && (
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                      {record.note}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <NavBar activeTab="reports" />
    </div>
  );
};

export default SchoolSchedule;
