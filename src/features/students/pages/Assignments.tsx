import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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

type AssessmentType = 'assignment' | 'classwork';
type DeliveryMode = 'virtual' | 'offline';
type ReleaseMode = 'immediate' | 'scheduled' | 'on_class_end';
type ResolvedStatus = 'locked' | 'active' | 'submitted' | 'graded' | 'overdue';
type ActiveTab = 'all' | 'active' | 'locked' | 'submitted' | 'graded' | 'overdue' | 'classwork' | 'assignment';

type ObjectiveQuestionOption = {
  id: string;
  text: string;
};

type ObjectiveQuestion = {
  id: string;
  prompt: string;
  points: number;
  options: ObjectiveQuestionOption[];
  correctOptionId: string;
};

type QuestionResult = {
  questionId: string;
  prompt: string;
  selectedOptionId?: string;
  selectedOptionLabel?: string;
  correctOptionId: string;
  correctOptionLabel: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
};

type Assessment = {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  description: string;
  content: string;
  checklist?: string[];
  type: AssessmentType;
  deliveryMode: DeliveryMode;
  releaseMode: ReleaseMode;
  releaseAtIso?: string;
  dueAtIso: string;
  attachments: number;
  points: number;
  questions?: ObjectiveQuestion[];
};

type AssessmentProgress = {
  submittedAtIso: string;
  submissionNote?: string;
  submissionFiles?: SubmittedAttachment[];
  answers?: Record<string, string>;
  score?: number;
  maxScore?: number;
  feedback?: string;
  questionResults?: QuestionResult[];
  lateSubmission?: boolean;
};

type SubmittedAttachment = {
  name: string;
  sizeBytes: number;
  mimeType: string;
};

type AssessmentWithRuntime = Assessment & {
  isReleased: boolean;
  status: ResolvedStatus;
  dueAtMs: number;
  remainingMs: number;
  progress?: AssessmentProgress;
};

type AutoGradeResult = {
  assessmentId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  questionResults: QuestionResult[];
  submittedAtIso: string;
};

const CLASS_END_STORAGE_KEY = 'edamaa_live_class_last_ended_at';
const ASSESSMENT_PROGRESS_STORAGE_KEY = 'edamaa_assessment_progress_v1';
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

const formatReleaseMode = (assessment: Assessment, classEndedAtIso: string | null) => {
  if (assessment.releaseMode === 'immediate') {
    return 'Available now';
  }

  if (assessment.releaseMode === 'scheduled') {
    return `Opens on ${assessment.releaseAtIso ? formatDateTime(assessment.releaseAtIso) : 'TBD'}`;
  }

  return classEndedAtIso
    ? `Opened when class ended at ${formatDateTime(classEndedAtIso)}`
    : 'Opens automatically when live class ends';
};

const loadStoredProgress = (): Record<string, AssessmentProgress> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ASSESSMENT_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as Record<string, AssessmentProgress>;
  } catch {
    return {};
  }
};

