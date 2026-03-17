import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import {
  type AssignmentFileMeta,
  type AssignmentQuestionResult,
  type AssignmentSubmission,
  type StudentAssignment,
  fetchStudentAssignments,
  submitStudentAssignment,
} from '../../schools/utils/assignmentsApi';
import { loadStudentIdentity, saveStudentIdentity } from '../utils/studentIdentity';

type ResolvedStatus = 'locked' | 'active' | 'submitted' | 'graded' | 'overdue';
type ActiveTab = 'all' | 'active' | 'locked' | 'submitted' | 'graded' | 'overdue' | 'classwork' | 'assignment';

type RuntimeAssessment = StudentAssignment & {
  status: ResolvedStatus;
  dueAtMs: number;
  remainingMs: number;
  progress?: AssignmentSubmission;
};

type AutoGradeResult = {
  assignmentId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  questionResults: AssignmentQuestionResult[];
  submittedAtIso: string;
};

const MAX_ASSIGNMENT_ATTACHMENTS = 5;
const MAX_ASSIGNMENT_ATTACHMENT_MB = 15;
const ALLOWED_ASSIGNMENT_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_ASSIGNMENT_ATTACHMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatCountdown = (remainingMs: number) => {
  if (remainingMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isSupportedAssignmentAttachment = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const extensionAllowed = ALLOWED_ASSIGNMENT_ATTACHMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const mimeAllowed = file.type ? ALLOWED_ASSIGNMENT_ATTACHMENT_MIME_TYPES.has(file.type) : false;
  return extensionAllowed || mimeAllowed;
};

const formatReleaseMode = (assessment: StudentAssignment) => {
  if (assessment.releaseMode === 'immediate') {
    return 'Available now';
  }

  if (assessment.releaseMode === 'scheduled') {
    return assessment.releaseAt ? `Opens on ${formatDateTime(assessment.releaseAt)}` : 'Opens at the scheduled time';
  }

  if (assessment.linkedSessionStatus === 'completed') {
    return 'Opened after the linked class ended';
  }

  if (assessment.linkedSessionStatus === 'live') {
    return 'Opens automatically when the linked live class ends';
  }

  return 'Opens after the linked class ends';
};

const resolveStatus = (assessment: StudentAssignment, submission: AssignmentSubmission | undefined, nowMs: number): ResolvedStatus => {
  if (!assessment.isReleased) {
    return 'locked';
  }

  if (submission) {
    if (submission.status === 'graded' || typeof submission.score === 'number') {
      return 'graded';
    }
    return 'submitted';
  }

  const dueAtMs = Date.parse(assessment.dueAt);
  if (Number.isFinite(dueAtMs) && nowMs > dueAtMs) {
    return 'overdue';
  }

  return 'active';
};

const getStatusBadgeClass = (status: ResolvedStatus) => {
  const classMap: Record<ResolvedStatus, string> = {
    locked: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    submitted: 'bg-amber-100 text-amber-700 border-amber-200',
    graded: 'bg-green-100 text-green-700 border-green-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
  };

  return classMap[status];
};

const getStatusLabel = (status: ResolvedStatus) => {
  const labels: Record<ResolvedStatus, string> = {
    locked: 'Not Open Yet',
    active: 'Open',
    submitted: 'Submitted',
    graded: 'Scored',
    overdue: 'Past Due',
  };

  return labels[status];
};

const getDeliveryModeLabel = (deliveryMode: StudentAssignment['deliveryMode']) =>
  deliveryMode === 'virtual' ? 'Live Class' : 'Offline Class';

const getStatusIcon = (status: ResolvedStatus) => {
  switch (status) {
    case 'graded':
      return <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />;
    case 'overdue':
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    case 'locked':
      return <LockClosedIcon className="h-5 w-5 text-slate-500" />;
    case 'submitted':
      return <CheckBadgeIcon className="h-5 w-5 text-amber-500" />;
    default:
      return <ClockIcon className="h-5 w-5 text-blue-500" />;
  }
};

const getPrimaryActionLabel = (assessment: RuntimeAssessment) => {
  if (assessment.status === 'locked') {
    return 'Not Open';
  }

  if (assessment.status === 'active') {
    return assessment.type === 'classwork' ? 'Open Classwork' : 'Submit Homework';
  }

  if (assessment.status === 'overdue') {
    return assessment.type === 'classwork' ? 'Time Up' : 'Submit Late';
  }

  if (assessment.status === 'submitted') {
    return 'View Submitted Work';
  }

  return 'View Score';
};

const mapSubmissionFiles = (files: File[]): AssignmentFileMeta[] =>
  files.map((file) => ({
    name: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
  }));

const Assignments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const sessionFilter = useMemo(() => String(searchParams.get('sessionId') || '').trim(), [searchParams]);
  const [department, setDepartment] = useState(studentIdentity.department || '');
  const [classGroup, setClassGroup] = useState(studentIdentity.classGroup || '');
  const [assessments, setAssessments] = useState<StudentAssignment[]>([]);
  const [submissionsByAssignmentId, setSubmissionsByAssignmentId] = useState<Record<string, AssignmentSubmission>>({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [autoGradeResult, setAutoGradeResult] = useState<AutoGradeResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    saveStudentIdentity({ department, classGroup });
  }, [department, classGroup]);

  useEffect(() => {
    if (!department || !classGroup) {
      setAssessments([]);
      setSubmissionsByAssignmentId({});
      setNotice('Select your department and class to load homework and classwork.');
      return;
    }

    let cancelled = false;

    const loadAssignments = async () => {
      setLoading(true);
      try {
        const payload = await fetchStudentAssignments({
          department,
          classGroup,
          studentId: studentIdentity.id,
        });
        if (cancelled) {
          return;
        }
        setAssessments(payload.assignments);
        setSubmissionsByAssignmentId(
          payload.submissions.reduce<Record<string, AssignmentSubmission>>((accumulator, submission) => {
            accumulator[submission.assignmentId] = submission;
            return accumulator;
          }, {})
        );
        setSelectedAssessmentId((current) =>
          current && payload.assignments.some((assignment) => assignment.id === current)
            ? current
            : payload.assignments[0]?.id || null
        );
        setNotice(payload.assignments.length === 0 ? 'No homework has been posted for this class yet.' : '');
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : 'Could not load assignments right now.');
          setAssessments([]);
          setSubmissionsByAssignmentId({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [classGroup, department, studentIdentity.id]);

  const runtimeAssessments = useMemo<RuntimeAssessment[]>(() => {
    return assessments.map((assessment) => {
      const progress = submissionsByAssignmentId[assessment.id];
      const dueAtMs = Date.parse(assessment.dueAt);

      return {
        ...assessment,
        status: resolveStatus(assessment, progress, nowMs),
        dueAtMs,
        remainingMs: dueAtMs - nowMs,
        progress,
      };
    });
  }, [assessments, nowMs, submissionsByAssignmentId]);

  const subjects = useMemo(
    () => ['all', ...Array.from(new Set(runtimeAssessments.map((item) => item.subject)))],
    [runtimeAssessments]
  );

  const filteredAssessments = useMemo(() => {
    return runtimeAssessments.filter((assessment) => {
      const matchesSearch =
        assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assessment.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = selectedSubject === 'all' || assessment.subject === selectedSubject;

      let matchesTab = true;
      if (activeTab === 'classwork') {
        matchesTab = assessment.type === 'classwork';
      } else if (activeTab === 'assignment') {
        matchesTab = assessment.type === 'assignment';
      } else if (activeTab !== 'all') {
        matchesTab = assessment.status === activeTab;
      }

      const matchesSession = !sessionFilter || assessment.sessionId === sessionFilter;

      return matchesSearch && matchesSubject && matchesTab && matchesSession;
    });
  }, [activeTab, runtimeAssessments, searchQuery, selectedSubject, sessionFilter]);

  const stats = useMemo(() => {
    return {
      total: runtimeAssessments.length,
      active: runtimeAssessments.filter((item) => item.status === 'active').length,
      locked: runtimeAssessments.filter((item) => item.status === 'locked').length,
      submitted: runtimeAssessments.filter((item) => item.status === 'submitted').length,
      graded: runtimeAssessments.filter((item) => item.status === 'graded').length,
      overdue: runtimeAssessments.filter((item) => item.status === 'overdue').length,
      classwork: runtimeAssessments.filter((item) => item.type === 'classwork').length,
      assignment: runtimeAssessments.filter((item) => item.type === 'assignment').length,
    };
  }, [runtimeAssessments]);

  const lockedPostClassAssignmentsCount = useMemo(
    () =>
      runtimeAssessments.filter(
        (item) => item.releaseMode === 'on_class_end' && item.status === 'locked'
      ).length,
    [runtimeAssessments]
  );

  const selectedAssessment = useMemo(
    () => runtimeAssessments.find((item) => item.id === selectedAssessmentId) || null,
    [runtimeAssessments, selectedAssessmentId]
  );

  const openAssessment = (assessment: RuntimeAssessment) => {
    setSelectedAssessmentId(assessment.id);
    setSubmitError('');
    setSubmissionNote(assessment.progress?.submissionNote || '');
    setSubmissionFiles([]);
    const answers = (assessment.progress?.answers || []).reduce<Record<string, string>>((accumulator, answer) => {
      accumulator[answer.questionId] = answer.optionId;
      return accumulator;
    }, {});
    setDraftAnswers(answers);
  };

  const closeAssessmentModal = () => {
    setSelectedAssessmentId(null);
    setSubmitError('');
    setSubmissionNote('');
    setSubmissionFiles([]);
    setDraftAnswers({});
  };

  const handleAssignmentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';

    if (picked.length === 0) {
      return;
    }

    const unsupported = picked.find((file) => !isSupportedAssignmentAttachment(file));
    if (unsupported) {
      setSubmitError('Please upload a PDF or Word file (.doc, .docx).');
      return;
    }

    const tooLarge = picked.find((file) => file.size > MAX_ASSIGNMENT_ATTACHMENT_MB * 1024 * 1024);
    if (tooLarge) {
      setSubmitError(`Each file should be ${MAX_ASSIGNMENT_ATTACHMENT_MB}MB or less.`);
      return;
    }

    setSubmissionFiles((previous) => {
      const merged = [...previous];

      for (const file of picked) {
        const duplicate = merged.some((existing) => existing.name === file.name && existing.size === file.size);
        if (!duplicate) {
          merged.push(file);
        }
      }

      return merged.slice(0, MAX_ASSIGNMENT_ATTACHMENTS);
    });

    setSubmitError('');
  };

  const removeSubmissionFile = (targetFile: File) => {
    setSubmissionFiles((previous) =>
      previous.filter((file) => !(file.name === targetFile.name && file.size === targetFile.size))
    );
  };

  const submitSelectedAssessment = async () => {
    if (!selectedAssessment) {
      return;
    }

    if (selectedAssessment.status === 'locked') {
      setSubmitError('This task is not open yet.');
      return;
    }

    if (selectedAssessment.status === 'overdue' && selectedAssessment.type === 'classwork') {
      setSubmitError('Time is up for this classwork.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedAssessment.type === 'classwork') {
        const unansweredQuestion = selectedAssessment.questions.find((question) => !draftAnswers[question.id || '']);
        if (unansweredQuestion) {
          setSubmitError('Please answer every question before you submit.');
          return;
        }
      }

      const payload = await submitStudentAssignment({
        assignmentId: selectedAssessment.id,
        studentId: studentIdentity.id,
        studentName: studentIdentity.name || 'Student',
        submissionNote: submissionNote.trim(),
        submissionFiles: mapSubmissionFiles(submissionFiles),
        answers:
          selectedAssessment.type === 'classwork'
            ? selectedAssessment.questions.map((question) => ({
                questionId: question.id || '',
                optionId: draftAnswers[question.id || ''],
              }))
            : undefined,
      });

      setSubmissionsByAssignmentId((previous) => ({
        ...previous,
        [payload.submission.assignmentId]: payload.submission,
      }));

      setAssessments((previous) =>
        previous.map((assessment) =>
          assessment.id === selectedAssessment.id
            ? {
                ...assessment,
                isReleased: true,
              }
            : assessment
        )
      );

      if (payload.autoGradeResult) {
        setAutoGradeResult(payload.autoGradeResult);
      }

      closeAssessmentModal();
      setNotice(
        selectedAssessment.type === 'classwork'
          ? 'Classwork submitted and scored.'
          : 'Homework submitted successfully.'
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: Array<{ id: ActiveTab; label: string; count: number }> = [
    { id: 'all', label: 'All Tasks', count: stats.total },
    { id: 'active', label: 'Open', count: stats.active },
    { id: 'locked', label: 'Not Open', count: stats.locked },
    { id: 'submitted', label: 'Submitted', count: stats.submitted },
    { id: 'graded', label: 'Scored', count: stats.graded },
    { id: 'overdue', label: 'Past Due', count: stats.overdue },
    { id: 'classwork', label: 'Classwork', count: stats.classwork },
    { id: 'assignment', label: 'Homework', count: stats.assignment },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button onClick={() => navigate(-1)} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
          </button>

          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">My Tasks</p>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Assignments and Classwork</h1>
          </div>

          <button
            onClick={() => setShowFilters((previous) => !previous)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D0690]"
          >
            <FunnelIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Class Lane</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">Load your homework by department and class</h2>
              <p className="mt-1 text-sm text-gray-600">
                We use your saved academic profile to show only the tasks meant for your class.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Department"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
              <input
                type="text"
                value={classGroup}
                onChange={(event) => setClassGroup(event.target.value)}
                placeholder="Class"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#3D08BA]/15 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Live Class Release</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">Tasks linked to class end</h2>
              <p className="mt-1 text-sm text-gray-600">
                {lockedPostClassAssignmentsCount > 0
                  ? `${lockedPostClassAssignmentsCount} task${lockedPostClassAssignmentsCount === 1 ? '' : 's'} will open automatically after the linked live class ends.`
                  : 'Any task linked to a live class will open automatically after that class ends.'}
              </p>
            </div>
            <div className="rounded-xl border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-2 text-sm font-medium text-[#2D0690]">
              {runtimeAssessments.filter((item) => item.releaseMode === 'on_class_end' && item.isReleased).length} open after class
            </div>
          </div>
        </section>

        {sessionFilter ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">Showing tasks linked to this live class.</p>
            <p className="mt-1 text-emerald-700">
              This filtered view came from the live classroom so you can focus on work for the current session.
            </p>
          </section>
        ) : null}

        {notice ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="inline-flex items-center gap-2 font-medium">
              <SparklesIcon className="h-4 w-4" />
              {notice}
            </p>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Open</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{stats.active}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Not Open</p>
            <p className="mt-1 text-2xl font-bold text-slate-600">{stats.locked}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Submitted</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.submitted}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Scored</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{stats.graded}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Past Due</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{stats.overdue}</p>
          </article>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, subject, or instruction"
                className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              />
            </div>

            {showFilters ? (
              <select
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA]"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#3D08BA] text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label} <span className="ml-1">({tab.count})</span>
            </button>
          ))}
        </section>

        <section className="space-y-4">
          {loading ? (
            <article className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
              Loading tasks...
            </article>
          ) : filteredAssessments.length === 0 ? (
            <article className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <AcademicCapIcon className="mx-auto h-14 w-14 text-gray-300" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">No tasks found</h3>
              <p className="mt-1 text-sm text-gray-600">Try a different tab, subject, or search.</p>
            </article>
          ) : (
            filteredAssessments.map((assessment) => {
              const isClassworkActive = assessment.type === 'classwork' && assessment.status === 'active';
              const countdown = formatCountdown(assessment.remainingMs);

              return (
                <article
                  key={assessment.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-start gap-3">
                        {getStatusIcon(assessment.status)}

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">{assessment.title}</h3>
                            <span className="rounded-md border border-[#3D08BA]/20 bg-[#3D08BA]/8 px-2.5 py-1 text-xs font-medium text-[#3D08BA]">
                              {assessment.type === 'classwork' ? 'Classwork' : 'Homework'} • {getDeliveryModeLabel(assessment.deliveryMode)}
                            </span>
                            <span
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(assessment.status)}`}
                            >
                              {getStatusLabel(assessment.status)}
                            </span>
                          </div>

                          <p className="mb-2 text-sm text-gray-600">{assessment.description}</p>
                          <p className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">Task content:</span> {assessment.content}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="inline-flex items-center gap-1.5">
                              <CalendarIcon className="h-4 w-4" />
                              <span>Due: {formatDateTime(assessment.dueAt)}</span>
                            </div>
                            {assessment.progress?.submissionFiles && assessment.progress.submissionFiles.length > 0 ? (
                              <div className="inline-flex items-center gap-1.5">
                                <PaperClipIcon className="h-4 w-4" />
                                <span>
                                  {assessment.progress.submissionFiles.length} file{assessment.progress.submissionFiles.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : null}
                            <div className="font-semibold text-[#3D08BA]">
                              {assessment.type === 'classwork'
                                ? assessment.questions.reduce((total, question) => total + question.points, 0)
                                : assessment.points}{' '}
                              pts
                            </div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">{formatReleaseMode(assessment)}</div>

                          {isClassworkActive ? (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                              <ClockIcon className="h-4 w-4" />
                              Time left: {countdown}
                            </div>
                          ) : null}

                          {assessment.progress ? (
                            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">
                                Submitted: {formatDateTime(assessment.progress.submittedAt)}
                                {assessment.progress.lateSubmission ? ' (late)' : ''}
                              </p>

                              {typeof assessment.progress.score === 'number' ? (
                                <p className="mt-1 text-sm font-semibold text-green-700">
                                  Score: {assessment.progress.score}/{assessment.progress.maxScore}
                                </p>
                              ) : null}

                              {assessment.progress.feedback ? (
                                <p className="mt-1 text-sm text-gray-700">{assessment.progress.feedback}</p>
                              ) : null}

                              {assessment.progress.submissionFiles && assessment.progress.submissionFiles.length > 0 ? (
                                <div className="mt-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Files sent</p>
                                  <ul className="mt-1 space-y-1">
                                    {assessment.progress.submissionFiles.map((file) => (
                                      <li
                                        key={`${file.name}-${file.sizeBytes}`}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                                      >
                                        <PaperClipIcon className="h-3.5 w-3.5" />
                                        {file.name} ({formatFileSize(file.sizeBytes)})
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 lg:flex-col">
                      <button
                        type="button"
                        onClick={() => openAssessment(assessment)}
                        disabled={assessment.status === 'locked'}
                        className="flex-1 rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:bg-gray-300 lg:w-36"
                      >
                        {getPrimaryActionLabel(assessment)}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAssessment(assessment)}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 lg:w-36"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>

      {selectedAssessment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-[min(96vw,760px)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {selectedAssessment.type === 'classwork' ? 'Classwork' : 'Homework'} • {getDeliveryModeLabel(selectedAssessment.deliveryMode)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">{selectedAssessment.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">Due by {formatDateTime(selectedAssessment.dueAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={closeAssessmentModal}
                  className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <p>{selectedAssessment.description}</p>
                <p className="mt-1 text-xs text-gray-500">{formatReleaseMode(selectedAssessment)}</p>
              </div>

              <div className="rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-2 text-sm text-gray-800">
                <p className="font-semibold text-[#2F0A8C]">Task content</p>
                <p className="mt-1 leading-relaxed">{selectedAssessment.content}</p>
                {selectedAssessment.checklist.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {selectedAssessment.checklist.map((item, index) => (
                      <li key={`${selectedAssessment.id}-check-${index}`} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#3D08BA]"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {selectedAssessment.type === 'classwork' && selectedAssessment.status === 'active' ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                  Time remaining: {formatCountdown(selectedAssessment.remainingMs)}
                </div>
              ) : null}

              {selectedAssessment.status === 'locked' ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  This task is not open yet. It will unlock based on the teacher&apos;s release plan.
                </div>
              ) : null}

              {selectedAssessment.type === 'classwork' ? (
                <div className="space-y-3">
                  {selectedAssessment.questions.map((question, index) => (
                    <article key={question.id || `${selectedAssessment.id}-${index}`} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-semibold text-gray-900">
                        Q{index + 1}. {question.prompt}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{question.points} points</p>

                      <div className="mt-2 space-y-2">
                        {question.options.map((option) => {
                          const checked = draftAnswers[question.id || ''] === option.id;
                          const disabled = selectedAssessment.status !== 'active';

                          return (
                            <label
                              key={option.id || option.text}
                              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                                checked ? 'border-[#3D08BA] bg-[#3D08BA]/5' : 'border-gray-200 bg-white'
                              } ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-gray-50'}`}
                            >
                              <input
                                type="radio"
                                className="mt-0.5 h-4 w-4"
                                checked={checked}
                                disabled={disabled}
                                onChange={() =>
                                  setDraftAnswers((previous) => ({
                                    ...previous,
                                    [question.id || '']: option.id || '',
                                  }))
                                }
                              />
                              <span>{option.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Add a note or link</label>
                    <textarea
                      value={submissionNote}
                      onChange={(event) => setSubmissionNote(event.target.value)}
                      rows={4}
                      disabled={selectedAssessment.status === 'locked' || Boolean(selectedAssessment.progress)}
                      placeholder="Write a short note or paste a submission link."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#3D08BA] disabled:bg-gray-100"
                    />
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Upload file(s): PDF or Word (.doc, .docx)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={selectedAssessment.status === 'locked' || Boolean(selectedAssessment.progress)}
                      onChange={handleAssignmentFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#3D08BA] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#2D0690] disabled:opacity-60"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      You can upload up to {MAX_ASSIGNMENT_ATTACHMENTS} files ({MAX_ASSIGNMENT_ATTACHMENT_MB}MB each).
                    </p>

                    {submissionFiles.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {submissionFiles.map((file) => (
                          <li
                            key={`${file.name}-${file.size}`}
                            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                          >
                            <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-gray-700">
                              <PaperClipIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {file.name} ({formatFileSize(file.size)})
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSubmissionFile(file)}
                              className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {selectedAssessment.progress?.submissionFiles && selectedAssessment.progress.submissionFiles.length > 0 ? (
                      <div className="mt-3 border-t border-gray-200 pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Submitted files
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {selectedAssessment.progress.submissionFiles.map((file) => (
                            <li
                              key={`${file.name}-${file.sizeBytes}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                            >
                              <PaperClipIcon className="h-3.5 w-3.5" />
                              {file.name} ({formatFileSize(file.sizeBytes)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {selectedAssessment.progress?.questionResults ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                  <p className="font-semibold text-green-800">Your answers were saved.</p>
                  <p className="mt-1 text-green-700">Open the score view to see what you got right.</p>
                </div>
              ) : null}

              {submitError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={closeAssessmentModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
              {selectedAssessment.status !== 'locked' && selectedAssessment.status !== 'graded' && !selectedAssessment.progress ? (
                <button
                  type="button"
                  onClick={() => void submitSelectedAssessment()}
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D0690] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : selectedAssessment.type === 'classwork'
                      ? 'Submit and get score'
                      : 'Submit'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {autoGradeResult ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4">
          <div className="max-h-[92vh] w-[min(96vw,700px)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Score Ready</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{autoGradeResult.title}</h3>
              <p className="mt-1 text-sm text-gray-600">Submitted on {formatDateTime(autoGradeResult.submittedAtIso)}</p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">You got your score instantly</p>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {autoGradeResult.score}/{autoGradeResult.maxScore} ({autoGradeResult.percentage}%)
                </p>
                <p className="mt-1 text-sm text-green-700">{autoGradeResult.feedback}</p>
              </div>

              <div className="space-y-2">
                {autoGradeResult.questionResults.map((result, index) => (
                  <article
                    key={result.questionId}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      result.isCorrect ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">
                      Q{index + 1}: {result.prompt}
                    </p>
                    <p className="mt-1 text-gray-700">
                      Your answer: <span className="font-medium">{result.selectedOptionLabel || 'No answer'}</span>
                    </p>
                    <p className="text-gray-700">
                      Correct answer: <span className="font-medium">{result.correctOptionLabel}</span>
                    </p>
                    <p className="mt-1 font-semibold text-gray-900">
                      Points: {result.earnedPoints}/{result.maxPoints}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-4 text-right">
              <button
                type="button"
                onClick={() => setAutoGradeResult(null)}
                className="rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D0690]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Assignments;
