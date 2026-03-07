import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaPlay,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUsers,
  FaVideo,
} from 'react-icons/fa';
import NavBar from '../../../components/layout/school-layout/NavBar';

type ScheduleStatus = 'upcoming' | 'live' | 'completed';

type SchoolScheduleSession = {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  durationMinutes: number;
  expectedStudents: number;
  roomCode: string;
  notes: string | null;
};

type SessionFormState = {
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  durationMinutes: string;
  expectedStudents: string;
  notes: string;
};

const SCHEDULE_STORAGE_KEY = 'edamaa_school_schedule_v1';

const buildSeedSchedule = () => {
  const now = Date.now();
  return [
    {
      id: 'SCH-SCHED-001',
      title: 'SS3 Mathematics Intensive',
      subject: 'Mathematics',
      instructor: 'Mr. Joseph',
      startAt: new Date(now + 1000 * 60 * 35).toISOString(),
      durationMinutes: 75,
      expectedStudents: 48,
      roomCode: 'MATH-SS3-INT',
      notes: 'Focus on WAEC past questions and timed drills.',
    },
    {
      id: 'SCH-SCHED-002',
      title: 'Physics Concept Clinic',
      subject: 'Physics',
      instructor: 'Dr. Adebayo',
      startAt: new Date(now + 1000 * 60 * 120).toISOString(),
      durationMinutes: 60,
      expectedStudents: 35,
      roomCode: 'PHY-CLINIC',
      notes: 'Open Q&A and quick classwork checkpoint.',
    },
    {
      id: 'SCH-SCHED-003',
      title: 'English Language Revision',
      subject: 'English',
      instructor: 'Mrs. Chinedu',
      startAt: new Date(now - 1000 * 60 * 20).toISOString(),
      durationMinutes: 90,
      expectedStudents: 42,
      roomCode: 'ENG-REV-01',
      notes: 'Essay outline walkthrough and assignment briefing.',
    },
  ] as SchoolScheduleSession[];
};

const normalizeSessions = (value: unknown): SchoolScheduleSession[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw) => (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const duration = Number(item.durationMinutes);
      const expectedStudents = Number(item.expectedStudents);
      return {
        id: String(item.id || `SCH-SCHED-${Date.now().toString(36)}`),
        title: String(item.title || 'Class session').trim(),
        subject: String(item.subject || 'General').trim(),
        instructor: String(item.instructor || 'School Tutor').trim(),
        startAt: String(item.startAt || new Date().toISOString()),
        durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 60,
        expectedStudents:
          Number.isFinite(expectedStudents) && expectedStudents >= 0
            ? Math.round(expectedStudents)
            : 0,
        roomCode: String(item.roomCode || 'EDAMAA-LIVE').trim(),
        notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : null,
      };
    })
    .filter((item) => item.title && item.startAt);
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

const SchoolSchedule = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SchoolScheduleSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | ScheduleStatus>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState<SessionFormState>({
    title: '',
    subject: '',
    instructor: '',
    startAt: '',
    durationMinutes: '60',
    expectedStudents: '',
    notes: '',
  });

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (!rawValue) {
        setSessions(buildSeedSchedule());
        return;
      }

      const parsed = JSON.parse(rawValue) as unknown;
      const normalized = normalizeSessions(parsed);
      setSessions(normalized.length > 0 ? normalized : buildSeedSchedule());
    } catch {
      setSessions(buildSeedSchedule());
    }
  }, []);

  useEffect(() => {
    // Persisting schedule locally keeps schools productive even if API is restarting.
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

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

  const resetForm = () => {
    setFormState({
      title: '',
      subject: '',
      instructor: '',
      startAt: '',
      durationMinutes: '60',
      expectedStudents: '',
      notes: '',
    });
  };

  const handleCreateSession = () => {
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

    const sessionId = `SCH-SCHED-${Date.now().toString(36).toUpperCase()}`;
    const roomCodeSeed = `${subject.slice(0, 3)}-${Date.now().toString().slice(-4)}`.toUpperCase();

    const nextSession: SchoolScheduleSession = {
      id: sessionId,
      title,
      subject,
      instructor,
      startAt: startDate.toISOString(),
      durationMinutes: Math.round(durationMinutes),
      expectedStudents:
        Number.isFinite(expectedStudents) && expectedStudents >= 0 ? Math.round(expectedStudents) : 0,
      roomCode: `ROOM-${roomCodeSeed}`,
      notes: formState.notes.trim() || null,
    };

    setSessions((current) => [nextSession, ...current]);
    resetForm();
    setIsCreateOpen(false);
    setNotice('Class added to your schedule successfully.');
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    setNotice('Class removed from schedule.');
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
                  Plan live and offline classes with clear timing and tutor ownership.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
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
                placeholder="Search by class, subject, tutor, or room code..."
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
        </section>

        <section className="mt-5 space-y-3">
          {filteredSessions.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
              <FaCalendarAlt className="mx-auto mb-3 text-4xl text-gray-300" />
              <h3 className="text-base font-semibold text-gray-900">No classes match your filters</h3>
              <p className="mt-1 text-sm text-gray-600">Try another search or add a new class to this schedule.</p>
            </div>
          )}

          {filteredSessions.map((session) => {
            const status = getSessionStatus(session, Date.now());
            return (
              <article key={session.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
                    <p className="mt-1 text-xs text-gray-500">Room: {session.roomCode}</p>
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
                    onClick={() => handleDeleteSession(session.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <FaTrash size={10} />
                    Remove
                  </button>
                  <button
                    onClick={() => handleStartLiveClass(session)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#3D08BA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2D0690]"
                  >
                    {status === 'live' ? <FaVideo size={11} /> : <FaPlay size={11} />}
                    {status === 'live' ? 'Rejoin live room' : 'Go live'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Add New Class to Schedule</h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                aria-label="Close modal"
              >
                <FaTimes size={12} />
              </button>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
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
                <label className="mb-1 block text-xs font-semibold text-gray-600">Tutor / Instructor</label>
                <input
                  value={formState.instructor}
                  onChange={(event) => setFormState((prev) => ({ ...prev, instructor: event.target.value }))}
                  placeholder="Tutor name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Start date and time</label>
                <input
                  type="datetime-local"
                  value={formState.startAt}
                  onChange={(event) => setFormState((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
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
                  placeholder="Optional context for tutors and school admins."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  resetForm();
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                className="rounded-lg bg-[#3D08BA] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2D0690]"
              >
                Save class
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar activeTab="reports" />
    </div>
  );
};

export default SchoolSchedule;