const createSeedAssessments = (baseDate: Date): Assessment[] => {
  const baseTime = baseDate.getTime();
  const withOffset = (minutes: number) => new Date(baseTime + minutes * 60_000).toISOString();

  return [
    {
      id: 'classwork-finance-live-01',
      title: 'Classwork: Cash Flow Ratios Sprint',
      subject: 'Accounting',
      subjectColor: 'bg-blue-600',
      description:
        'In-lecture objective classwork. Submit before countdown ends to get your score instantly.',
      content:
        'Read each cash-flow question carefully and choose one best answer. The timer runs during class and closes automatically when time is up.',
      checklist: [
        'Answer all 4 questions before the timer ends.',
        'Check each option before you submit.',
        'Submit once to get instant score and corrections.',
      ],
      type: 'classwork',
      deliveryMode: 'virtual',
      releaseMode: 'immediate',
      releaseAtIso: withOffset(-20),
      dueAtIso: withOffset(35),
      attachments: 0,
      points: 20,
      questions: [
        {
          id: 'q-cf-1',
          prompt: 'A current ratio greater than 1.0 usually means:',
          points: 5,
          correctOptionId: 'a',
          options: [
            { id: 'a', text: 'Current assets exceed current liabilities' },
            { id: 'b', text: 'Company has negative working capital' },
            { id: 'c', text: 'Cash flow is always positive' },
            { id: 'd', text: 'Company has no long-term debt' },
          ],
        },
        {
          id: 'q-cf-2',
          prompt: 'Operating cash flow appears first in:',
          points: 5,
          correctOptionId: 'c',
          options: [
            { id: 'a', text: 'Balance sheet' },
            { id: 'b', text: 'Income statement' },
            { id: 'c', text: 'Cash flow statement' },
            { id: 'd', text: 'Statement of equity changes' },
          ],
        },
        {
          id: 'q-cf-3',
          prompt: 'Free cash flow is best interpreted as:',
          points: 5,
          correctOptionId: 'd',
          options: [
            { id: 'a', text: 'Cash kept only for payroll' },
            { id: 'b', text: 'Total assets minus liabilities' },
            { id: 'c', text: 'Revenue after tax' },
            { id: 'd', text: 'Cash after operations and capital spending' },
          ],
        },
        {
          id: 'q-cf-4',
          prompt: 'A sharp drop in receivables days usually indicates:',
          points: 5,
          correctOptionId: 'b',
          options: [
            { id: 'a', text: 'Longer customer payment cycle' },
            { id: 'b', text: 'Faster collections from customers' },
            { id: 'c', text: 'Higher financing costs' },
            { id: 'd', text: 'Lower gross margin' },
          ],
        },
      ],
    },
    {
      id: 'classwork-offline-bio-02',
      title: 'Classwork: Cellular Respiration Checkpoint',
      subject: 'Biology',
      subjectColor: 'bg-emerald-600',
      description:
        'Offline classwork posted by school. Countdown starts once released and enforces lecture-time submission.',
      content:
        'Complete this respiration checkpoint during lecture time. You will receive immediate feedback after submission.',
      checklist: [
        'Answer each biology checkpoint question.',
        'Use class notes for quick recall.',
        'Submit before countdown reaches zero.',
      ],
      type: 'classwork',
      deliveryMode: 'offline',
      releaseMode: 'scheduled',
      releaseAtIso: withOffset(15),
      dueAtIso: withOffset(65),
      attachments: 1,
      points: 15,
      questions: [
        {
          id: 'q-bio-1',
          prompt: 'Glycolysis takes place in the:',
          points: 5,
          correctOptionId: 'b',
          options: [
            { id: 'a', text: 'Mitochondrial matrix' },
            { id: 'b', text: 'Cytoplasm' },
            { id: 'c', text: 'Nucleus' },
            { id: 'd', text: 'Ribosome' },
          ],
        },
        {
          id: 'q-bio-2',
          prompt: 'The main ATP-producing stage of respiration is:',
          points: 5,
          correctOptionId: 'd',
          options: [
            { id: 'a', text: 'Fermentation' },
            { id: 'b', text: 'Photolysis' },
            { id: 'c', text: 'Calvin cycle' },
            { id: 'd', text: 'Electron transport chain' },
          ],
        },
        {
          id: 'q-bio-3',
          prompt: 'Final electron acceptor in aerobic respiration is:',
          points: 5,
          correctOptionId: 'a',
          options: [
            { id: 'a', text: 'Oxygen' },
            { id: 'b', text: 'Nitrogen' },
            { id: 'c', text: 'Hydrogen' },
            { id: 'd', text: 'Carbon dioxide' },
          ],
        },
      ],
    },
    {
      id: 'assignment-live-analytics-03',
      title: 'Assignment: Marketing Funnel Reflection',
      subject: 'Business',
      subjectColor: 'bg-orange-600',
      description:
        'Tutor scheduled this homework to publish automatically the moment the live class ends.',
      content:
        'Write a short reflection on today’s funnel strategy and explain how awareness, consideration, and conversion can be improved.',
      checklist: [
        'Share at least 3 practical observations from class.',
        'Add one funnel metric you would track weekly.',
        'Attach your document or include a shareable link.',
      ],
      type: 'assignment',
      deliveryMode: 'virtual',
      releaseMode: 'on_class_end',
      dueAtIso: withOffset(48 * 60),
      attachments: 2,
      points: 100,
    },
    {
      id: 'assignment-offline-math-04',
      title: 'Assignment: Differential Equations Problem Set',
      subject: 'Mathematics',
      subjectColor: 'bg-purple-600',
      description:
        'School-assigned take-home work from offline class. Submit with method notes and final answers.',
      content:
        'Solve the provided differential equations and submit a neat step-by-step method with final answers.',
      checklist: [
        'Show each solving step clearly.',
        'Label final answers.',
        'Upload your final work as PDF or Word file.',
      ],
      type: 'assignment',
      deliveryMode: 'offline',
      releaseMode: 'immediate',
      releaseAtIso: withOffset(-720),
      dueAtIso: withOffset(24 * 60),
      attachments: 1,
      points: 80,
    },
    {
      id: 'assignment-scheduled-cs-05',
      title: 'Assignment: API Design Review',
      subject: 'Computer Science',
      subjectColor: 'bg-indigo-600',
      description:
        'Scheduled publication for students in both hybrid and remote cohorts.',
      content:
        'Review the API brief, identify design risks, and propose improvements for endpoint naming, error handling, and authentication flow.',
      checklist: [
        'List at least 3 design issues you noticed.',
        'Propose practical fixes for each issue.',
        'Submit as a structured review note or document.',
      ],
      type: 'assignment',
      deliveryMode: 'virtual',
      releaseMode: 'scheduled',
      releaseAtIso: withOffset(120),
      dueAtIso: withOffset(72 * 60),
      attachments: 3,
      points: 120,
    },
  ];
};

