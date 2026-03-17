import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import {
  archiveSchoolAssignmentNotification,
  fetchSchoolAssignmentNotifications,
  type AssignmentQuestionInput,
  type SchoolAssignmentNotification,
  type AssignmentSubmission,
  type AssignmentType,
  type AssignmentReleaseMode,
  type SchoolAssignment,
  createSchoolAssignment,
  deleteSchoolAssignment,
  fetchSchoolAssignmentSubmissions,
  fetchSchoolAssignments,
  gradeSchoolAssignmentSubmission,
  markAllSchoolAssignmentNotificationsAsRead,
  markSchoolAssignmentNotificationAsRead,
  updateSchoolAssignment,
} from '../utils/assignmentsApi';
import { fetchSchoolScheduleSessions, type SchoolScheduleSession } from '../utils/schoolScheduleApi';

type EditorMode = 'create' | 'edit';

type EditorQuestion = {
  id: string;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  correctOptionId: string;
};

type EditorState = {
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  description: string;
  content: string;
  checklistText: string;
  type: AssignmentType;
  deliveryMode: 'virtual' | 'offline';
  releaseMode: AssignmentReleaseMode;
  releaseAt: string;
  dueAt: string;
  points: number;
  sessionId: string;
  questions: EditorQuestion[];
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const offset = parsed.getTimezoneOffset();
  const adjusted = new Date(parsed.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 16);
};

const createOption = (label = '') => ({
  id: `opt-${Math.random().toString(36).slice(2, 9)}`,
  text: label,
});

const createQuestion = (): EditorQuestion => {
  const firstOption = createOption('Option A');
  const secondOption = createOption('Option B');
  return {
    id: `q-${Math.random().toString(36).slice(2, 9)}`,
    prompt: '',
    points: 5,
    options: [firstOption, secondOption],
    correctOptionId: firstOption.id,
  };
};

const createEditorState = (): EditorState => ({
  title: '',
  subject: '',
  department: '',
  classGroup: '',
  description: '',
  content: '',
  checklistText: '',
  type: 'assignment',
  deliveryMode: 'virtual',
  releaseMode: 'immediate',
  releaseAt: '',
  dueAt: '',
  points: 100,
  sessionId: '',
  questions: [createQuestion()],
});

const mapAssignmentToEditor = (assignment: SchoolAssignment): EditorState => ({
  title: assignment.title,
  subject: assignment.subject,
  department: assignment.department,
  classGroup: assignment.classGroup,
  description: assignment.description,
  content: assignment.content,
  checklistText: assignment.checklist.join('\n'),
  type: assignment.type,
  deliveryMode: assignment.deliveryMode,
  releaseMode: assignment.releaseMode,
  releaseAt: toDateInputValue(assignment.releaseAt),
  dueAt: toDateInputValue(assignment.dueAt),
  points: assignment.points,
  sessionId: assignment.sessionId || '',
  questions:
    assignment.questions.length > 0
      ? assignment.questions.map((question) => ({
          id: question.id || `q-${Math.random().toString(36).slice(2, 9)}`,
          prompt: question.prompt,
          points: question.points,
          options: question.options.map((option) => ({
            id: option.id || `opt-${Math.random().toString(36).slice(2, 9)}`,
            text: option.text,
          })),
          correctOptionId: question.correctOptionId,
        }))
      : [createQuestion()],
});

