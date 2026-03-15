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
  const [attendanceTargetSession, setAttendanceTargetSession] = useState<SchoolScheduleSession | null>(null);
  const [attendancePayload, setAttendancePayload] = useState<SchoolScheduleAttendanceResponse | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceBusyId, setAttendanceBusyId] = useState<string | null>(null);
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

    if (!title || !subject || !instructor || !startAt) {
      setNotice('Please complete title, subject, instructor, and start time before saving.');
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setNotice('Class duration should be a valid number of minutes.');
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
    setAttendanceForm({
      participantName: '',
      participantId: '',
      status: 'absent',
      note: '',
    });
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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 pb-24">
      <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/school-dashboard')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3D08BA]/20 bg-white text-[#3D08BA] hover:bg-[#3D08BA]/5"
                aria-label="Back to school dashboard"
                title="Back to school dashboard"
              >
                <FaArrowLeft size={13} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#3D08BA]">Class Schedule Workspace</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Plan live and offline classes with clear timing and teacher ownership.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3D08BA] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2D0690]"
            >
              <FaPlus size={12} />
              Add Class
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {notice}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">All classes</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{scheduleStats.all}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Live now</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{scheduleStats.live}</p>
          </div>
          <div className="rounded-xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Upcoming</p>
            <p className="mt-1 text-2xl font-bold text-[#3D08BA]">{scheduleStats.upcoming}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">Completed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{scheduleStats.completed}</p>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] grow">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by class, subject, teacher, or room code..."
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" size={13} />
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-600">
                <FaFilter size={10} />
                Filter
              </span>
              {(['all', 'live', 'upcoming', 'completed'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                    filter === value
                      ? 'bg-[#3D08BA] text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {value === 'all' ? 'All' : statusLabel(value)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'list'
                    ? 'bg-[#3D08BA] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FaListUl size={11} />
                List
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'week'
                    ? 'bg-[#3D08BA] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FaTable size={11} />
                Week Grid
              </button>
            </div>

            {viewMode === 'week' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1 py-1">
                  <button
                    onClick={() => shiftWeek(-1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-white"
                    aria-label="Previous week"
                  >
                    <FaChevronLeft size={11} />
                  </button>
                  <p className="px-2 text-xs font-semibold text-gray-700">
                    {formatWeekRangeLabel(weekStartDate)}
                  </p>
                  <button
                    onClick={() => shiftWeek(1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-white"
                    aria-label="Next week"
                  >
                    <FaChevronRight size={11} />
                  </button>
                </div>
                <button
                  onClick={openBulkReschedule}
                  disabled={activeActionId !== null || bulkRescheduleCandidates.length === 0}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Shift visible week
                </button>
                <button
                  onClick={handleExportWeeklyTimetableCsv}
                  disabled={timetableExportAction !== null || visibleWeekSessions.length === 0}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {timetableExportAction === 'csv' ? 'Exporting CSV...' : 'Export week CSV'}
                </button>
                <button
                  onClick={() => void handleExportWeeklyTimetablePdf()}
                  disabled={timetableExportAction !== null || visibleWeekSessions.length === 0}
                  className="rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {timetableExportAction === 'pdf' ? 'Exporting PDF...' : 'Export week PDF'}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Teacher roster</h2>
              <p className="mt-1 text-xs text-gray-600">
                Keep a trusted list of teachers to assign quickly when scheduling classes.
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                This roster is for your internal school teachers. Need external teachers? Use Tutor Directory.
              </p>
            </div>
            <div className="min-w-[220px]">
              <input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search teachers..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500">Status:</label>
              <select
                value={teacherInviteFilter}
                onChange={(event) =>
                  setTeacherInviteFilter(
                    event.target.value as 'all' | 'invited' | 'accepted' | 'inactive'
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              >
                <option value="all">All</option>
                <option value="invited">Invited</option>
                <option value="accepted">Accepted</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              onClick={() => void handleResendPendingInvites()}
              disabled={Boolean(activeTeacherActionId)}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeTeacherActionId === 'bulk-invite' ? 'Resending...' : 'Resend pending invites'}
            </button>
            <button
              onClick={handleExportInvitedTeachersCsv}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Export invited CSV
            </button>
          </div>

          {teacherNotice && (
            <div className="mt-3 rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs text-[#3D08BA]">
              {teacherNotice}
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Total teachers</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{teacherRosterStats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Active</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{teacherRosterStats.activeCount}</p>
            </div>
            <div className="rounded-xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">Accepted</p>
              <p className="mt-1 text-xl font-semibold text-[#3D08BA]">{teacherRosterStats.acceptedCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Busy this week</p>
              <p className="mt-1 text-xl font-semibold text-amber-700">{teacherRosterStats.weekLoadCount}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1.1fr_1.8fr]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">
                {editingTeacherId ? 'Edit teacher profile' : 'Add teacher'}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                {editingTeacherId
                  ? 'Update the teacher profile, class ownership, and subject coverage without removing the teacher from your roster.'
                  : 'Add the same email the teacher uses to sign in. They will access classes via generated teacher link + code.'}
              </p>
              <div className="mt-3 space-y-2">
                <input
                  value={teacherForm.name}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <input
                  value={teacherForm.email}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <input
                  value={teacherForm.department}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, department: event.target.value }))}
                  placeholder="Department (optional)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <input
                  value={teacherForm.classGroup}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, classGroup: event.target.value }))}
                  placeholder="Class group (optional)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
                <input
                  value={teacherForm.subjectFocus}
                  onChange={(event) => setTeacherForm((prev) => ({ ...prev, subjectFocus: event.target.value }))}
                  placeholder="Subject focus (optional)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>
              <button
                onClick={handleCreateTeacher}
                disabled={isTeacherSubmitting}
                className="mt-3 w-full rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTeacherSubmitting
                  ? 'Saving...'
                  : editingTeacherId
                    ? 'Save teacher changes'
                    : 'Add teacher'}
              </button>
              {editingTeacherId && (
                <button
                  onClick={resetTeacherForm}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel edit
                </button>
              )}
              <button
                onClick={() => navigate('/tutor-list-school')}
                className="mt-2 w-full rounded-lg border border-[#3D08BA]/20 bg-white px-3 py-2 text-xs font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/5"
              >
                Need to hire? Browse tutor directory
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-700">Invite activity</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInviteActivityFilter('all')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      inviteActivityFilter === 'all'
                        ? 'border-[#3D08BA]/30 bg-[#3D08BA]/10 text-[#3D08BA]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setInviteActivityFilter('accepted')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      inviteActivityFilter === 'accepted'
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Accepted
                  </button>
                  <button
                    onClick={() => setInviteActivityFilter('pending')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      inviteActivityFilter === 'pending'
                        ? 'border-amber-300 bg-amber-100 text-amber-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => void refreshInviteActivity()}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {isInviteActivityLoading && (
                <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] text-gray-500">
                  Loading invite activity...
                </p>
              )}

              {!isInviteActivityLoading && filteredInviteActivity.length === 0 && (
                <p className="mt-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2 py-4 text-center text-[11px] text-gray-500">
                  No invite activity for this filter yet.
                </p>
              )}

              <div className="mt-2 space-y-2">
                {filteredInviteActivity.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-lg border px-2.5 py-2 ${
                      event.kind === 'teacher_access_accepted'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {event.kind === 'teacher_access_accepted' && (
                          <FaCheckCircle className="text-[11px] text-emerald-600" />
                        )}
                        <p className="text-[11px] font-semibold text-gray-800">{event.title}</p>
                      </div>
                      <span className="text-[10px] text-gray-500">{event.createdAtLabel}</span>
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${inviteActivityTypeClass(
                          event.kind
                        )}`}
                      >
                        {inviteActivityTypeLabel(event.kind)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-600">{event.message}</p>
                    <button
                      onClick={() => jumpToSessionFromActivity(event.sessionId)}
                      className="mt-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Open class
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              {isTeacherLoading && (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Loading teacher roster...
                </p>
              )}

              {!isTeacherLoading && filteredTeachers.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
                  No teachers match this search yet.
                </div>
              )}

              <div className="space-y-2">
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"
                  >
                    <div className="min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900">{teacher.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${teacherInviteStatusClass(
                            teacher
                          )}`}
                        >
                          {teacherInviteStatusLabel(teacher)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">{teacher.email}</p>
                      <p className="text-[11px] text-gray-500">
                        {[teacher.department, teacher.classGroup, teacher.subjectFocus]
                          .filter(Boolean)
                          .join(' • ') || 'No tags yet'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Live now: {teacherInsights.get(teacher.email)?.liveCount || 0}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          Upcoming: {teacherInsights.get(teacher.email)?.upcomingCount || 0}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
                          This week: {teacherInsights.get(teacher.email)?.weekCount || 0}
                        </span>
                      </div>
                      {teacherInsights.get(teacher.email)?.nextSession && (
                        <p className="mt-2 text-[10px] text-gray-500">
                          Next class:{' '}
                          {teacherInsights.get(teacher.email)?.nextSession?.title} •{' '}
                          {formatDateTime(teacherInsights.get(teacher.email)?.nextSession?.startAt || '')}
                        </p>
                      )}
                      {teacher.lastInviteSentAt && (
                        <p className="text-[10px] text-gray-500">
                          Invite sent: {new Date(teacher.lastInviteSentAt).toLocaleString()}
                        </p>
                      )}
                      {teacher.lastInviteChannel && (
                        <p className="text-[10px] text-gray-500">
                          Channel:{' '}
                          {teacher.lastInviteChannel === 'in_app'
                            ? 'In-app'
                            : teacher.lastInviteChannel === 'email'
                              ? 'Email'
                              : 'In-app + Email'}
                        </p>
                      )}
                      {teacher.lastInviteDeliveryNote && (
                        <p className="text-[10px] text-gray-500">{teacher.lastInviteDeliveryNote}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openTeacherTimetable(teacher)}
                        className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                      >
                        Timetable
                      </button>
                      <button
                        onClick={() => handleEditTeacher(teacher)}
                        disabled={Boolean(activeTeacherActionId)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1">
                          <FaEdit size={10} />
                          Edit
                        </span>
                      </button>
                      <button
                        onClick={() => handleAssignTeacherToClass(teacher)}
                        className="rounded-lg border border-[#3D08BA]/20 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                      >
                        Assign to class
                      </button>
                      <button
                        onClick={() => handleResendTeacherInvite(teacher)}
                        disabled={Boolean(activeTeacherActionId) || !teacher.isActive}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeTeacherActionId === `invite-${teacher.id}`
                          ? 'Sending...'
                          : 'Resend invite'}
                      </button>
                      <button
                        onClick={() => handleToggleTeacher(teacher)}
                        disabled={Boolean(activeTeacherActionId)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeTeacherActionId === `remove-${teacher.id}` ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {isLoading && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  Loading school schedule sessions...
                </div>
              )}

              {!isLoading && filteredSessions.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                  <FaCalendarAlt className="mx-auto mb-3 text-4xl text-gray-300" />
                  <h3 className="text-base font-semibold text-gray-900">No classes match your filters</h3>
                  <p className="mt-1 text-sm text-gray-600">Try another search or add a new class to this schedule.</p>
                </div>
              )}

              {filteredSessions.map((session) => {
                const status = getSessionStatus(session, Date.now());
                const acceptedEvent = acceptedInviteBySessionId.get(session.id);
                return (
                  <article
                    key={session.id}
                    ref={(element) => {
                      sessionCardRefs.current[session.id] = element;
                    }}
                    className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
                      highlightedSessionId === session.id
                        ? 'border-emerald-300 ring-2 ring-emerald-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{session.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(status)}`}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-600">
                      {session.subject} • {session.instructor}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-700">
                      Session ID: {session.id}
                      <button
                        type="button"
                        onClick={async () => {
                          const copied = await copyTextToClipboard(session.id);
                          setNotice(copied ? 'Session ID copied.' : 'Clipboard is unavailable right now.');
                        }}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        aria-label="Copy session ID"
                        title="Copy session ID"
                      >
                        <FaCopy size={10} />
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Room: {session.roomCode}</p>
                    {session.assignedTutorEmail && (
                      <p className="mt-1 text-xs text-gray-500">
                        Assigned teacher: {session.assignedTutorName || 'Teacher'} ({session.assignedTutorEmail})
                      </p>
                    )}
                    {session.tutorAccessCode && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        Teacher access code:{' '}
                        <span className="font-semibold tracking-widest">{session.tutorAccessCode}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            const copied = await copyTextToClipboard(session.tutorAccessCode || '');
                            setNotice(copied ? 'Teacher access code copied.' : 'Clipboard is unavailable right now.');
                          }}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          aria-label="Copy teacher access code"
                          title="Copy teacher access code"
                        >
                          <FaCopy size={10} />
                        </button>
                      </p>
                    )}
                    {(session.department || session.classGroup || session.audienceTag) && (
                      <p className="mt-1 text-xs text-gray-500">
                        Audience:{' '}
                        {session.audienceTag ||
                          [session.department, session.classGroup].filter(Boolean).join(' • ')}
                          </p>
                        )}
                        {acceptedEvent && (
                          <p className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Accepted: {acceptedEvent.message}
                          </p>
                        )}
                        {session.notes && <p className="mt-2 text-xs text-gray-600">{session.notes}</p>}
                      </div>

                      <div className="grid min-w-[220px] grid-cols-2 gap-2 text-xs text-gray-600">
                        <p className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
                          <FaClock size={11} />
                          {formatDateTime(session.startAt)}
                        </p>
                        <p className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
                          <FaCheckCircle size={11} />
                          {session.durationMinutes} mins
                        </p>
                        <p className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
                          <FaUsers size={11} />
                          {session.expectedStudents} students
                        </p>
                        <p className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1.5">
                          <FaCalendarAlt size={11} />
                          {new Date(session.startAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => handleDuplicateSession(session)}
                        disabled={Boolean(activeActionId)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleRescheduleSession(session)}
                        disabled={Boolean(activeActionId)}
                        className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleEditSession(session)}
                        disabled={Boolean(activeActionId)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Edit class"
                        title="Edit"
                      >
                        <FaEdit size={11} />
                      </button>
                      <button
                        onClick={() => void loadAttendance(session)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100"
                        aria-label="Open attendance"
                        title="Attendance"
                      >
                        <FaUsers size={11} />
                      </button>
                      <button
                        onClick={() => void handleCopyTeacherAccess(session.id)}
                        disabled={Boolean(activeActionId)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Copy teacher link and access code"
                        title="Copy teacher link + code"
                      >
                        <FaCopy size={12} />
                      </button>
                      <button
                        onClick={() => void handleRegenerateTeacherAccess(session.id)}
                        disabled={Boolean(activeActionId)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3D08BA]/20 bg-[#3D08BA]/5 text-[#3D08BA] shadow-sm hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Regenerate teacher access"
                        title="Regenerate access"
                      >
                        <FaSyncAlt size={12} />
                      </button>
                      <button
                        onClick={() => void handleShareTeacherAccess(session)}
                        disabled={Boolean(activeActionId)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3D08BA]/20 bg-[#3D08BA]/5 text-[#3D08BA] shadow-sm hover:bg-[#3D08BA]/10 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Share class access"
                        title="Share"
                      >
                        <FaShareAlt size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={Boolean(activeActionId)}
                        className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Remove class"
                        title="Remove"
                      >
                        <FaTrash size={10} />
                      </button>
                      <button
                        onClick={() => handleStartLiveClass(session)}
                        className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                        aria-label={status === 'live' ? 'Rejoin live room' : 'Go live'}
                        title={status === 'live' ? 'Rejoin live room' : 'Go live'}
                      >
                        <FaVideo size={11} />
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow">
                          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <p className="mb-3 text-xs text-gray-600">
                Weekly timetable view for {formatWeekRangeLabel(weekStartDate)}.
              </p>

              <div className="hidden grid-cols-7 gap-2 lg:grid">
                {weekDays.map((day) => {
                  const daySessions = weekSessionsByDay[day.key] || [];
                  const isToday = getLocalDayKey(new Date()) === day.key;
                  return (
                    <div
                      key={day.key}
                      className={`min-h-[300px] rounded-xl border p-2 ${
                        isToday ? 'border-[#3D08BA]/40 bg-[#3D08BA]/5' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="mb-2 border-b border-gray-200 pb-2">
                        <p className="text-xs font-semibold text-gray-700">{day.dayLabel}</p>
                        <p className="text-xs text-gray-500">
                          {day.monthLabel} {day.dayNumber}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {daySessions.length === 0 && (
                          <p className="rounded-lg border border-dashed border-gray-200 bg-white px-2 py-3 text-center text-[11px] text-gray-400">
                            No classes
                          </p>
                        )}

                        {daySessions.map((session) => {
                          const status = getSessionStatus(session, Date.now());
                          return (
                            <button
                              key={session.id}
                              onClick={() => handleStartLiveClass(session)}
                              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-[#3D08BA]/30"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className="line-clamp-2 text-[11px] font-semibold text-gray-900">{session.title}</p>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${statusPillClass(status)}`}>
                                  {status === 'live' ? 'Live' : status === 'completed' ? 'Done' : 'Soon'}
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-gray-600">{session.subject}</p>
                              <p className="mt-1 text-[10px] text-gray-500">
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
                    <div key={day.key} className="rounded-xl border border-gray-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className={`text-sm font-semibold ${isToday ? 'text-[#3D08BA]' : 'text-gray-800'}`}>
                          {day.dayLabel}, {day.monthLabel} {day.dayNumber}
                        </p>
                        <span className="text-xs text-gray-500">{daySessions.length} classes</span>
                      </div>
                      <div className="space-y-2">
                        {daySessions.length === 0 && (
                          <p className="rounded-lg bg-gray-50 px-2 py-2 text-xs text-gray-500">No classes scheduled.</p>
                        )}
                        {daySessions.map((session) => {
                          const status = getSessionStatus(session, Date.now());
                          return (
                            <div key={session.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-900">{session.title}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(status)}`}>
                                  {statusLabel(status)}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-gray-600">
                                {formatSessionTime(session.startAt)} • {session.subject} • {session.instructor}
                              </p>
                              <button
                                onClick={() => handleStartLiveClass(session)}
                                className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#3D08BA] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#2D0690]"
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

              <div className="sm:col-span-2">
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
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                      <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Absent
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-amber-700">
                          {attendancePayload.summary.absentCount}
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
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {attendancePayload.records.length} record
                            {attendancePayload.records.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {attendancePayload.records.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                            No attendance record yet. Live join events or manual entries will appear here.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {attendancePayload.records.map((record) => {
                              const isUpdating = attendanceBusyId === record.id;
                              const statusClass =
                                record.status === 'present'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-200 bg-amber-50 text-amber-700';
                              const sourceClass =
                                record.source === 'live'
                                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600';

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
                                          {record.status}
                                        </span>
                                        <span
                                          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${sourceClass}`}
                                        >
                                          {record.source === 'live' ? 'Live capture' : 'Manual'}
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

                                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