const isReleased = (assessment: Assessment, classEndedAtIso: string | null, nowMs: number) => {
  if (assessment.releaseMode === 'immediate') {
    return true;
  }

  if (assessment.releaseMode === 'scheduled') {
    const releaseMs = assessment.releaseAtIso ? Date.parse(assessment.releaseAtIso) : Number.NaN;
    return Number.isFinite(releaseMs) ? nowMs >= releaseMs : false;
  }

  return !!classEndedAtIso;
};

const resolveStatus = (
  assessment: Assessment,
  progress: AssessmentProgress | undefined,
  classEndedAtIso: string | null,
  nowMs: number
): ResolvedStatus => {
  if (!isReleased(assessment, classEndedAtIso, nowMs)) {
    return 'locked';
  }

  if (progress) {
    if (typeof progress.score === 'number') {
      return 'graded';
    }
    return 'submitted';
  }

  const dueAtMs = Date.parse(assessment.dueAtIso);
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

const getDeliveryModeLabel = (deliveryMode: DeliveryMode) =>
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

const getPrimaryActionLabel = (assessment: AssessmentWithRuntime) => {
  if (assessment.status === 'locked') {
    return 'Not Open';
  }

  if (assessment.status === 'active') {
    return assessment.type === 'classwork' ? 'Open Classwork' : 'Submit Assignment';
  }

  if (assessment.status === 'overdue') {
    return assessment.type === 'classwork' ? 'Time Up' : 'Submit Late';
  }

  if (assessment.status === 'submitted') {
    return 'View Submitted Work';
  }

  return 'View Score';
};

const Assignments = () => {
  const navigate = useNavigate();

  const [assessments] = useState<Assessment[]>(() => createSeedAssessments(new Date()));
  const [progressByAssessmentId, setProgressByAssessmentId] = useState<Record<string, AssessmentProgress>>(
    loadStoredProgress
  );
  const [classEndedAtIso, setClassEndedAtIso] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(CLASS_END_STORAGE_KEY);
  });

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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(ASSESSMENT_PROGRESS_STORAGE_KEY, JSON.stringify(progressByAssessmentId));
  }, [progressByAssessmentId]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CLASS_END_STORAGE_KEY) {
        setClassEndedAtIso(event.newValue);
      }
    };

    const refreshFromStorage = () => {
      setClassEndedAtIso(window.localStorage.getItem(CLASS_END_STORAGE_KEY));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', refreshFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', refreshFromStorage);
    };
  }, []);

  const runtimeAssessments = useMemo<AssessmentWithRuntime[]>(() => {
    return assessments.map((assessment) => {
      const progress = progressByAssessmentId[assessment.id];
      const dueAtMs = Date.parse(assessment.dueAtIso);

      return {
        ...assessment,
        isReleased: isReleased(assessment, classEndedAtIso, nowMs),
        status: resolveStatus(assessment, progress, classEndedAtIso, nowMs),
        dueAtMs,
        remainingMs: dueAtMs - nowMs,
        progress,
      };
    });
  }, [assessments, classEndedAtIso, nowMs, progressByAssessmentId]);

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

      return matchesSearch && matchesSubject && matchesTab;
    });
  }, [activeTab, runtimeAssessments, searchQuery, selectedSubject]);

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

  const selectedAssessment = useMemo(
    () => runtimeAssessments.find((item) => item.id === selectedAssessmentId) || null,
    [runtimeAssessments, selectedAssessmentId]
  );

  const openAssessment = (assessment: AssessmentWithRuntime) => {
    setSelectedAssessmentId(assessment.id);
    setSubmitError('');
    setSubmissionNote(assessment.progress?.submissionNote || '');
    setSubmissionFiles([]);
    setDraftAnswers(assessment.progress?.answers || {});
  };

  const closeAssessmentModal = () => {
    setSelectedAssessmentId(null);
    setSubmitError('');
    setSubmissionNote('');
    setSubmissionFiles([]);
    setDraftAnswers({});
  };

  const simulateClassEndNow = () => {
    const endedAt = new Date().toISOString();
    window.localStorage.setItem(CLASS_END_STORAGE_KEY, endedAt);
    setClassEndedAtIso(endedAt);
  };

  const resetClassEndSimulation = () => {
    window.localStorage.removeItem(CLASS_END_STORAGE_KEY);
    setClassEndedAtIso(null);
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

  const submitSelectedAssessment = () => {
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

    const submittedAtIso = new Date().toISOString();

    if (selectedAssessment.type === 'classwork') {
      const questions = selectedAssessment.questions || [];
      const unansweredQuestion = questions.find((question) => !draftAnswers[question.id]);

      if (unansweredQuestion) {
        setSubmitError('Please answer every question before you submit.');
        return;
      }

      const questionResults: QuestionResult[] = questions.map((question) => {
        const selectedOptionId = draftAnswers[question.id];
        const selectedOptionLabel = question.options.find((option) => option.id === selectedOptionId)?.text || '';
        const correctOption = question.options.find((option) => option.id === question.correctOptionId);
        const isCorrect = selectedOptionId === question.correctOptionId;

        return {
          questionId: question.id,
          prompt: question.prompt,
          selectedOptionId,
          selectedOptionLabel,
          correctOptionId: question.correctOptionId,
          correctOptionLabel: correctOption?.text || '',
          isCorrect,
          earnedPoints: isCorrect ? question.points : 0,
          maxPoints: question.points,
        };
      });

      const score = questionResults.reduce((total, result) => total + result.earnedPoints, 0);
      const maxScore = questionResults.reduce((total, result) => total + result.maxPoints, 0);
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      let feedback = 'Good attempt. Review the corrections and try a similar practice set.';
      if (percentage >= 85) {
        feedback = 'Excellent work. You clearly understood this lesson.';
      } else if (percentage >= 65) {
        feedback = 'Nice progress. Revisit one or two ideas to improve your score.';
      }

      const progress: AssessmentProgress = {
        submittedAtIso,
        answers: draftAnswers,
        score,
        maxScore,
        feedback,
        questionResults,
        lateSubmission: selectedAssessment.status === 'overdue',
      };

      setProgressByAssessmentId((previous) => ({
        ...previous,
        [selectedAssessment.id]: progress,
      }));

      setAutoGradeResult({
        assessmentId: selectedAssessment.id,
        title: selectedAssessment.title,
        score,
        maxScore,
        percentage,
        feedback,
        questionResults,
        submittedAtIso,
      });

      closeAssessmentModal();
      return;
    }

    const trimmedNote = submissionNote.trim();
    const submittedFiles: SubmittedAttachment[] = submissionFiles.map((file) => ({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
    }));

    if (!trimmedNote && submittedFiles.length === 0) {
      setSubmitError('Add a short note or upload at least one file before you submit.');
      return;
    }

    const isLateSubmission = nowMs > selectedAssessment.dueAtMs;
    const progress: AssessmentProgress = {
      submittedAtIso,
      submissionNote: trimmedNote,
      submissionFiles: submittedFiles,
      feedback: isLateSubmission
        ? 'Submitted late. Your tutor will still review it.'
        : 'Submission received. Your tutor will review it shortly.',
      lateSubmission: isLateSubmission,
    };

    setProgressByAssessmentId((previous) => ({
      ...previous,
      [selectedAssessment.id]: progress,
    }));

    closeAssessmentModal();
  };

  const tabs: Array<{ id: ActiveTab; label: string; count: number }> = [
    { id: 'all', label: 'All Tasks', count: stats.total },
    { id: 'active', label: 'Open', count: stats.active },
    { id: 'locked', label: 'Not Open', count: stats.locked },
    { id: 'submitted', label: 'Submitted', count: stats.submitted },
    { id: 'graded', label: 'Scored', count: stats.graded },
    { id: 'overdue', label: 'Past Due', count: stats.overdue },
    { id: 'classwork', label: 'Classwork', count: stats.classwork },
    { id: 'assignment', label: 'Assignments', count: stats.assignment },
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Live Class Update</p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">Tasks that open when class ends</h2>
              <p className="mt-1 text-sm text-gray-600">
                {classEndedAtIso
                  ? `Class ended at ${formatDateTime(classEndedAtIso)}. These tasks are now open for submission.`
                  : 'Class is still live. Tasks set to open after class are still locked for now.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={simulateClassEndNow}
                className="rounded-lg border border-[#3D08BA]/30 bg-[#3D08BA]/10 px-3 py-2 text-xs font-semibold text-[#3D08BA] transition-colors hover:bg-[#3D08BA]/20"
              >
                Test: End Class
              </button>
              <button
                type="button"
                onClick={resetClassEndSimulation}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Clear Test
              </button>
            </div>
          </div>
        </section>

        {classEndedAtIso && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="inline-flex items-center gap-2 font-medium">
              <SparklesIcon className="h-4 w-4" />
              Class ended. Tasks scheduled for end-of-class are now open.
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-gray-500">Active</p>
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

            {showFilters && (
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
            )}
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
          {filteredAssessments.length === 0 ? (
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
                            <span
                              className={`rounded-md px-2.5 py-1 text-xs font-medium text-white ${assessment.subjectColor}`}
                            >
                              {assessment.subject}
                            </span>
                            <span className="rounded-md border border-[#3D08BA]/20 bg-[#3D08BA]/8 px-2.5 py-1 text-xs font-medium text-[#3D08BA]">
                              {assessment.type === 'classwork' ? 'Classwork' : 'Assignment'} • {getDeliveryModeLabel(assessment.deliveryMode)}
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
                              <span>Due: {formatDateTime(assessment.dueAtIso)}</span>
                            </div>
                            {assessment.attachments > 0 && (
                              <div className="inline-flex items-center gap-1.5">
                                <PaperClipIcon className="h-4 w-4" />
                                <span>
                                  {assessment.attachments} file{assessment.attachments > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            <div className="font-semibold text-[#3D08BA]">{assessment.points} pts</div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">{formatReleaseMode(assessment, classEndedAtIso)}</div>

                          {isClassworkActive && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                              <ClockIcon className="h-4 w-4" />
                              Time left: {countdown}
                            </div>
                          )}

                          {assessment.progress && (
                            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">
                                Submitted: {formatDateTime(assessment.progress.submittedAtIso)}
                                {assessment.progress.lateSubmission ? ' (late)' : ''}
                              </p>

                              {typeof assessment.progress.score === 'number' && typeof assessment.progress.maxScore === 'number' && (
                                <p className="mt-1 text-sm font-semibold text-green-700">
                                  Score: {assessment.progress.score}/{assessment.progress.maxScore}
                                </p>
                              )}

                              {assessment.progress.feedback && (
                                <p className="mt-1 text-sm text-gray-700">{assessment.progress.feedback}</p>
                              )}

                              {assessment.progress.submissionFiles && assessment.progress.submissionFiles.length > 0 && (
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
                              )}
                            </div>
                          )}
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

      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-[min(96vw,760px)] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    {selectedAssessment.type === 'classwork' ? 'Classwork' : 'Assignment'} • {getDeliveryModeLabel(selectedAssessment.deliveryMode)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">{selectedAssessment.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">Due by {formatDateTime(selectedAssessment.dueAtIso)}</p>
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
                <p className="mt-1 text-xs text-gray-500">{formatReleaseMode(selectedAssessment, classEndedAtIso)}</p>
              </div>

              <div className="rounded-lg border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-2 text-sm text-gray-800">
                <p className="font-semibold text-[#2F0A8C]">Task content</p>
                <p className="mt-1 leading-relaxed">{selectedAssessment.content}</p>
                {selectedAssessment.checklist && selectedAssessment.checklist.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {selectedAssessment.checklist.map((item, index) => (
                      <li key={`${selectedAssessment.id}-check-${index}`} className="flex items-start gap-2">
                        <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#3D08BA]"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedAssessment.type === 'classwork' && selectedAssessment.status === 'active' && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                  Time remaining: {formatCountdown(selectedAssessment.remainingMs)}
                </div>
              )}

              {selectedAssessment.status === 'locked' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  This task is not open yet. It will unlock at the scheduled time.
                </div>
              )}

              {selectedAssessment.type === 'classwork' && selectedAssessment.questions && (
                <div className="space-y-3">
                  {/* Classwork is auto-graded immediately after submission for objective questions. */}
                  {selectedAssessment.questions.map((question, index) => (
                    <article key={question.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-semibold text-gray-900">
                        Q{index + 1}. {question.prompt}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{question.points} points</p>

                      <div className="mt-2 space-y-2">
                        {question.options.map((option) => {
                          const checked = draftAnswers[question.id] === option.id;
                          const disabled = selectedAssessment.status !== 'active';

                          return (
                            <label
                              key={option.id}
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
                                    [question.id]: option.id,
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
              )}

              {selectedAssessment.type === 'assignment' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Add a note or link</label>
                    <textarea
                      value={submissionNote}
                      onChange={(event) => setSubmissionNote(event.target.value)}
                      rows={4}
                      disabled={selectedAssessment.status === 'locked' || selectedAssessment.status === 'submitted'}
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
                      disabled={selectedAssessment.status === 'locked' || selectedAssessment.status === 'submitted'}
                      onChange={handleAssignmentFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#3D08BA] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#2D0690] disabled:opacity-60"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      You can upload up to {MAX_ASSIGNMENT_ATTACHMENTS} files ({MAX_ASSIGNMENT_ATTACHMENT_MB}MB each).
                    </p>

                    {submissionFiles.length > 0 && (
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
                    )}

                    {selectedAssessment.progress?.submissionFiles &&
                      selectedAssessment.progress.submissionFiles.length > 0 && (
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
                      )}
                  </div>
                </div>
              )}

              {selectedAssessment.progress?.questionResults && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                  <p className="font-semibold text-green-800">Your answers were saved.</p>
                  <p className="mt-1 text-green-700">Open the score view to see what you got right.</p>
                </div>
              )}

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
              <button
                type="button"
                onClick={closeAssessmentModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
              {selectedAssessment.status !== 'locked' && selectedAssessment.status !== 'graded' && (
                <button
                  type="button"
                  onClick={submitSelectedAssessment}
                  className="rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D0690]"
                >
                  {selectedAssessment.type === 'classwork' ? 'Submit and get score' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {autoGradeResult && (
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
      )}
    </div>
  );
};

export default Assignments;