const getAssignmentStatusLabel = (assignment: Pick<SchoolAssignment, 'isReleased' | 'releaseMode' | 'linkedSessionStatus'>) => {
  if (assignment.isReleased) {
    return 'Open';
  }
  if (assignment.releaseMode === 'scheduled') {
    return 'Scheduled';
  }
  if (assignment.releaseMode === 'on_class_end') {
    return assignment.linkedSessionStatus === 'live' ? 'Waiting for class to end' : 'Locked until class ends';
  }
  return 'Draft';
};

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Recently';
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const SchoolAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<SchoolAssignment[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, awaitingReview: 0 });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [sessions, setSessions] = useState<SchoolScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('create');
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(createEditorState());
  const [gradeTarget, setGradeTarget] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeSaving, setGradeSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AssignmentType>('all');
  const [notifications, setNotifications] = useState<SchoolAssignmentNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [activeNotificationId, setActiveNotificationId] = useState<string | 'all' | null>(null);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const payload = await fetchSchoolAssignmentNotifications();
      setNotifications(payload.notifications);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load homework updates.');
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadAssignments = async (preferredId?: string | null) => {
    setLoading(true);
    try {
      const [assignmentsPayload, sessionsPayload] = await Promise.all([
        fetchSchoolAssignments(),
        fetchSchoolScheduleSessions({ status: 'all' }),
      ]);
      setAssignments(assignmentsPayload.assignments);
      setSummary(assignmentsPayload.summary);
      setSessions(sessionsPayload.sessions);
      setSelectedAssignmentId((current) => {
        const nextId = preferredId || current;
        if (nextId && assignmentsPayload.assignments.some((assignment) => assignment.id === nextId)) {
          return nextId;
        }
        return assignmentsPayload.assignments[0]?.id || null;
      });
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load homework right now.');
      setAssignments([]);
      setSummary({ total: 0, active: 0, awaitingReview: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadNotifications().catch(() => {
      if (cancelled) {
        return;
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedAssignmentId) {
      setSubmissions([]);
      return;
    }

    let cancelled = false;
    const loadSubmissions = async () => {
      setSubmissionsLoading(true);
      try {
        const payload = await fetchSchoolAssignmentSubmissions(selectedAssignmentId);
        if (!cancelled) {
          setSubmissions(payload.submissions);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Could not load submissions.');
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) {
          setSubmissionsLoading(false);
        }
      }
    };

    void loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [selectedAssignmentId]);

  const filteredAssignments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return assignments.filter((assignment) => {
      if (typeFilter !== 'all' && assignment.type !== typeFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [assignment.title, assignment.subject, assignment.department, assignment.classGroup]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [assignments, searchQuery, typeFilter]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const visibleNotifications = useMemo(() => {
    const scoped =
      notificationFilter === 'unread'
        ? notifications.filter((notification) => !notification.isRead)
        : notifications;
    return scoped.slice(0, 4);
  }, [notificationFilter, notifications]);

  const openCreateModal = () => {
    setEditorMode('create');
    setEditingAssignmentId(null);
    setEditor(createEditorState());
    setEditorOpen(true);
  };

  const openEditModal = (assignment: SchoolAssignment) => {
    setEditorMode('edit');
    setEditingAssignmentId(assignment.id);
    setEditor(mapAssignmentToEditor(assignment));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditor(createEditorState());
    setEditingAssignmentId(null);
  };

  const handleSaveAssignment = async () => {
    const checklist = editor.checklistText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const normalizedQuestions: AssignmentQuestionInput[] =
      editor.type === 'classwork'
        ? editor.questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            points: question.points,
            options: question.options.map((option) => ({ id: option.id, text: option.text })),
            correctOptionId: question.correctOptionId,
          }))
        : [];

    const points =
      editor.type === 'classwork'
        ? normalizedQuestions.reduce((total, question) => total + Number(question.points || 0), 0)
        : editor.points;

    const payload = {
      title: editor.title,
      subject: editor.subject,
      department: editor.department,
      classGroup: editor.classGroup,
      description: editor.description,
      content: editor.content,
      checklist,
      type: editor.type,
      deliveryMode: editor.deliveryMode,
      releaseMode: editor.releaseMode,
      releaseAt: editor.releaseMode === 'scheduled' ? editor.releaseAt : null,
      dueAt: editor.dueAt,
      points,
      questions: normalizedQuestions,
      sessionId: editor.releaseMode === 'on_class_end' ? editor.sessionId : null,
      attachments: 0,
    };

    setSaving(true);
    try {
      let nextSelectedId: string | null = editingAssignmentId;
      if (editorMode === 'edit' && editingAssignmentId) {
        const response = await updateSchoolAssignment(editingAssignmentId, payload);
        setAssignments(response.assignments);
        setSelectedAssignmentId(response.assignment.id);
        setNotice(response.message);
        nextSelectedId = response.assignment.id;
      } else {
        const response = await createSchoolAssignment(payload);
        setAssignments(response.assignments);
        setSelectedAssignmentId(response.assignment.id);
        setNotice(response.message);
        nextSelectedId = response.assignment.id;
      }
      closeEditor();
      await loadAssignments(nextSelectedId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignment: SchoolAssignment) => {
    const confirmed = window.confirm(`Delete ${assignment.title}? This also removes all student submissions.`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await deleteSchoolAssignment(assignment.id);
      setAssignments(response.assignments);
      setSelectedAssignmentId((current) => (current === assignment.id ? response.assignments[0]?.id || null : current));
      setNotice(response.message);
      await loadAssignments(response.assignments[0]?.id || null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete assignment.');
    }
  };

  const openAssignmentFromNotification = async (notification: SchoolAssignmentNotification) => {
    setSelectedAssignmentId(notification.assignmentId);
    if (!notification.isRead) {
      setActiveNotificationId(notification.id);
      try {
        await markSchoolAssignmentNotificationAsRead(notification.id);
        setNotifications((previous) =>
          previous.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Could not update this homework alert.');
      } finally {
        setActiveNotificationId(null);
      }
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    setActiveNotificationId(notificationId);
    try {
      await markSchoolAssignmentNotificationAsRead(notificationId);
      setNotifications((previous) =>
        previous.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark this homework alert as read.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleArchiveNotification = async (notificationId: string) => {
    setActiveNotificationId(notificationId);
    try {
      await archiveSchoolAssignmentNotification(notificationId);
      setNotifications((previous) => previous.filter((item) => item.id !== notificationId));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this homework alert.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    setActiveNotificationId('all');
    try {
      await markAllSchoolAssignmentNotificationsAsRead();
      setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark homework alerts as read.');
    } finally {
      setActiveNotificationId(null);
    }
  };

  const openGradeModal = (submission: AssignmentSubmission) => {
    setGradeTarget(submission);
    setGradeScore(submission.score != null ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
  };

  const closeGradeModal = () => {
    setGradeTarget(null);
    setGradeScore('');
    setGradeFeedback('');
  };

  const handleGradeSubmission = async () => {
    if (!gradeTarget) {
      return;
    }
    setGradeSaving(true);
    try {
      const response = await gradeSchoolAssignmentSubmission({
        submissionId: gradeTarget.id,
        score: Number(gradeScore),
        feedback: gradeFeedback,
      });
      setNotice(response.message);
      closeGradeModal();
      if (selectedAssignmentId) {
        const payload = await fetchSchoolAssignmentSubmissions(selectedAssignmentId);
        setSubmissions(payload.submissions);
      }
      await loadAssignments(selectedAssignmentId);
      await loadNotifications();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save grade.');
    } finally {
      setGradeSaving(false);
    }
  };

  const sessionOptions = useMemo(
    () => [...sessions].sort((left, right) => new Date(right.startAt).getTime() - new Date(left.startAt).getTime()),
    [sessions]
  );

  const classworkPoints = useMemo(
    () => editor.questions.reduce((total, question) => total + Number(question.points || 0), 0),
    [editor.questions]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(61,8,186,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#f3f4f6_100%)] pb-16">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/school-dashboard')}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:border-[#3D08BA]/30 hover:text-[#3D08BA]"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3D08BA]">School homework</p>
              <h1 className="text-xl font-semibold text-slate-900">Assignments and classwork</h1>
              <p className="text-sm text-slate-500">Create tasks, time their release, and review student submissions in one place.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(61,8,186,0.24)] transition hover:bg-[#2D0690]"
          >
            <PlusIcon className="h-5 w-5" />
            New task
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {notice ? (
          <div className="rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#2D0690]">
            {notice}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total tasks</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.total}</p>
            <p className="mt-2 text-sm text-slate-500">Every homework and classwork item created for your school.</p>
          </article>
          <article className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open now</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.active}</p>
            <p className="mt-2 text-sm text-slate-500">Tasks students can currently see and submit.</p>
          </article>
          <article className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Awaiting review</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.awaitingReview}</p>
            <p className="mt-2 text-sm text-slate-500">Student submissions still waiting for a teacher score or note.</p>
          </article>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#3D08BA]">Homework inbox</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Submission updates</h2>
              <p className="mt-1 text-sm text-slate-500">
                New student submissions and late turn-ins appear here until you clear them.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                {unreadNotificationCount} unread
              </span>
              <button
                type="button"
                onClick={() => void handleMarkAllNotificationsRead()}
                disabled={unreadNotificationCount === 0 || activeNotificationId === 'all'}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {activeNotificationId === 'all' ? 'Updating...' : 'Mark all read'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {([
              { value: 'all', label: 'All updates' },
              { value: 'unread', label: 'Unread only' },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNotificationFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  notificationFilter === option.value
                    ? 'bg-[#3D08BA] text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-[#3D08BA]/20 hover:text-[#3D08BA]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {notificationsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Loading homework updates...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No submission updates yet. Student homework activity will appear here.
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No homework updates match this filter.
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-[24px] border p-4 transition ${
                    notification.isRead
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-amber-200 bg-amber-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-amber-500" /> : null}
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        {notification.needsReview ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            Needs review
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Auto-scored
                          </span>
                        )}
                        {notification.isLate ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Late
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-[11px] text-slate-400">{formatRelativeTime(notification.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => void openAssignmentFromNotification(notification)}
                        className="rounded-2xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10"
                      >
                        Open task
                      </button>
                      {!notification.isRead ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkNotificationRead(notification.id)}
                          disabled={activeNotificationId === notification.id}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {activeNotificationId === notification.id ? 'Updating...' : 'Mark read'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleArchiveNotification(notification.id)}
                        disabled={activeNotificationId === notification.id}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, subject, department, or class"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
              />
              <div className="flex gap-2">
                {(['all', 'assignment', 'classwork'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTypeFilter(filter)}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      typeFilter === filter
                        ? 'bg-[#3D08BA] text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-[#3D08BA]/25 hover:text-[#3D08BA]'
                    }`}
                  >
                    {filter === 'all' ? 'All tasks' : filter === 'assignment' ? 'Homework' : 'Classwork'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
          <div className="space-y-4">
            {loading ? (
              <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                Loading homework workspace...
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
                <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">No tasks yet</h2>
                <p className="mt-2 text-sm text-slate-500">Create the first homework or classwork for this class lane.</p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D0690]"
                >
                  <PlusIcon className="h-5 w-5" />
                  Create task
                </button>
              </div>
            ) : (
              filteredAssignments.map((assignment) => {
                const selected = assignment.id === selectedAssignmentId;
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={`w-full rounded-[28px] border p-5 text-left transition ${
                      selected
                        ? 'border-[#3D08BA]/30 bg-[#3D08BA]/5 shadow-[0_24px_60px_rgba(61,8,186,0.12)]'
                        : 'border-white/80 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] hover:border-[#3D08BA]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#3D08BA]/20 bg-[#3D08BA]/8 px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA]">
                            {assignment.type === 'assignment' ? 'Homework' : 'Classwork'}
                          </span>
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {getAssignmentStatusLabel(assignment)}
                          </span>
                        </div>
                        <h2 className="mt-3 text-base font-semibold text-slate-900">{assignment.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{assignment.subject} • {assignment.department} • {assignment.classGroup}</p>
                      </div>
                      <SparklesIcon className={`h-5 w-5 ${selected ? 'text-[#3D08BA]' : 'text-slate-300'}`} />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{assignment.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="font-semibold text-slate-700">Due</p>
                        <p className="mt-1">{formatDateTime(assignment.dueAt)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <p className="font-semibold text-slate-700">Submissions</p>
                        <p className="mt-1">{assignment.submissionsCount} total • {assignment.gradedCount} graded</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white/92 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6">
            {!selectedAssignment ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                <ClipboardDocumentListIcon className="h-12 w-12 text-slate-300" />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">Select a task</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">Choose any assignment on the left to review instructions, release settings, and student submissions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#3D08BA]/20 bg-[#3D08BA]/8 px-2.5 py-1 text-[11px] font-semibold text-[#3D08BA]">
                        {selectedAssignment.type === 'assignment' ? 'Homework' : 'Classwork'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {getAssignmentStatusLabel(selectedAssignment)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-900">{selectedAssignment.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">{selectedAssignment.subject} • {selectedAssignment.department} • {selectedAssignment.classGroup}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedAssignment)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAssignment(selectedAssignment)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Release</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedAssignment.releaseMode === 'immediate'
                        ? 'Visible immediately'
                        : selectedAssignment.releaseMode === 'scheduled'
                          ? `Opens ${formatDateTime(selectedAssignment.releaseAt)}`
                          : selectedAssignment.sessionId
                            ? `Opens when ${selectedAssignment.linkedSessionStatus === 'completed' ? 'class has ended' : 'linked class ends'}`
                            : 'Waiting for linked class'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Due date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(selectedAssignment.dueAt)}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total marks</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedAssignment.type === 'classwork'
                        ? selectedAssignment.questions.reduce((total, question) => total + question.points, 0)
                        : selectedAssignment.points}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <section className="rounded-[26px] border border-slate-200 bg-white p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Task summary</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{selectedAssignment.description}</p>
                      <div className="mt-4 rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 p-4 text-sm leading-7 text-slate-700">
                        {selectedAssignment.content}
                      </div>
                      {selectedAssignment.checklist.length > 0 ? (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student checklist</p>
                          <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {selectedAssignment.checklist.map((item) => (
                              <li key={`${selectedAssignment.id}-${item}`} className="flex items-start gap-2">
                                <CheckCircleIcon className="mt-0.5 h-4 w-4 text-emerald-500" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </section>

                    {selectedAssignment.type === 'classwork' ? (
                      <section className="rounded-[26px] border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Question set</h3>
                        <div className="mt-4 space-y-3">
                          {selectedAssignment.questions.map((question, index) => (
                            <article key={question.id || `${selectedAssignment.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-semibold text-slate-900">Q{index + 1}. {question.prompt}</p>
                              <p className="mt-1 text-xs text-slate-500">{question.points} marks</p>
                              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                {question.options.map((option) => (
                                  <li key={option.id || option.text} className={`rounded-xl border px-3 py-2 ${option.id === question.correctOptionId ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white'}`}>
                                    {option.text}
                                  </li>
                                ))}
                              </ul>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>

                  <aside className="space-y-4">
                    <section className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Submission progress</h3>
                      <div className="mt-4 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3">
                          <span>Students submitted</span>
                          <span className="font-semibold text-slate-900">{selectedAssignment.submissionsCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3">
                          <span>Reviewed</span>
                          <span className="font-semibold text-slate-900">{selectedAssignment.gradedCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3">
                          <span>Still waiting</span>
                          <span className="font-semibold text-slate-900">{Math.max(0, selectedAssignment.submissionsCount - selectedAssignment.gradedCount)}</span>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Submissions</h3>
                      <div className="mt-4 space-y-3">
                        {submissionsLoading ? (
                          <p className="text-sm text-slate-500">Loading student work...</p>
                        ) : submissions.length === 0 ? (
                          <p className="text-sm text-slate-500">No student has submitted this task yet.</p>
                        ) : (
                          submissions.map((submission) => (
                            <article key={submission.id} className="rounded-2xl border border-white bg-white p-4 text-sm text-slate-600">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-900">{submission.studentName}</p>
                                  <p className="mt-1 text-xs text-slate-500">Submitted {formatDateTime(submission.submittedAt)}{submission.lateSubmission ? ' • Late' : ''}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {submission.status === 'graded' ? 'Graded' : 'Needs review'}
                                </span>
                              </div>
                              {submission.submissionNote ? (
                                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{submission.submissionNote}</p>
                              ) : null}
                              {submission.submissionFiles && submission.submissionFiles.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {submission.submissionFiles.map((file) => (
                                    <span key={`${submission.id}-${file.name}-${file.sizeBytes}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                      {file.name}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {submission.questionResults && submission.questionResults.length > 0 ? (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                  {submission.questionResults.filter((result) => result.isCorrect).length} / {submission.questionResults.length} questions correct
                                </div>
                              ) : null}
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs text-slate-500">Score</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {submission.score != null ? `${submission.score}/${submission.maxScore}` : `Pending / ${submission.maxScore}`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openGradeModal(submission)}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                  {submission.status === 'graded' ? 'Update grade' : 'Grade'}
                                </button>
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  </aside>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
            <div className="max-h-[94vh] w-full overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]">
                    {editorMode === 'edit' ? 'Edit task' : 'New task'}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    {editor.type === 'assignment' ? 'Homework workspace' : 'Classwork workspace'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Set the class, release timing, and student instructions before publishing.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid max-h-[calc(94vh-148px)] gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5 px-5 py-5 sm:px-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Task title</span>
                      <input
                        value={editor.title}
                        onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        placeholder="Example: Week 4 Algebra Homework"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Subject</span>
                      <input
                        value={editor.subject}
                        onChange={(event) => setEditor((current) => ({ ...current, subject: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        placeholder="Mathematics"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Department</span>
                      <input
                        value={editor.department}
                        onChange={(event) => setEditor((current) => ({ ...current, department: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        placeholder="Science"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Class</span>
                      <input
                        value={editor.classGroup}
                        onChange={(event) => setEditor((current) => ({ ...current, classGroup: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        placeholder="SS2"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Task type</span>
                      <select
                        value={editor.type}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            type: event.target.value === 'classwork' ? 'classwork' : 'assignment',
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      >
                        <option value="assignment">Homework</option>
                        <option value="classwork">Classwork</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Delivery</span>
                      <select
                        value={editor.deliveryMode}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            deliveryMode: event.target.value === 'offline' ? 'offline' : 'virtual',
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      >
                        <option value="virtual">Live class</option>
                        <option value="offline">Offline class</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Release timing</span>
                      <select
                        value={editor.releaseMode}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            releaseMode: event.target.value as AssignmentReleaseMode,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      >
                        <option value="immediate">Open immediately</option>
                        <option value="scheduled">Open at a set time</option>
                        <option value="on_class_end">Open when linked class ends</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {editor.releaseMode === 'scheduled' ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Release date and time</span>
                        <input
                          type="datetime-local"
                          value={editor.releaseAt}
                          onChange={(event) => setEditor((current) => ({ ...current, releaseAt: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        />
                      </label>
                    ) : null}
                    {editor.releaseMode === 'on_class_end' ? (
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-medium text-slate-700">Linked class session</span>
                        <select
                          value={editor.sessionId}
                          onChange={(event) => setEditor((current) => ({ ...current, sessionId: event.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        >
                          <option value="">Select class session</option>
                          {sessionOptions.map((session) => (
                            <option key={session.id} value={session.id}>
                              {session.title} • {session.subject} • {formatDateTime(session.startAt)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Due date and time</span>
                      <input
                        type="datetime-local"
                        value={editor.dueAt}
                        onChange={(event) => setEditor((current) => ({ ...current, dueAt: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      />
                    </label>
                    {editor.type === 'assignment' ? (
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-slate-700">Marks</span>
                        <input
                          type="number"
                          min={1}
                          value={editor.points}
                          onChange={(event) => setEditor((current) => ({ ...current, points: Number(event.target.value) || 0 }))}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                        />
                      </label>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-medium text-slate-700">Classwork marks</p>
                        <p className="mt-2 text-sm text-slate-500">Calculated from the question set below.</p>
                        <p className="mt-3 text-lg font-semibold text-slate-900">{classworkPoints}</p>
                      </div>
                    )}
                  </div>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Short summary</span>
                    <textarea
                      rows={3}
                      value={editor.description}
                      onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      placeholder="Tell students what this task covers in one or two lines."
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Main instructions</span>
                    <textarea
                      rows={6}
                      value={editor.content}
                      onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      placeholder="Give students the full task instructions."
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Checklist</span>
                    <textarea
                      rows={4}
                      value={editor.checklistText}
                      onChange={(event) => setEditor((current) => ({ ...current, checklistText: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                      placeholder="One item per line, for example:\nShow your method\nUpload as PDF"
                    />
                  </label>

                  {editor.type === 'classwork' ? (
                    <section className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Question builder</h3>
                          <p className="text-sm text-slate-500">Students get scored instantly when they submit this classwork.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditor((current) => ({ ...current, questions: [...current.questions, createQuestion()] }))}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add question
                        </button>
                      </div>
                      {editor.questions.map((question, index) => (
                        <article key={question.id} className="rounded-[24px] border border-white bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Question {index + 1}</p>
                              <p className="mt-1 text-sm text-slate-500">Multiple choice only for this first MVP.</p>
                            </div>
                            {editor.questions.length > 1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditor((current) => ({
                                    ...current,
                                    questions: current.questions.filter((item) => item.id !== question.id),
                                  }))
                                }
                                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                            <input
                              value={question.prompt}
                              onChange={(event) =>
                                setEditor((current) => ({
                                  ...current,
                                  questions: current.questions.map((item) =>
                                    item.id === question.id ? { ...item, prompt: event.target.value } : item
                                  ),
                                }))
                              }
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                              placeholder="Write the question prompt"
                            />
                            <input
                              type="number"
                              min={1}
                              value={question.points}
                              onChange={(event) =>
                                setEditor((current) => ({
                                  ...current,
                                  questions: current.questions.map((item) =>
                                    item.id === question.id ? { ...item, points: Number(event.target.value) || 0 } : item
                                  ),
                                }))
                              }
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                            />
                          </div>
                          <div className="mt-4 space-y-3">
                            {question.options.map((option) => (
                              <div key={option.id} className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctOptionId === option.id}
                                  onChange={() =>
                                    setEditor((current) => ({
                                      ...current,
                                      questions: current.questions.map((item) =>
                                        item.id === question.id ? { ...item, correctOptionId: option.id } : item
                                      ),
                                    }))
                                  }
                                  className="mt-1 h-4 w-4"
                                />
                                <input
                                  value={option.text}
                                  onChange={(event) =>
                                    setEditor((current) => ({
                                      ...current,
                                      questions: current.questions.map((item) =>
                                        item.id === question.id
                                          ? {
                                              ...item,
                                              options: item.options.map((entry) =>
                                                entry.id === option.id ? { ...entry, text: event.target.value } : entry
                                              ),
                                            }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                  placeholder="Answer option"
                                />
                                {question.options.length > 2 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditor((current) => ({
                                        ...current,
                                        questions: current.questions.map((item) =>
                                          item.id === question.id
                                            ? {
                                                ...item,
                                                options: item.options.filter((entry) => entry.id !== option.id),
                                                correctOptionId:
                                                  item.correctOptionId === option.id ? item.options[0]?.id || '' : item.correctOptionId,
                                              }
                                            : item
                                        ),
                                      }))
                                    }
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-700"
                                  >
                                    Remove
                                  </button>
                                ) : (
                                  <div />
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setEditor((current) => ({
                                  ...current,
                                  questions: current.questions.map((item) =>
                                    item.id === question.id
                                      ? { ...item, options: [...item.options, createOption(`Option ${String.fromCharCode(65 + item.options.length)}`)] }
                                      : item
                                  ),
                                }))
                              }
                              className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-[#3D08BA]/30 hover:text-[#3D08BA]"
                            >
                              Add option
                            </button>
                          </div>
                        </article>
                      ))}
                    </section>
                  ) : null}
                </div>

                <aside className="border-t border-slate-200 bg-slate-50 px-5 py-5 lg:border-l lg:border-t-0 lg:px-6">
                  <div className="rounded-[26px] border border-white bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{editor.title || 'Task title'}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {[editor.subject || 'Subject', editor.department || 'Department', editor.classGroup || 'Class'].join(' • ')}
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <CalendarDaysIcon className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">Due</p>
                          <p>{editor.dueAt ? formatDateTime(new Date(editor.dueAt).toISOString()) : 'Choose a due date'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <ClockIcon className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">Release</p>
                          <p>
                            {editor.releaseMode === 'immediate'
                              ? 'Students see this immediately.'
                              : editor.releaseMode === 'scheduled'
                                ? editor.releaseAt
                                  ? `Students see this on ${formatDateTime(new Date(editor.releaseAt).toISOString())}.`
                                  : 'Choose when students should see this.'
                                : editor.sessionId
                                  ? 'Students see this as soon as the linked class ends.'
                                  : 'Pick the class that should unlock this task.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <UserGroupIcon className="mt-0.5 h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">Student workload</p>
                          <p>
                            {editor.type === 'classwork'
                              ? `${editor.questions.length} question${editor.questions.length === 1 ? '' : 's'} • ${classworkPoints} marks`
                              : `${editor.points || 0} marks • note or file submission`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 p-4 text-sm text-slate-700">
                      <p className="font-semibold text-[#2D0690]">Student instructions</p>
                      <p className="mt-2 leading-6">{editor.content || 'Add instructions so students know exactly what to do.'}</p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveAssignment()}
                  className="rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editorMode === 'edit' ? 'Save changes' : 'Create task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {gradeTarget ? (
        <div className="fixed inset-0 z-[60] bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-xl items-center justify-center">
            <div className="w-full rounded-[30px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3D08BA]">Grade submission</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{gradeTarget.studentName}</h2>
                <p className="mt-1 text-sm text-slate-500">Submitted {formatDateTime(gradeTarget.submittedAt)}</p>
              </div>
              <div className="space-y-4 px-5 py-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Score</span>
                  <input
                    type="number"
                    min={0}
                    max={gradeTarget.maxScore}
                    value={gradeScore}
                    onChange={(event) => setGradeScore(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                  />
                  <p className="text-xs text-slate-500">Maximum available marks: {gradeTarget.maxScore}</p>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Teacher note</span>
                  <textarea
                    rows={4}
                    value={gradeFeedback}
                    onChange={(event) => setGradeFeedback(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#3D08BA]/30 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                    placeholder="Add feedback for the student"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={closeGradeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={gradeSaving}
                  onClick={() => void handleGradeSubmission()}
                  className="rounded-2xl bg-[#3D08BA] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {gradeSaving ? 'Saving...' : 'Save grade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SchoolAssignments;
