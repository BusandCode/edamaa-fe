import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaDownload,
  FaEdit,
  FaFileAlt,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaTrash,
  FaUsers,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  archiveSchoolExamNotification,
  createSchoolExam,
  createSchoolQuestionBank,
  deleteSchoolQuestionBank,
  fetchExamSubmissions,
  fetchSchoolExamNotifications,
  markAllSchoolExamNotificationsAsRead,
  markSchoolExamNotificationAsRead,
  fetchSchoolExamTrends,
  fetchSchoolGradingScheme,
  fetchSchoolExams,
  fetchSchoolQuestionBanks,
  gradeExamSubmission,
  publishExamResults,
  updateSchoolQuestionBank,
  updateSchoolGradingScheme,
  type ExamQuestionInput,
  type ExamSubmission,
  type SchoolExam,
  type SchoolExamNotification,
  type SchoolExamTrendPoint,
  type SchoolQuestionBank,
} from '../utils/examsApi';
import {
  buildSchoolReportFrame,
  createPdfBlob,
  downloadFile,
  joinCsvRow,
  schoolReportStyles,
} from '../../../utils/exportFiles';

type DraftQuestion = ExamQuestionInput & { tempId: string };
type GradingSchemeState = { primary: string; secondary: string; tertiary: string };
type ExamStatusFilter = 'all' | 'draft' | 'published';
type QuestionReviewDraft = { awardedPoints: string; feedback: string };
type QuestionBankAction = 'save' | null;
type QuestionBankEditorState = {
  name: string;
  subject: string;
  department: string;
  classGroup: string;
};
type NotificationFilter = 'all' | 'unread';
type QuestionAnalytics = {
  questionId: string;
  prompt: string;
  type: 'mcq' | 'short';
  maxPoints: number;
  answeredCount: number;
  responseRate: number;
  reviewedCount: number;
  averageAwardedPoints: number | null;
  correctCount: number | null;
  accuracyRate: number | null;
  needsAttention: boolean;
};
type AnalyticsScope = 'all' | 'attention' | 'mcq' | 'written';
type TrendScope = 'all' | 'published' | 'scored';

const buildDraftOption = (label: string) => ({
  id: `opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  text: label,
});

const buildDraftQuestionTempId = () => `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const analyticsScopeOptions: Array<{ value: AnalyticsScope; label: string }> = [
  { value: 'all', label: 'All questions' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'mcq', label: 'MCQ only' },
  { value: 'written', label: 'Written only' },
];

const trendScopeOptions: Array<{ value: TrendScope; label: string }> = [
  { value: 'all', label: 'All recent exams' },
  { value: 'published', label: 'Published only' },
  { value: 'scored', label: 'Scored history' },
];

const buildEmptyQuestion = (type: 'mcq' | 'short'): DraftQuestion => ({
  tempId: buildDraftQuestionTempId(),
  type,
  prompt: '',
  maxPoints: 5,
  options: type === 'mcq' ? [buildDraftOption('Option A'), buildDraftOption('Option B')] : [],
  correctOptionId: type === 'mcq' ? null : undefined,
});

const cloneQuestionIntoDraft = (question: ExamQuestionInput): DraftQuestion => {
  if (question.type === 'short') {
    return {
      tempId: buildDraftQuestionTempId(),
      type: 'short',
      prompt: question.prompt,
      maxPoints: question.maxPoints,
      options: [],
      correctOptionId: undefined,
    };
  }

  const optionIdMap = new Map<string, string>();
  const options = (question.options || []).map((option, index) => {
    const clonedOption = buildDraftOption(option.text || `Option ${String.fromCharCode(65 + index)}`);
    if (option.id) {
      optionIdMap.set(option.id, clonedOption.id || '');
    }
    return clonedOption;
  });

  return {
    tempId: buildDraftQuestionTempId(),
    type: 'mcq',
    prompt: question.prompt,
    maxPoints: question.maxPoints,
    options,
    correctOptionId: question.correctOptionId
      ? optionIdMap.get(question.correctOptionId) || options[0]?.id || null
      : null,
  };
};

const formatSchedulePreview = (value: string) => {
  if (!value) {
    return 'Pick a start date and time';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid start date';
  }

  return parsed.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatExamDateTime = (
  value: string,
  variant: 'compact' | 'full' = 'compact'
) => {
  if (!value) {
    return 'No date set';
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

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return 'Recently';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes <= 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} mins ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return formatExamDateTime(value, 'full');
};

const getExamStatus = (exam: SchoolExam): 'draft' | 'published' =>
  exam.publishedAt ? 'published' : 'draft';

const findSubmissionAnswer = (submission: ExamSubmission, questionId?: string) => {
  if (!questionId) {
    return null;
  }

  return submission.answers.find((answer) => answer.questionId === questionId) || null;
};

const findSubmissionQuestionReview = (submission: ExamSubmission, questionId?: string) => {
  if (!questionId) {
    return null;
  }

  return submission.questionReviews?.find((review) => review.questionId === questionId) || null;
};

const resolveSelectedOption = (
  question: ExamQuestionInput,
  answer: { response: string; optionId?: string | null } | null | undefined
) => {
  if (question.type !== 'mcq') {
    return null;
  }

  return (
    (question.options || []).find((option) => {
      const responseText = String(answer?.response || '').trim().toLowerCase();
      return option.id === answer?.optionId || option.text.trim().toLowerCase() === responseText;
    }) || null
  );
};

const resolveQuestionAutoReview = (
  question: ExamQuestionInput,
  answer: { response: string; optionId?: string | null } | null | undefined
) => {
  const answered = hasSubmissionAnswer(answer);
  if (!answered) {
    return { awardedPoints: '0', feedback: '' };
  }

  if (question.type !== 'mcq' || !question.correctOptionId) {
    return { awardedPoints: '', feedback: '' };
  }

  const selectedOption = resolveSelectedOption(question, answer);
  const isCorrect = selectedOption?.id === question.correctOptionId;
  return {
    awardedPoints: isCorrect ? String(question.maxPoints || 0) : '0',
    feedback: '',
  };
};

const hasSubmissionAnswer = (
  answer: { response: string; optionId?: string | null } | null | undefined
) => Boolean(answer?.optionId || String(answer?.response || '').trim());

const resolveEducationLevel = (classGroup: string) => {
  const normalized = classGroup.trim().toLowerCase();
  if (/(nursery|creche|kg|primary|basic)/.test(normalized)) {
    return 'primary';
  }
  if (/(ss|jss|secondary|junior|senior)/.test(normalized)) {
    return 'secondary';
  }
  if (/(nd|hnd|poly|university|college|100|200|300|400|500|600|level)/.test(normalized)) {
    return 'tertiary';
  }
  return 'secondary';
};

const formatScoreLabel = (level: string) => {
  if (level === 'tertiary') {
    return 'Course score';
  }
  if (level === 'primary') {
    return 'Marks';
  }
  return 'Exam score';
};

const formatGradePointLabel = (level: string) => {
  if (level === 'tertiary') {
    return 'Grade point';
  }
  return 'Score';
};

const computeGradePoint = (score: number, maxScore: number, scheme: string) => {
  if (maxScore <= 0) {
    return 0;
  }
  const scale = scheme === 'cgpa-4' ? 4 : 5;
  return Math.min(scale, Math.max(0, (score / maxScore) * scale));
};

const gradingSchemeOptions = {
  primary: [
    { value: 'standard', label: 'Distinction / Excellent / Very Good / Good / Pass' },
    { value: 'letter', label: 'A / B / C / D / E / F' },
  ],
  secondary: [
    { value: 'waec', label: 'WAEC (A1-B2-B3-C4-C5-C6-D7-E8-F9)' },
    { value: 'letter', label: 'A / B / C / D / E / F' },
  ],
  tertiary: [
    { value: 'cgpa-5', label: 'CGPA 5.0 scale' },
    { value: 'cgpa-4', label: 'CGPA 4.0 scale' },
  ],
};

const resolveGradeLabelWithScheme = (level: string, scheme: string, score: number, maxScore: number) => {
  if (level === 'primary' && scheme === 'letter') {
    return resolveGradeLabel('secondary', score, maxScore);
  }
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
  return resolveGradeLabel(level, score, maxScore);
};
const resolveGradeLabel = (level: string, score: number, maxScore: number) => {
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

const SchoolExams = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<SchoolQuestionBank[]>([]);
  const [isQuestionBanksLoading, setIsQuestionBanksLoading] = useState(false);
  const [examNotifications, setExamNotifications] = useState<SchoolExamNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationBusyId, setNotificationBusyId] = useState<string | 'all' | null>(null);
  const [questionBankName, setQuestionBankName] = useState('');
  const [questionBankAction, setQuestionBankAction] = useState<QuestionBankAction>(null);
  const [editingQuestionBankId, setEditingQuestionBankId] = useState<string | null>(null);
  const [questionBankEditor, setQuestionBankEditor] = useState<QuestionBankEditorState>({
    name: '',
    subject: '',
    department: '',
    classGroup: '',
  });
  const [questionBankBusyId, setQuestionBankBusyId] = useState<string | null>(null);
  const [gradingTarget, setGradingTarget] = useState<ExamSubmission | null>(null);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [questionReviewDrafts, setQuestionReviewDrafts] = useState<Record<string, QuestionReviewDraft>>({});
  const [analyticsExportAction, setAnalyticsExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [trendExportAction, setTrendExportAction] = useState<'csv' | 'pdf' | null>(null);
  const [reportExportAction, setReportExportAction] = useState<'pdf' | null>(null);
  const [trendSeries, setTrendSeries] = useState<SchoolExamTrendPoint[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [examSearch, setExamSearch] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState<ExamStatusFilter>('all');
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>('all');
  const [trendScope, setTrendScope] = useState<TrendScope>('all');

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('');
  const [classGroup, setClassGroup] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [startAt, setStartAt] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([buildEmptyQuestion('mcq')]);
  const [activeQuestionTempId, setActiveQuestionTempId] = useState<string | null>(null);
  const [gradingScheme, setGradingScheme] = useState<GradingSchemeState>({
    primary: 'standard',
    secondary: 'waec',
    tertiary: 'cgpa-5',
  });

  const activeExam = useMemo(
    () => exams.find((exam) => exam.id === activeExamId) || null,
    [exams, activeExamId]
  );
  const activeExamScheme = activeExam?.gradingScheme || gradingScheme;
  const activeExamLevel = useMemo(
    () => (activeExam ? resolveEducationLevel(activeExam.classGroup) : 'secondary'),
    [activeExam]
  );
  const draftLevel = useMemo(() => resolveEducationLevel(classGroup), [classGroup]);
  const hasDraftQuestions = useMemo(
    () => questions.some((question) => question.prompt.trim()),
    [questions]
  );
  const totalDraftPoints = useMemo(
    () => questions.reduce((sum, question) => sum + Math.max(0, Number(question.maxPoints) || 0), 0),
    [questions]
  );
  const activeDraftQuestion = useMemo(
    () => questions.find((question) => question.tempId === activeQuestionTempId) || questions[0] || null,
    [questions, activeQuestionTempId]
  );
  const activeDraftQuestionIndex = useMemo(
    () => questions.findIndex((question) => question.tempId === activeDraftQuestion?.tempId),
    [questions, activeDraftQuestion]
  );
  const publishedExamsCount = useMemo(
    () => exams.filter((exam) => getExamStatus(exam) === 'published').length,
    [exams]
  );
  const draftExamsCount = useMemo(
    () => exams.filter((exam) => getExamStatus(exam) === 'draft').length,
    [exams]
  );
  const upcomingExamsCount = useMemo(
    () => exams.filter((exam) => new Date(exam.startAt).getTime() > Date.now()).length,
    [exams]
  );
  const nextExam = useMemo(() => {
    const futureExams = exams
      .filter((exam) => {
        const timestamp = new Date(exam.startAt).getTime();
        return Number.isFinite(timestamp) && timestamp > Date.now();
      })
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
    return futureExams[0] || null;
  }, [exams]);
  const recommendedQuestionBanks = useMemo(() => {
    const normalizedSubject = subject.trim().toLowerCase();
    const normalizedDepartment = department.trim().toLowerCase();
    const normalizedClassGroup = classGroup.trim().toLowerCase();

    return [...questionBanks]
      .map((bank) => {
        let score = 0;
        if (normalizedSubject && bank.subject?.trim().toLowerCase() === normalizedSubject) {
          score += 3;
        }
        if (normalizedDepartment && bank.department?.trim().toLowerCase() === normalizedDepartment) {
          score += 2;
        }
        if (normalizedClassGroup && bank.classGroup?.trim().toLowerCase() === normalizedClassGroup) {
          score += 2;
        }
        return { bank, score };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return new Date(right.bank.updatedAt).getTime() - new Date(left.bank.updatedAt).getTime();
      })
      .map((entry) => entry.bank);
  }, [questionBanks, subject, department, classGroup]);
  const filteredExamNotifications = useMemo(() => {
    if (notificationFilter === 'unread') {
      return examNotifications.filter((notification) => !notification.isRead);
    }

    return examNotifications;
  }, [examNotifications, notificationFilter]);
  const filteredExams = useMemo(() => {
    const query = examSearch.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesStatus =
        examStatusFilter === 'all' ? true : getExamStatus(exam) === examStatusFilter;
      const matchesQuery =
        !query ||
        [exam.title, exam.subject, exam.department, exam.classGroup]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [exams, examSearch, examStatusFilter]);
  const activeExamTotalPoints = useMemo(
    () =>
      activeExam?.questions.reduce(
        (sum, question) => sum + Math.max(0, Number(question.maxPoints) || 0),
        0
      ) || 0,
    [activeExam]
  );
  const pendingSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'submitted').length,
    [submissions]
  );
  const gradedSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'graded').length,
    [submissions]
  );
  const publishedSubmissionCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'published').length,
    [submissions]
  );
  const scoredSubmissions = useMemo(
    () =>
      submissions.filter(
        (submission) => typeof submission.score === 'number' && submission.maxScore > 0
      ),
    [submissions]
  );
  const averageScoreLabel = useMemo(() => {
    if (scoredSubmissions.length === 0) {
      return null;
    }

    const totalPercentage = scoredSubmissions.reduce((sum, submission) => {
      return sum + ((submission.score || 0) / submission.maxScore) * 100;
    }, 0);

    return `${Math.round(totalPercentage / scoredSubmissions.length)}% avg`;
  }, [scoredSubmissions]);
  const rankedSubmissions = useMemo(() => {
    return [...scoredSubmissions].sort((left, right) => {
      const leftPercentage = ((left.score || 0) / left.maxScore) * 100;
      const rightPercentage = ((right.score || 0) / right.maxScore) * 100;
      return rightPercentage - leftPercentage;
    });
  }, [scoredSubmissions]);
  const topPerformers = useMemo(() => rankedSubmissions.slice(0, 5), [rankedSubmissions]);
  const supportPerformers = useMemo(() => {
    return [...rankedSubmissions]
      .sort((left, right) => {
        const leftPercentage = ((left.score || 0) / left.maxScore) * 100;
        const rightPercentage = ((right.score || 0) / right.maxScore) * 100;
        return leftPercentage - rightPercentage;
      })
      .slice(0, 5);
  }, [rankedSubmissions]);
  const gradeDistribution = useMemo(() => {
    if (!activeExam) {
      return [];
    }

    const distribution = new Map<string, number>();
    scoredSubmissions.forEach((submission) => {
      const label = resolveGradeLabelWithScheme(
        activeExamLevel,
        activeExamScheme[activeExamLevel],
        submission.score || 0,
        submission.maxScore
      );
      distribution.set(label, (distribution.get(label) || 0) + 1);
    });

    return Array.from(distribution.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count);
  }, [activeExam, activeExamLevel, activeExamScheme, scoredSubmissions]);
  const questionAnalytics = useMemo<QuestionAnalytics[]>(() => {
    if (!activeExam || submissions.length === 0) {
      return [];
    }

    return activeExam.questions.map((question) => {
      const submissionCount = submissions.length;
      let answeredCount = 0;
      let reviewedCount = 0;
      let awardedPointsTotal = 0;
      let correctCount = 0;

      submissions.forEach((submission) => {
        const answer = findSubmissionAnswer(submission, question.id);
        const hasAnswer = hasSubmissionAnswer(answer);
        if (hasAnswer) {
          answeredCount += 1;
        }

        const questionReview = findSubmissionQuestionReview(submission, question.id);
        if (typeof questionReview?.awardedPoints === 'number') {
          reviewedCount += 1;
          awardedPointsTotal += questionReview.awardedPoints;
        } else if (question.type === 'mcq' && question.correctOptionId) {
          const selectedOption = resolveSelectedOption(question, answer);
          const autoAwardedPoints =
            hasAnswer && selectedOption?.id === question.correctOptionId ? question.maxPoints || 0 : 0;
          awardedPointsTotal += autoAwardedPoints;
        }

        if (question.type === 'mcq' && question.correctOptionId && hasAnswer) {
          const selectedOption = resolveSelectedOption(question, answer);
          if (selectedOption?.id === question.correctOptionId) {
            correctCount += 1;
          }
        }
      });

      const responseRate = submissionCount > 0 ? answeredCount / submissionCount : 0;
      const reviewBaseCount =
        question.type === 'mcq' && question.correctOptionId ? submissionCount : reviewedCount;
      const averageAwardedPoints =
        reviewBaseCount > 0 ? awardedPointsTotal / reviewBaseCount : null;
      const accuracyRate =
        question.type === 'mcq' && question.correctOptionId && answeredCount > 0
          ? correctCount / answeredCount
          : null;
      const normalizedPerformance =
        averageAwardedPoints !== null && question.maxPoints > 0
          ? averageAwardedPoints / question.maxPoints
          : null;
      const needsAttention =
        responseRate < 0.6 ||
        (accuracyRate !== null && accuracyRate < 0.5) ||
        (normalizedPerformance !== null && normalizedPerformance < 0.5);

      return {
        questionId: question.id || '',
        prompt: question.prompt,
        type: question.type,
        maxPoints: question.maxPoints,
        answeredCount,
        responseRate,
        reviewedCount,
        averageAwardedPoints,
        correctCount: question.type === 'mcq' && question.correctOptionId ? correctCount : null,
        accuracyRate,
        needsAttention,
      };
    });
  }, [activeExam, submissions]);
  const filteredQuestionAnalytics = useMemo(() => {
    return questionAnalytics.filter((question) => {
      if (analyticsScope === 'attention') {
        return question.needsAttention;
      }
      if (analyticsScope === 'mcq') {
        return question.type === 'mcq';
      }
      if (analyticsScope === 'written') {
        return question.type === 'short';
      }
      return true;
    });
  }, [analyticsScope, questionAnalytics]);
  const filteredWeakestQuestion = useMemo(() => {
    if (filteredQuestionAnalytics.length === 0) {
      return null;
    }

    return [...filteredQuestionAnalytics].sort((left, right) => {
      const leftScore =
        left.accuracyRate ?? (left.averageAwardedPoints !== null && left.maxPoints > 0
          ? left.averageAwardedPoints / left.maxPoints
          : 1);
      const rightScore =
        right.accuracyRate ?? (right.averageAwardedPoints !== null && right.maxPoints > 0
          ? right.averageAwardedPoints / right.maxPoints
          : 1);

      return leftScore - rightScore;
    })[0];
  }, [filteredQuestionAnalytics]);
  const filteredLowPerformingQuestionCount = useMemo(
    () => filteredQuestionAnalytics.filter((question) => question.needsAttention).length,
    [filteredQuestionAnalytics]
  );
  const filteredTrendSeries = useMemo(() => {
    return trendSeries.filter((point) => {
      if (point.isCurrent) {
        return true;
      }
      if (trendScope === 'published') {
        return point.status === 'published';
      }
      if (trendScope === 'scored') {
        return point.averagePercentage !== null;
      }
      return true;
    });
  }, [trendScope, trendSeries]);
  const previousTrendPoint = useMemo(() => {
    const currentIndex = filteredTrendSeries.findIndex((point) => point.isCurrent);
    if (currentIndex <= 0) {
      return null;
    }

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const candidate = filteredTrendSeries[index];
      if (candidate.averagePercentage !== null) {
        return candidate;
      }
    }

    return null;
  }, [filteredTrendSeries]);
  const currentTrendPoint = useMemo(
    () => filteredTrendSeries.find((point) => point.isCurrent) || null,
    [filteredTrendSeries]
  );
  const trendDeltaLabel = useMemo(() => {
    if (
      !currentTrendPoint ||
      !previousTrendPoint ||
      currentTrendPoint.averagePercentage === null ||
      previousTrendPoint.averagePercentage === null
    ) {
      return null;
    }

    const delta = currentTrendPoint.averagePercentage - previousTrendPoint.averagePercentage;
    const roundedDelta = Math.round(delta);
    const sign = roundedDelta > 0 ? '+' : '';
    return `${sign}${roundedDelta} pts vs previous comparable exam`;
  }, [currentTrendPoint, previousTrendPoint]);
  const reviewedAnswerCount = useMemo(() => {
    if (!gradingTarget || !activeExam) {
      return 0;
    }

    return activeExam.questions.filter((question) =>
      hasSubmissionAnswer(findSubmissionAnswer(gradingTarget, question.id))
    ).length;
  }, [gradingTarget, activeExam]);
  const reviewedQuestionScoreCount = useMemo(() => {
    if (!activeExam) {
      return 0;
    }

    return activeExam.questions.filter((question) => {
      const reviewDraft = questionReviewDrafts[question.id || ''];
      return reviewDraft && reviewDraft.awardedPoints.trim() !== '';
    }).length;
  }, [activeExam, questionReviewDrafts]);
  const gradeScore = useMemo(() => {
    if (!activeExam) {
      return '';
    }

    const total = activeExam.questions.reduce((sum, question) => {
      const rawValue = questionReviewDrafts[question.id || '']?.awardedPoints ?? '';
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) {
        return sum;
      }

      return sum + Math.max(0, Math.min(numberValue, question.maxPoints || 0));
    }, 0);

    return String(total);
  }, [activeExam, questionReviewDrafts]);

  const resetForm = () => {
    const firstQuestion = buildEmptyQuestion('mcq');
    setTitle('');
    setSubject('');
    setDepartment('');
    setClassGroup('');
    setDurationMinutes(45);
    setStartAt('');
    setQuestions([firstQuestion]);
    setActiveQuestionTempId(firstQuestion.tempId);
    setQuestionBankName('');
  };

  const loadExams = async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const payload = await fetchSchoolExams();
      setExams(payload.exams || []);
      if (payload.gradingScheme) {
        setGradingScheme(payload.gradingScheme);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load exams right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGradingScheme = async () => {
    try {
      const payload = await fetchSchoolGradingScheme();
      setGradingScheme(payload.gradingScheme);
    } catch {
      // keep defaults
    }
  };

  const loadQuestionBanks = async () => {
    setIsQuestionBanksLoading(true);
    try {
      const payload = await fetchSchoolQuestionBanks();
      setQuestionBanks(payload.questionBanks || []);
    } catch (error) {
      setNotice((current) =>
        current || (error instanceof Error ? error.message : 'Could not load question banks right now.')
      );
    } finally {
      setIsQuestionBanksLoading(false);
    }
  };

  const loadExamNotifications = async () => {
    setIsNotificationsLoading(true);
    try {
      const payload = await fetchSchoolExamNotifications();
      setExamNotifications(payload.notifications || []);
      setUnreadNotificationCount(payload.unreadCount || 0);
    } catch (error) {
      setNotice((current) =>
        current || (error instanceof Error ? error.message : 'Could not load exam notifications right now.')
      );
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    setNotice(null);
    setNotificationBusyId(notificationId);
    try {
      const payload = await markSchoolExamNotificationAsRead(notificationId);
      setExamNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification
        )
      );
      setUnreadNotificationCount(payload.unreadCount);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark this update as read.');
    } finally {
      setNotificationBusyId(null);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    if (unreadNotificationCount === 0) {
      return;
    }

    setNotice(null);
    setNotificationBusyId('all');
    try {
      await markAllSchoolExamNotificationsAsRead();
      setExamNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not mark all updates as read.');
    } finally {
      setNotificationBusyId(null);
    }
  };

  const handleArchiveNotification = async (notificationId: string) => {
    setNotice(null);
    setNotificationBusyId(notificationId);
    try {
      const payload = await archiveSchoolExamNotification(notificationId);
      setExamNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
      setUnreadNotificationCount(payload.unreadCount);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not remove this update.');
    } finally {
      setNotificationBusyId(null);
    }
  };

  const loadTrendSeries = async (examId: string) => {
    setIsTrendLoading(true);
    try {
      const payload = await fetchSchoolExamTrends(examId);
      setTrendSeries(payload.trends || []);
    } catch (error) {
      setTrendSeries([]);
      setNotice((current) =>
        current || (error instanceof Error ? error.message : 'Could not load trend comparison right now.')
      );
    } finally {
      setIsTrendLoading(false);
    }
  };

  const loadSubmissions = async (examId: string) => {
    setIsSubmissionsLoading(true);
    setNotice(null);
    setSubmissions([]);
    setTrendSeries([]);
    void loadTrendSeries(examId);
    try {
      const payload = await fetchExamSubmissions(examId);
      setSubmissions(payload.submissions || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load submissions right now.');
    } finally {
      setIsSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    void loadExams();
    void loadGradingScheme();
    void loadQuestionBanks();
    void loadExamNotifications();
  }, []);

  useEffect(() => {
    if (exams.length === 0) {
      setActiveExamId(null);
      setSubmissions([]);
      setTrendSeries([]);
      return;
    }

    if (activeExamId && exams.some((exam) => exam.id === activeExamId)) {
      return;
    }

    setActiveExamId(exams[0].id);
    void loadSubmissions(exams[0].id);
  }, [exams, activeExamId]);

  useEffect(() => {
    if (!questions.some((question) => question.tempId === activeQuestionTempId)) {
      setActiveQuestionTempId(questions[0]?.tempId ?? null);
    }
  }, [questions, activeQuestionTempId]);

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreateOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCreateOpen]);

  const handleCreateExam = async () => {
    setNotice(null);
    const missingCorrectOption = questions.find(
      (question) => question.type === 'mcq' && !String(question.correctOptionId || '').trim()
    );
    if (missingCorrectOption) {
      setNotice('Choose the correct option for every multiple-choice question before creating the exam.');
      return;
    }

    try {
      const payload = await createSchoolExam({
        title,
        subject,
        department,
        classGroup,
        durationMinutes,
        startAt,
        questions: questions.map(({ tempId, ...rest }) => rest),
        gradingScheme,
      });
      setExams((prev) => [payload.exam, ...prev]);
      resetForm();
      setIsCreateOpen(false);
      setNotice('Exam created successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create exam right now.');
    }
  };

  const buildQuestionBankName = () => {
    const trimmedName = questionBankName.trim();
    if (trimmedName) {
      return trimmedName;
    }

    const parts = [subject.trim() || title.trim() || 'Question bank', classGroup.trim(), department.trim()]
      .filter(Boolean);

    return parts.join(' • ') || `Question bank ${new Date().toLocaleDateString()}`;
  };

  const handleSaveQuestionBank = async () => {
    setNotice(null);
    if (!hasDraftQuestions) {
      setNotice('Add at least one full question before saving this draft to the question bank.');
      return;
    }

    const missingCorrectOption = questions.find(
      (question) => question.type === 'mcq' && !String(question.correctOptionId || '').trim()
    );
    if (missingCorrectOption) {
      setNotice('Choose the correct option for every multiple-choice question before saving the question bank.');
      return;
    }

    setQuestionBankAction('save');
    try {
      const payload = await createSchoolQuestionBank({
        name: buildQuestionBankName(),
        subject,
        department,
        classGroup,
        questions: questions.map(({ tempId, ...rest }) => rest),
      });
      setQuestionBanks((prev) => [
        payload.questionBank,
        ...prev.filter((bank) => bank.id !== payload.questionBank.id),
      ]);
      setQuestionBankName('');
      setNotice(`Saved ${payload.questionBank.name} to the question bank.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this question bank right now.');
    } finally {
      setQuestionBankAction(null);
    }
  };

  const openQuestionBankEditor = (questionBank: SchoolQuestionBank) => {
    setEditingQuestionBankId(questionBank.id);
    setQuestionBankEditor({
      name: questionBank.name,
      subject: questionBank.subject || '',
      department: questionBank.department || '',
      classGroup: questionBank.classGroup || '',
    });
  };

  const handleUpdateQuestionBankDetails = async (questionBankId: string) => {
    setNotice(null);
    setQuestionBankBusyId(questionBankId);
    try {
      const payload = await updateSchoolQuestionBank(questionBankId, {
        name: questionBankEditor.name,
        subject: questionBankEditor.subject,
        department: questionBankEditor.department,
        classGroup: questionBankEditor.classGroup,
      });
      setQuestionBanks((prev) =>
        prev.map((bank) => (bank.id === questionBankId ? payload.questionBank : bank))
      );
      setEditingQuestionBankId(null);
      setNotice(`Updated ${payload.questionBank.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this question bank right now.');
    } finally {
      setQuestionBankBusyId(null);
    }
  };

  const handleSyncQuestionBankWithDraft = async (questionBank: SchoolQuestionBank) => {
    setNotice(null);
    if (!hasDraftQuestions) {
      setNotice('Add at least one full question before replacing a saved question bank.');
      return;
    }

    const missingCorrectOption = questions.find(
      (question) => question.type === 'mcq' && !String(question.correctOptionId || '').trim()
    );
    if (missingCorrectOption) {
      setNotice('Choose the correct option for every multiple-choice question before updating the bank.');
      return;
    }

    setQuestionBankBusyId(questionBank.id);
    try {
      const payload = await updateSchoolQuestionBank(questionBank.id, {
        questions: questions.map(({ tempId, ...rest }) => rest),
      });
      setQuestionBanks((prev) =>
        prev.map((bank) => (bank.id === questionBank.id ? payload.questionBank : bank))
      );
      setNotice(`${payload.questionBank.name} now matches your current draft questions.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not update this question bank right now.');
    } finally {
      setQuestionBankBusyId(null);
    }
  };

  const handleDeleteQuestionBank = async (questionBank: SchoolQuestionBank) => {
    setNotice(null);
    setQuestionBankBusyId(questionBank.id);
    try {
      await deleteSchoolQuestionBank(questionBank.id);
      setQuestionBanks((prev) => prev.filter((bank) => bank.id !== questionBank.id));
      if (editingQuestionBankId === questionBank.id) {
        setEditingQuestionBankId(null);
      }
      setNotice(`${questionBank.name} removed from the question bank.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not delete this question bank right now.');
    } finally {
      setQuestionBankBusyId(null);
    }
  };

  const handleImportQuestionBank = (questionBank: SchoolQuestionBank) => {
    const importedQuestions = questionBank.questions.map((question) => cloneQuestionIntoDraft(question));
    if (importedQuestions.length === 0) {
      setNotice('This question bank has no questions to import.');
      return;
    }

    setQuestions((prev) => {
      const shouldReplaceCurrentDraft = prev.length === 1 && !prev[0].prompt.trim();
      return shouldReplaceCurrentDraft ? importedQuestions : [...prev, ...importedQuestions];
    });
    setActiveQuestionTempId(importedQuestions[0].tempId);
    setSubject((current) => current || questionBank.subject || '');
    setDepartment((current) => current || questionBank.department || '');
    setClassGroup((current) => current || questionBank.classGroup || '');
    setNotice(
      `${questionBank.name} added to this exam draft.`
    );
  };

  const addQuestion = (type: 'mcq' | 'short') => {
    const nextQuestion = buildEmptyQuestion(type);
    setQuestions((prev) => [...prev, nextQuestion]);
    setActiveQuestionTempId(nextQuestion.tempId);
  };

  const removeQuestion = (tempId: string) => {
    if (questions.length === 1) {
      return;
    }
    setQuestions((prev) => prev.filter((question) => question.tempId !== tempId));
  };

  const openSubmissionReview = (submission: ExamSubmission) => {
    if (!activeExam) {
      return;
    }

    const nextQuestionReviews = activeExam.questions.reduce<Record<string, QuestionReviewDraft>>(
      (collection, question) => {
        const existingReview = findSubmissionQuestionReview(submission, question.id);
        const hasAnswer = hasSubmissionAnswer(findSubmissionAnswer(submission, question.id));
        const autoReview = resolveQuestionAutoReview(
          question,
          findSubmissionAnswer(submission, question.id)
        );

        collection[question.id || ''] = {
          awardedPoints:
            existingReview?.awardedPoints !== undefined
              ? String(existingReview.awardedPoints)
              : autoReview.awardedPoints || (hasAnswer ? '' : '0'),
          feedback: existingReview?.feedback || autoReview.feedback || '',
        };

        return collection;
      },
      {}
    );

    setGradingTarget(submission);
    setGradeFeedback(submission.feedback || '');
    setQuestionReviewDrafts(nextQuestionReviews);
  };

  const handlePublish = async (examId: string) => {
    setNotice(null);
    try {
      if (gradedSubmissionCount === 0) {
        setNotice(
          pendingSubmissionCount > 0
            ? 'Grade pending submissions before publishing results.'
            : 'No graded submissions are ready to publish yet.'
        );
        return;
      }

      const payload = await publishExamResults(examId);
      setNotice(
        `${payload.newlyPublishedCount} result${payload.newlyPublishedCount === 1 ? '' : 's'} released. ${
          payload.awaitingReviewCount > 0
            ? `${payload.awaitingReviewCount} submission${payload.awaitingReviewCount === 1 ? '' : 's'} still awaiting review.`
            : 'All graded results are now visible to students.'
        }`
      );
      await loadExams();
      await loadExamNotifications();
      if (activeExamId === examId) {
        await loadSubmissions(examId);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not publish results.');
    }
  };

  const openExamFromNotification = (examId: string) => {
    const targetExam = exams.find((exam) => exam.id === examId);
    if (!targetExam) {
      setNotice('This exam is no longer available in your assessment list.');
      return;
    }

    setActiveExamId(examId);
    void loadSubmissions(examId);
    window.setTimeout(() => {
      document.getElementById('exam-management-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  const closeSubmissionReview = () => {
    setGradingTarget(null);
    setGradeFeedback('');
    setQuestionReviewDrafts({});
  };

  const handleExportAnalyticsCsv = () => {
    if (!activeExam || filteredQuestionAnalytics.length === 0 || analyticsExportAction) {
      return;
    }

    setAnalyticsExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Exam', 'Title', activeExam.title]),
        joinCsvRow(['Exam', 'Subject', activeExam.subject]),
        joinCsvRow(['Exam', 'Department', activeExam.department]),
        joinCsvRow(['Exam', 'Class', activeExam.classGroup]),
        joinCsvRow(['Exam', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow([
          'Exam',
          'Analytics view',
          analyticsScopeOptions.find((option) => option.value === analyticsScope)?.label || 'All questions',
        ]),
        joinCsvRow(['Exam', 'Submissions', submissions.length]),
        joinCsvRow(['Exam', 'Questions shown', filteredQuestionAnalytics.length]),
        joinCsvRow(['Exam', 'Low performing questions', filteredLowPerformingQuestionCount]),
      ];

      if (filteredWeakestQuestion) {
        lines.push(joinCsvRow(['Exam', 'Weakest question', filteredWeakestQuestion.prompt]));
      }

      lines.push('');
      lines.push(
        joinCsvRow([
          'Question #',
          'Prompt',
          'Type',
          'Answered',
          'Response Rate (%)',
          'Accuracy / Reviewed',
          'Average Marks',
          'Needs Attention',
        ])
      );

      filteredQuestionAnalytics.forEach((question, index) => {
        lines.push(
          joinCsvRow([
            index + 1,
            question.prompt,
            question.type === 'mcq' ? 'Multiple choice' : 'Written response',
            `${question.answeredCount}/${submissions.length}`,
            Math.round(question.responseRate * 100),
            question.accuracyRate !== null
              ? `${Math.round(question.accuracyRate * 100)}%`
              : `${question.reviewedCount}/${submissions.length}`,
            question.averageAwardedPoints !== null
              ? `${question.averageAwardedPoints.toFixed(1)}/${question.maxPoints}`
              : 'Pending',
            question.needsAttention ? 'Yes' : 'No',
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-exam-analytics-${dateStamp}.csv`
      );
      setNotice('Exam analytics CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Analytics CSV export failed.');
    } finally {
      setAnalyticsExportAction(null);
    }
  };

  const handleExportAnalyticsPdf = async () => {
    if (!activeExam || filteredQuestionAnalytics.length === 0 || analyticsExportAction) {
      return;
    }

    setAnalyticsExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);

      const bodyRows = [
        ['Question', 'Type', 'Response Rate', 'Accuracy / Reviewed', 'Average Marks', 'Flag'],
        ...filteredQuestionAnalytics.map((question, index) => [
          `Q${index + 1}`,
          question.type === 'mcq' ? 'MCQ' : 'Written',
          `${Math.round(question.responseRate * 100)}%`,
          question.accuracyRate !== null
            ? `${Math.round(question.accuracyRate * 100)}%`
            : `${question.reviewedCount}/${submissions.length}`,
          question.averageAwardedPoints !== null
            ? `${question.averageAwardedPoints.toFixed(1)}/${question.maxPoints}`
            : 'Pending',
          question.needsAttention ? 'Needs attention' : 'Stable',
        ]),
      ];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [28, 28, 28, 32],
        content: [
          { text: 'Edamaa Exam Question Analytics', style: 'header' },
          { text: `${activeExam.title} • ${activeExam.subject}`, style: 'subheader' },
          {
            text: `Class: ${activeExam.department} • ${activeExam.classGroup}`,
            style: 'muted',
          },
          { text: `Generated: ${new Date().toLocaleString()}`, style: 'muted' },
          {
            text: `Analytics view: ${
              analyticsScopeOptions.find((option) => option.value === analyticsScope)?.label || 'All questions'
            }`,
            style: 'muted',
          },
          { text: `Submissions: ${submissions.length}`, style: 'muted' },
          { text: `Questions shown: ${filteredQuestionAnalytics.length}`, style: 'muted' },
          { text: `Low performing questions: ${filteredLowPerformingQuestionCount}`, style: 'muted' },
          filteredWeakestQuestion
            ? {
                text: `Weakest question: ${filteredWeakestQuestion.prompt}`,
                style: 'muted',
                margin: [0, 0, 0, 10],
              }
            : { text: '', margin: [0, 0, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', 'auto', 'auto', 'auto', '*'],
              body: bodyRows,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
          subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
          muted: { fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 2] },
        },
      } as Record<string, unknown>;

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-exam-analytics-${dateStamp}.pdf`);
      setNotice('Exam analytics PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Analytics PDF export failed.');
    } finally {
      setAnalyticsExportAction(null);
    }
  };

  const handleExportTrendsCsv = () => {
    if (!activeExam || filteredTrendSeries.length === 0 || trendExportAction) {
      return;
    }

    setTrendExportAction('csv');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        joinCsvRow(['Section', 'Metric', 'Value']),
        joinCsvRow(['Exam', 'Title', activeExam.title]),
        joinCsvRow(['Exam', 'Subject', activeExam.subject]),
        joinCsvRow(['Exam', 'Department', activeExam.department]),
        joinCsvRow(['Exam', 'Class', activeExam.classGroup]),
        joinCsvRow(['Exam', 'Generated At', new Date().toLocaleString()]),
        joinCsvRow([
          'Exam',
          'Trend view',
          trendScopeOptions.find((option) => option.value === trendScope)?.label || 'All recent exams',
        ]),
        joinCsvRow(['Exam', 'Trend rows shown', filteredTrendSeries.length]),
      ];

      if (trendDeltaLabel) {
        lines.push(joinCsvRow(['Exam', 'Trend delta', trendDeltaLabel]));
      }

      lines.push('');
      lines.push(
        joinCsvRow([
          'Exam #',
          'Title',
          'Date',
          'Status',
          'Submissions',
          'Scored',
          'Average Score (%)',
          'Current Exam',
        ])
      );

      filteredTrendSeries.forEach((point, index) => {
        lines.push(
          joinCsvRow([
            index + 1,
            point.title,
            formatExamDateTime(point.startAt, 'full'),
            point.status,
            point.submissionsCount,
            point.scoredCount,
            point.averagePercentage !== null ? Math.round(point.averagePercentage) : 'Pending',
            point.isCurrent ? 'Yes' : 'No',
          ])
        );
      });

      downloadFile(
        new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
        `edamaa-exam-trends-${dateStamp}.csv`
      );
      setNotice('Exam trend CSV export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Trend CSV export failed.');
    } finally {
      setTrendExportAction(null);
    }
  };

  const handleExportTrendsPdf = async () => {
    if (!activeExam || filteredTrendSeries.length === 0 || trendExportAction) {
      return;
    }

    setTrendExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);

      const bodyRows = [
        ['Exam', 'Date', 'Status', 'Submissions', 'Scored', 'Avg Score', 'Current'],
        ...filteredTrendSeries.map((point, index) => [
          `#${index + 1}`,
          formatExamDateTime(point.startAt, 'compact'),
          point.status,
          String(point.submissionsCount),
          String(point.scoredCount),
          point.averagePercentage !== null ? `${Math.round(point.averagePercentage)}%` : 'Pending',
          point.isCurrent ? 'Yes' : 'No',
        ]),
      ];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [28, 28, 28, 32],
        content: [
          { text: 'Edamaa Exam Trend Comparison', style: 'header' },
          { text: `${activeExam.title} • ${activeExam.subject}`, style: 'subheader' },
          {
            text: `Class: ${activeExam.department} • ${activeExam.classGroup}`,
            style: 'muted',
          },
          { text: `Generated: ${new Date().toLocaleString()}`, style: 'muted' },
          {
            text: `Trend view: ${
              trendScopeOptions.find((option) => option.value === trendScope)?.label || 'All recent exams'
            }`,
            style: 'muted',
          },
          { text: `Trend rows shown: ${filteredTrendSeries.length}`, style: 'muted' },
          trendDeltaLabel
            ? { text: `Trend delta: ${trendDeltaLabel}`, style: 'muted', margin: [0, 0, 0, 10] }
            : { text: '', margin: [0, 0, 0, 10] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: bodyRows,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
          subheader: { fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
          muted: { fontSize: 10, color: '#4b5563', margin: [0, 0, 0, 2] },
        },
      } as Record<string, unknown>;

      const pdfBlob = await createPdfBlob(docDefinition);
      downloadFile(pdfBlob, `edamaa-exam-trends-${dateStamp}.pdf`);
      setNotice('Exam trend PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Trend PDF export failed.');
    } finally {
      setTrendExportAction(null);
    }
  };

  const handleExportPerformanceReportPdf = async () => {
    if (!activeExam || reportExportAction) {
      return;
    }

    setReportExportAction('pdf');
    setNotice(null);

    try {
      const dateStamp = new Date().toISOString().slice(0, 10);

      const summaryRows = [
        ['Metric', 'Value'],
        ['Questions', String(activeExam.questions.length)],
        ['Total marks', String(activeExamTotalPoints)],
        ['Submissions', String(submissions.length)],
        ['Pending review', String(pendingSubmissionCount)],
        ['Graded submissions', String(gradedSubmissionCount)],
        ['Published results', String(publishedSubmissionCount)],
        ['Average score', averageScoreLabel || 'Not available'],
      ];

      const gradeRows = [
        ['Grade band', 'Students'],
        ...(gradeDistribution.length > 0
          ? gradeDistribution.map((entry) => [entry.label, String(entry.count)])
          : [['No graded submissions yet', '0']]),
      ];

      const topPerformerRows = [
        ['Student', 'Score', 'Grade', 'Status'],
        ...(topPerformers.length > 0
          ? topPerformers.map((submission) => [
              submission.studentName,
              `${submission.score || 0}/${submission.maxScore}`,
              resolveGradeLabelWithScheme(
                activeExamLevel,
                activeExamScheme[activeExamLevel],
                submission.score || 0,
                submission.maxScore
              ),
              submission.status,
            ])
          : [['No scored submissions yet', '-', '-', '-']]),
      ];

      const supportRows = [
        ['Student', 'Score', 'Grade', 'Status'],
        ...(supportPerformers.length > 0
          ? supportPerformers.map((submission) => [
              submission.studentName,
              `${submission.score || 0}/${submission.maxScore}`,
              resolveGradeLabelWithScheme(
                activeExamLevel,
                activeExamScheme[activeExamLevel],
                submission.score || 0,
                submission.maxScore
              ),
              submission.status,
            ])
          : [['No scored submissions yet', '-', '-', '-']]),
      ];

      const analyticsRows = [
        ['Question', 'Type', 'Response', 'Accuracy / Reviewed', 'Avg marks', 'Flag'],
        ...(filteredQuestionAnalytics.length > 0
          ? filteredQuestionAnalytics.map((question, index) => [
              `Q${index + 1}: ${
                question.prompt.length > 58 ? `${question.prompt.slice(0, 58)}…` : question.prompt
              }`,
              question.type === 'mcq' ? 'MCQ' : 'Written',
              `${Math.round(question.responseRate * 100)}%`,
              question.accuracyRate !== null
                ? `${Math.round(question.accuracyRate * 100)}%`
                : `${question.reviewedCount}/${submissions.length}`,
              question.averageAwardedPoints !== null
                ? `${question.averageAwardedPoints.toFixed(1)}/${question.maxPoints}`
                : 'Pending',
              question.needsAttention ? 'Needs attention' : 'Stable',
            ])
          : [['No analytics available', '-', '-', '-', '-', '-']]),
      ];

      const trendRows = [
        ['Exam', 'Date', 'Status', 'Submissions', 'Scored', 'Avg score'],
        ...(filteredTrendSeries.length > 0
          ? filteredTrendSeries.map((point, index) => [
              `${index + 1}. ${point.title}`,
              formatExamDateTime(point.startAt, 'compact'),
              point.isCurrent ? `${point.status} (current)` : point.status,
              String(point.submissionsCount),
              String(point.scoredCount),
              point.averagePercentage !== null ? `${Math.round(point.averagePercentage)}%` : 'Pending',
            ])
          : [['No comparison history yet', '-', '-', '-', '-', '-']]),
      ];

      const reportFrame = buildSchoolReportFrame({
        title: 'Exam Performance Report',
        subtitle: `${activeExam.title} • ${activeExam.subject}`,
        documentLabel: 'Academic performance report',
        documentCode: `EXAM-${activeExam.id.slice(-8).toUpperCase()}`,
        metaLines: [
          `Coverage: ${activeExam.department} • ${activeExam.classGroup}`,
          `Schedule: ${formatExamDateTime(activeExam.startAt, 'full')} • ${activeExam.durationMinutes} mins`,
          `Grading style: ${activeExamScheme[activeExamLevel]}`,
        ],
      });

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [28, 28, 28, 32],
        footer: reportFrame.footer,
        content: [
          ...reportFrame.headerContent,

          { text: 'Exam overview', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: summaryRows,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 12],
          },

          { text: 'Grade distribution', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto'],
              body: gradeRows,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 12],
          },

          { text: 'Top performers', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: topPerformerRows,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 12],
          },

          { text: 'Students needing support', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: supportRows,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 12],
          },

          {
            text: `Question analytics (${analyticsScopeOptions.find((option) => option.value === analyticsScope)?.label || 'All questions'})`,
            style: 'sectionHeader',
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: analyticsRows,
            },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 12],
          },

          {
            text: `Trend comparison (${trendScopeOptions.find((option) => option.value === trendScope)?.label || 'All recent exams'})`,
            style: 'sectionHeader',
          },
          trendDeltaLabel ? { text: `Trend delta: ${trendDeltaLabel}`, style: 'muted' } : { text: '', margin: [0, 0, 0, 0] },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: trendRows,
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
      downloadFile(pdfBlob, `edamaa-exam-performance-report-${dateStamp}.pdf`);
      setNotice('Performance report PDF export started.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Performance report export failed.');
    } finally {
      setReportExportAction(null);
    }
  };

  const handleGradeSubmission = async () => {
    if (!gradingTarget || !activeExam) {
      return;
    }
    setNotice(null);
    try {
      const hasIncompleteReview = activeExam.questions.some((question) => {
        const rawValue = questionReviewDrafts[question.id || '']?.awardedPoints ?? '';
        return rawValue.trim() === '' || !Number.isFinite(Number(rawValue));
      });

      if (hasIncompleteReview) {
        setNotice('Enter marks for every question before saving this grade.');
        return;
      }

      const questionReviews = activeExam.questions.map((question) => {
        const reviewDraft = questionReviewDrafts[question.id || ''];
        return {
          questionId: question.id || '',
          awardedPoints: Math.max(
            0,
            Math.min(Number(reviewDraft?.awardedPoints || 0), question.maxPoints || 0)
          ),
          feedback: reviewDraft?.feedback?.trim() || null,
        };
      });

      await gradeExamSubmission({
        examId: activeExam.id,
        submissionId: gradingTarget.id,
        score: Number(gradeScore),
        feedback: gradeFeedback,
        questionReviews,
      });
      setNotice('Submission graded.');
      closeSubmissionReview();
      await loadSubmissions(activeExam.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not grade submission.');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.10),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_22%),#f8fafc] pb-24">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/school-dashboard')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <FaArrowLeft size={12} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Exam & Result Management</h1>
              <p className="text-xs text-slate-500">
                Create exams, review submissions, and publish results.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(61,8,186,0.28)] hover:bg-[#2c0691]"
          >
            <FaPlus size={10} />
            New exam
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {notice && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
            {notice}
          </div>
        )}

        <section className="mb-6 overflow-hidden rounded-[32px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.16),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(249,245,255,0.96)_55%,_rgba(239,246,255,0.94)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_440px]">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                School Assessments
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Keep exams clean, trackable, and easy to manage
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Build assessments per class, review each learner’s submission, and publish only when the results are ready.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {publishedExamsCount} published
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {draftExamsCount} drafts
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {upcomingExamsCount} upcoming
                </span>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span className="font-semibold text-slate-900">Next scheduled exam:</span>{' '}
                {nextExam ? `${nextExam.title} on ${formatExamDateTime(nextExam.startAt, 'full')}` : 'No upcoming exam scheduled yet.'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <FaFileAlt size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Total Exams
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{exams.length}</p>
                <p className="mt-1 text-xs text-slate-500">All assessments created by this school.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FaCheckCircle size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Published
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{publishedExamsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Visible results already released to students.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600">
                  <FaLayerGroup size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Draft Queue
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{draftExamsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Still waiting for review or result publishing.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sky-600">
                  <FaClock size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Upcoming
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{upcomingExamsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Scheduled assessments that have not started yet.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Release updates</h3>
              <p className="mt-1 text-xs text-slate-500">
                Result publication notices stay here so the school can confirm what has gone out.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {examNotifications.length} recent
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                {unreadNotificationCount} unread
              </span>
              <button
                onClick={handleMarkAllNotificationsAsRead}
                disabled={unreadNotificationCount === 0 || notificationBusyId === 'all'}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark all read
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {([
              { value: 'all', label: 'All updates' },
              { value: 'unread', label: 'Unread only' },
            ] as { value: NotificationFilter; label: string }[]).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setNotificationFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  notificationFilter === filter.value
                    ? 'bg-[#3D08BA] text-white shadow-[0_10px_22px_rgba(61,8,186,0.25)]'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {isNotificationsLoading ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading exam updates...
            </div>
          ) : examNotifications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No release updates yet. Once you publish exam results, they will show here.
            </div>
          ) : filteredExamNotifications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No release updates match this filter.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {filteredExamNotifications.slice(0, 6).map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[24px] border p-4 ${
                    notification.isRead
                      ? 'border-slate-200 bg-[linear-gradient(180deg,_rgba(61,8,186,0.03),_rgba(255,255,255,0.98))]'
                      : 'border-amber-200 bg-[linear-gradient(180deg,_rgba(251,191,36,0.10),_rgba(255,255,255,0.98))]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                        )}
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{notification.message}</p>
                    </div>
                    <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <FaCheckCircle size={12} />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                    <span>{formatExamDateTime(notification.createdAt)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => openExamFromNotification(notification.examId)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Open exam
                    </button>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkNotificationAsRead(notification.id)}
                        disabled={notificationBusyId === notification.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      onClick={() => handleArchiveNotification(notification.id)}
                      disabled={notificationBusyId === notification.id}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section id="exam-management-panel" className="space-y-4">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Assessment library</h3>
                  <p className="text-xs text-slate-500">
                    {filteredExams.length} of {exams.length} exams showing
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {examStatusFilter === 'all' ? 'All statuses' : examStatusFilter}
                </span>
              </div>

              <div className="relative mb-3">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input
                  value={examSearch}
                  onChange={(event) => setExamSearch(event.target.value)}
                  placeholder="Search by title, subject, class, or department"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                />
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {([
                  { value: 'all', label: 'All' },
                  { value: 'draft', label: 'Drafts' },
                  { value: 'published', label: 'Published' },
                ] as { value: ExamStatusFilter; label: string }[]).map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setExamStatusFilter(filter.value)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      examStatusFilter === filter.value
                        ? 'bg-[#3D08BA] text-white shadow-[0_10px_22px_rgba(61,8,186,0.25)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {isLoading && (
                <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Loading exams...
                </p>
              )}

              {!isLoading && exams.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No exams yet</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Start with one clean assessment, then use this page to track reviews and publishing.
                  </p>
                </div>
              )}

              {!isLoading && exams.length > 0 && filteredExams.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No match for this filter</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Try a different keyword or switch back to all exams.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {filteredExams.map((exam) => {
                  const isActive = activeExamId === exam.id;
                  const status = getExamStatus(exam);

                  return (
                    <button
                      key={exam.id}
                      onClick={() => {
                        setActiveExamId(exam.id);
                        void loadSubmissions(exam.id);
                      }}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        isActive
                          ? 'border-[#3D08BA]/25 bg-[linear-gradient(135deg,_rgba(61,8,186,0.10),_rgba(255,255,255,0.96))] shadow-[0_16px_40px_rgba(61,8,186,0.14)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                            status === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {status}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatExamDateTime(exam.createdAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#3D08BA]/10 text-[#3D08BA]">
                          <FaFileAlt size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{exam.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {exam.subject} • {exam.department} • {exam.classGroup}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          {exam.questions.length} questions
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          {exam.durationMinutes} mins
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          {formatExamDateTime(exam.startAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {activeExam ? (
              <>
                <div className="rounded-[28px] border border-[#3D08BA]/12 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.16),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(247,243,255,0.96)_58%,_rgba(240,249,255,0.92)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                            getExamStatus(activeExam) === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {getExamStatus(activeExam)}
                        </span>
                        <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          {activeExam.subject}
                        </span>
                      </div>

                      <h3 className="mt-3 text-2xl font-bold text-slate-900">{activeExam.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        For {activeExam.department} • {activeExam.classGroup}. Scheduled for{' '}
                        {formatExamDateTime(activeExam.startAt, 'full')}.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => void handleExportPerformanceReportPdf()}
                        disabled={reportExportAction !== null}
                        className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/20 bg-white px-4 py-2 text-xs font-semibold text-[#3D08BA] shadow-[0_10px_24px_rgba(61,8,186,0.10)] transition hover:bg-[#3D08BA]/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaFileAlt className="text-[11px]" />
                        {reportExportAction === 'pdf' ? 'Preparing report...' : 'Performance report'}
                      </button>
                      <button
                        onClick={() => handlePublish(activeExam.id)}
                        disabled={gradedSubmissionCount === 0}
                        className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {activeExam.publishedAt
                          ? gradedSubmissionCount > 0
                            ? `Release ${gradedSubmissionCount} more`
                            : 'No new results'
                          : gradedSubmissionCount > 0
                            ? `Publish ${gradedSubmissionCount} ready`
                            : 'Nothing to publish'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 font-semibold">
                      Ready to release: {gradedSubmissionCount}
                    </span>
                    <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 font-semibold">
                      Awaiting review: {pendingSubmissionCount}
                    </span>
                    <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1 font-semibold">
                      Already published: {publishedSubmissionCount}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[22px] border border-white/80 bg-white/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Questions
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{activeExam.questions.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Total marks
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{activeExamTotalPoints}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Submissions
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{submissions.length}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/80 bg-white/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Ready to release
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{gradedSubmissionCount}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {publishedSubmissionCount} already visible to students.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Question analytics</h3>
                      <p className="text-xs text-slate-500">
                        Spot weak questions, low response areas, and average performance per item.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 text-[11px]">
                      <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600">
                        <span className="text-slate-400">View</span>
                        <select
                          value={analyticsScope}
                          onChange={(event) => setAnalyticsScope(event.target.value as AnalyticsScope)}
                          className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
                        >
                          {analyticsScopeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {submissions.length > 0 && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                          {filteredQuestionAnalytics.length} shown
                        </span>
                      )}
                      {filteredQuestionAnalytics.length > 0 && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                          {filteredLowPerformingQuestionCount} need attention
                        </span>
                      )}
                      {filteredQuestionAnalytics.length > 0 && filteredWeakestQuestion && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                          Weakest: {filteredWeakestQuestion.prompt.slice(0, 36)}
                          {filteredWeakestQuestion.prompt.length > 36 ? '…' : ''}
                        </span>
                      )}
                      <button
                        onClick={handleExportAnalyticsCsv}
                        disabled={filteredQuestionAnalytics.length === 0 || analyticsExportAction !== null}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        {analyticsExportAction === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                      </button>
                      <button
                        onClick={() => void handleExportAnalyticsPdf()}
                        disabled={filteredQuestionAnalytics.length === 0 || analyticsExportAction !== null}
                        className="rounded-full bg-[#3D08BA] px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(61,8,186,0.18)] transition hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {analyticsExportAction === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
                      </button>
                    </div>
                  </div>

                  {submissions.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-800">No analytics yet</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Question insights will appear here once students begin submitting this exam.
                      </p>
                    </div>
                  ) : filteredQuestionAnalytics.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-800">No questions match this view</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Change the analytics view to see all questions or switch to another filter.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {filteredQuestionAnalytics.map((question, index) => (
                        <div
                          key={question.questionId || `analytics-${index}`}
                          className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[#3D08BA]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#3D08BA]">
                                  Question {index + 1}
                                </span>
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                  {question.type === 'mcq' ? 'Multiple choice' : 'Written response'}
                                </span>
                                {question.needsAttention && (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                    Needs attention
                                  </span>
                                )}
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                                {question.prompt}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {question.maxPoints} marks
                            </span>
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                              <span>Response rate</span>
                              <span>{Math.round(question.responseRate * 100)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  question.responseRate >= 0.7
                                    ? 'bg-emerald-500'
                                    : question.responseRate >= 0.5
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.round(question.responseRate * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 px-3 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Answered
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {question.answeredCount}/{submissions.length}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                {question.accuracyRate !== null ? 'Accuracy' : 'Reviewed'}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {question.accuracyRate !== null
                                  ? `${Math.round(question.accuracyRate * 100)}%`
                                  : `${question.reviewedCount}/${submissions.length}`}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-3 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Avg marks
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {question.averageAwardedPoints !== null
                                  ? `${question.averageAwardedPoints.toFixed(1)}/${question.maxPoints}`
                                  : 'Pending'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Trend comparison</h3>
                      <p className="text-xs text-slate-500">
                        Compare this subject and class against the recent assessment history.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600">
                        <span className="text-slate-400">View</span>
                        <select
                          value={trendScope}
                          onChange={(event) => setTrendScope(event.target.value as TrendScope)}
                          className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none"
                        >
                          {trendScopeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                        {filteredTrendSeries.length} shown
                      </span>
                      {trendDeltaLabel && (
                        <span
                          className={`rounded-full px-3 py-1 font-semibold ${
                            trendDeltaLabel.startsWith('+')
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {trendDeltaLabel}
                        </span>
                      )}
                      {isTrendLoading && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-700">
                          Updating trend...
                        </span>
                      )}
                      <button
                        onClick={handleExportTrendsCsv}
                        disabled={filteredTrendSeries.length === 0 || trendExportAction !== null}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        {trendExportAction === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                      </button>
                      <button
                        onClick={() => void handleExportTrendsPdf()}
                        disabled={filteredTrendSeries.length === 0 || trendExportAction !== null}
                        className="rounded-full bg-[#3D08BA] px-3 py-1.5 font-semibold text-white shadow-[0_10px_24px_rgba(61,8,186,0.18)] transition hover:bg-[#2c0691] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {trendExportAction === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
                      </button>
                    </div>
                  </div>

                  {trendSeries.length <= 1 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-800">No comparison history yet</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Create more exams for this subject and class to unlock trend comparison.
                      </p>
                    </div>
                  ) : filteredTrendSeries.length <= 1 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-800">No past exams match this view</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Change the trend view to compare this exam against more recent history.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTrendSeries.map((point, index) => (
                        <div
                          key={point.examId}
                          className={`rounded-[24px] border p-4 transition ${
                            point.isCurrent
                              ? 'border-[#3D08BA]/20 bg-[linear-gradient(135deg,_rgba(61,8,186,0.08),_rgba(255,255,255,0.98))]'
                              : 'border-slate-200 bg-slate-50/70'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                  Exam {index + 1}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                    point.status === 'published'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {point.status}
                                </span>
                                {point.isCurrent && (
                                  <span className="rounded-full bg-[#3D08BA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="mt-3 text-sm font-semibold text-slate-900">{point.title}</p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {formatExamDateTime(point.startAt, 'full')}
                              </p>
                            </div>
                            <div className="grid gap-2 text-right sm:grid-cols-3 sm:text-left">
                              <div className="rounded-2xl bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Submissions
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{point.submissionsCount}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Scored
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{point.scoredCount}</p>
                              </div>
                              <div className="rounded-2xl bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Avg score
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {point.averagePercentage !== null ? `${Math.round(point.averagePercentage)}%` : 'Pending'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                              <span>Average score trend</span>
                              <span>
                                {point.averagePercentage !== null ? `${Math.round(point.averagePercentage)}%` : 'Pending'}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  point.averagePercentage !== null
                                    ? point.averagePercentage >= 70
                                      ? 'bg-emerald-500'
                                      : point.averagePercentage >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{
                                  width:
                                    point.averagePercentage !== null
                                      ? `${Math.max(6, Math.round(point.averagePercentage))}%`
                                      : '12%',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Student submissions</h3>
                        <p className="text-xs text-slate-500">
                          Review each learner before releasing results.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                          {pendingSubmissionCount} pending
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                          {gradedSubmissionCount} graded
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                          {publishedSubmissionCount} published
                        </span>
                        {averageScoreLabel && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                            {averageScoreLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {isSubmissionsLoading && (
                        <p className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                          Loading submissions...
                        </p>
                      )}
                      {!isSubmissionsLoading && submissions.length === 0 && (
                        <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                          <p className="text-sm font-semibold text-slate-800">No submissions yet</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Students will appear here as soon as they complete this assessment.
                          </p>
                        </div>
                      )}
                      {!isSubmissionsLoading &&
                        submissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-white"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#3D08BA]/10 text-sm font-bold text-[#3D08BA]">
                                  {submission.studentName.slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {submission.studentName}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Submitted {formatExamDateTime(submission.submittedAt)}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {submission.answers.length} answers submitted
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                    submission.status === 'published'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : submission.status === 'graded'
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {submission.status}
                                </span>
                                <button
                                  onClick={() => openSubmissionReview(submission)}
                                  className="rounded-full border border-[#3D08BA]/20 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                                >
                                  Review
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-2xl border border-white bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Score
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {submission.score !== undefined
                                    ? `${submission.score}/${submission.maxScore}`
                                    : 'Awaiting grading'}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-white bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Grade
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {submission.score !== undefined
                                    ? resolveGradeLabelWithScheme(
                                        activeExamLevel,
                                        activeExamScheme[activeExamLevel],
                                        submission.score,
                                        submission.maxScore
                                      )
                                    : 'Not graded'}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-white bg-white px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                  Feedback
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                                  {submission.feedback?.trim() || 'No teacher note yet'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <h3 className="text-sm font-semibold text-slate-900">Exam snapshot</h3>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Schedule
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatExamDateTime(activeExam.startAt, 'full')}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Coverage
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {activeExam.department} • {activeExam.classGroup}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Grading style
                          </p>
                          <p className="mt-1 font-semibold capitalize text-slate-900">
                            {activeExamScheme[activeExamLevel]}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Exam setup
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {activeExam.questions.length} questions • {activeExam.durationMinutes} mins • {activeExamTotalPoints} marks
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-sm font-semibold text-slate-900">School grading scheme</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose how each level should display grades across the school.
                      </p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Primary</label>
                          <select
                            value={gradingScheme.primary}
                            onChange={(event) =>
                              setGradingScheme((prev) => ({ ...prev, primary: event.target.value }))
                            }
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#3D08BA]/35 focus:bg-white"
                          >
                            {gradingSchemeOptions.primary.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Secondary</label>
                          <select
                            value={gradingScheme.secondary}
                            onChange={(event) =>
                              setGradingScheme((prev) => ({ ...prev, secondary: event.target.value }))
                            }
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#3D08BA]/35 focus:bg-white"
                          >
                            {gradingSchemeOptions.secondary.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Tertiary</label>
                          <select
                            value={gradingScheme.tertiary}
                            onChange={(event) =>
                              setGradingScheme((prev) => ({ ...prev, tertiary: event.target.value }))
                            }
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#3D08BA]/35 focus:bg-white"
                          >
                            {gradingSchemeOptions.tertiary.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setNotice(null);
                            try {
                              await updateSchoolGradingScheme(gradingScheme);
                              setNotice('Grading scheme saved.');
                            } catch (error) {
                              setNotice(
                                error instanceof Error
                                  ? error.message
                                  : 'Could not save grading scheme.'
                              );
                            }
                          }}
                          className="inline-flex w-full items-center justify-center rounded-full bg-[#3D08BA] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)] hover:bg-[#2c0691]"
                        >
                          Save grading scheme
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 text-sm text-slate-600 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <p className="font-semibold text-slate-900">Review flow</p>
                      <p className="mt-2 leading-6">
                        Keep results in draft while teachers grade. Publish only after you verify the final marks and comments.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center shadow-sm">
                <p className="text-base font-semibold text-slate-900">Select an exam to manage it</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Choose an assessment from the left to review submissions, publish results, and inspect the setup.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[#f7f5ff] shadow-[0_35px_120px_rgba(15,23,42,0.28)]">
              <div className="border-b border-[#3D08BA]/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.18),_transparent_52%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,245,255,0.96))] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                      Exam Composer
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Create a cleaner exam flow</h2>
                      <p className="mt-1 max-w-2xl text-sm text-slate-600">
                        Keep the setup short, build questions one by one, then review everything from the side panel.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    '1. Add exam details',
                    '2. Build questions',
                    '3. Review and create',
                  ].map((step, index) => (
                    <span
                      key={step}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        index === 1
                          ? 'bg-[#3D08BA] text-white'
                          : 'border border-[#3D08BA]/10 bg-white/80 text-slate-600'
                      }`}
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="space-y-5">
                    <section className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Exam details</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Set the class, department, timing, and subject before writing questions.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Target level
                          </p>
                          <p className="mt-1 text-sm font-semibold capitalize text-slate-700">{draftLevel}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="sm:col-span-2 xl:col-span-1">
                          <label className="text-xs font-semibold text-slate-600">Exam title</label>
                          <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="e.g. Second Term Mathematics Test"
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Subject</label>
                          <input
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            placeholder="Mathematics"
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Department</label>
                          <input
                            value={department}
                            onChange={(event) => setDepartment(event.target.value)}
                            placeholder="Science"
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Class</label>
                          <input
                            value={classGroup}
                            onChange={(event) => setClassGroup(event.target.value)}
                            placeholder="SS2"
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Start time</label>
                          <input
                            type="datetime-local"
                            value={startAt}
                            onChange={(event) => setStartAt(event.target.value)}
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600">Duration (mins)</label>
                          <input
                            type="number"
                            min={1}
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(Number(event.target.value))}
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Question builder</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Edit one question at a time so the screen stays clean even when the exam grows.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => addQuestion('mcq')}
                            className="inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-2 text-[11px] font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10"
                          >
                            <FaPlus size={10} />
                            Add MCQ
                          </button>
                          <button
                            type="button"
                            onClick={() => addQuestion('short')}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FaPlus size={10} className="text-[#3D08BA]" />
                            Add short answer
                          </button>
                          <div className="rounded-2xl border border-[#3D08BA]/10 bg-[#3D08BA]/5 px-3 py-2 text-right">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]/70">
                              Total questions
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{questions.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                        {questions.map((question, index) => {
                          const isActive = question.tempId === activeDraftQuestion?.tempId;
                          return (
                            <button
                              key={question.tempId}
                              onClick={() => setActiveQuestionTempId(question.tempId)}
                              className={`min-w-[150px] rounded-2xl border px-3 py-2 text-left transition ${
                                isActive
                                  ? 'border-[#3D08BA]/30 bg-[#3D08BA] text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)]'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold">Question {index + 1}</span>
                                {isActive ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                              </div>
                              <p className={`mt-1 text-[11px] ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                {question.type === 'mcq' ? 'Multiple choice' : 'Short answer'} • {question.maxPoints} pts
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      <p className="mb-4 text-[11px] text-slate-500">
                        Use <span className="font-semibold text-slate-700">Add MCQ</span> or{' '}
                        <span className="font-semibold text-slate-700">Add short answer</span> to create Question 2, 3, 4 and more. Select any question chip above to edit it.
                      </p>

                      {activeDraftQuestion && (
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Question {activeDraftQuestionIndex + 1}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {activeDraftQuestion.type === 'mcq'
                                  ? 'Students will select one of the available options.'
                                  : 'Students will type a written answer.'}
                              </p>
                            </div>
                            <button
                              onClick={() => removeQuestion(activeDraftQuestion.tempId)}
                              disabled={questions.length === 1}
                              className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
                            >
                              Remove question
                            </button>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_112px]">
                            <div>
                              <label className="text-xs font-semibold text-slate-600">Question prompt</label>
                              <textarea
                                value={activeDraftQuestion.prompt}
                                onChange={(event) =>
                                  setQuestions((prev) =>
                                    prev.map((question) =>
                                      question.tempId === activeDraftQuestion.tempId
                                        ? { ...question, prompt: event.target.value }
                                        : question
                                    )
                                  )
                                }
                                rows={4}
                                placeholder="Type the full question students should answer."
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600">Points</label>
                              <input
                                type="number"
                                min={1}
                                value={activeDraftQuestion.maxPoints}
                                onChange={(event) =>
                                  setQuestions((prev) =>
                                    prev.map((question) =>
                                      question.tempId === activeDraftQuestion.tempId
                                        ? { ...question, maxPoints: Number(event.target.value) }
                                        : question
                                    )
                                  )
                                }
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                              />
                            </div>
                          </div>

                          {activeDraftQuestion.type === 'mcq' && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold text-slate-700">Answer options</p>
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    Keep the options short and clear.
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    setQuestions((prev) =>
                                      prev.map((question) =>
                                        question.tempId === activeDraftQuestion.tempId
                                          ? {
                                              ...question,
                                              options: [...(question.options || []), buildDraftOption('')],
                                            }
                                          : question
                                      )
                                    )
                                  }
                                  className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1.5 text-[11px] font-semibold text-[#3D08BA] hover:bg-[#3D08BA]/10"
                                >
                                  Add option
                                </button>
                              </div>

                              <div className="mt-3 space-y-2">
                                {(activeDraftQuestion.options || []).map((option, optionIndex) => (
                                  <div
                                    key={`${activeDraftQuestion.tempId}-${optionIndex}`}
                                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setQuestions((prev) =>
                                            prev.map((question) =>
                                              question.tempId === activeDraftQuestion.tempId
                                                ? { ...question, correctOptionId: option.id || null }
                                                : question
                                            )
                                          )
                                        }
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
                                          activeDraftQuestion.correctOptionId === option.id
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span
                                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                                            activeDraftQuestion.correctOptionId === option.id
                                              ? 'border-emerald-500 bg-emerald-500 text-white'
                                              : 'border-slate-300 bg-white text-slate-400'
                                          }`}
                                        >
                                          {activeDraftQuestion.correctOptionId === option.id ? '✓' : ''}
                                        </span>
                                        Correct answer
                                      </button>

                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-500 shadow-sm">
                                          {String.fromCharCode(65 + optionIndex)}
                                        </span>
                                        <input
                                          value={option.text}
                                          onChange={(event) =>
                                            setQuestions((prev) =>
                                              prev.map((question) => {
                                                if (question.tempId !== activeDraftQuestion.tempId) {
                                                  return question;
                                                }
                                                const nextOptions = [...(question.options || [])];
                                                nextOptions[optionIndex] = {
                                                  ...nextOptions[optionIndex],
                                                  text: event.target.value,
                                                };
                                                return { ...question, options: nextOptions };
                                              })
                                            )
                                          }
                                          placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                                        />
                                      </div>

                                      <button
                                        onClick={() =>
                                          setQuestions((prev) =>
                                            prev.map((question) => {
                                              if (
                                                question.tempId !== activeDraftQuestion.tempId ||
                                                (question.options || []).length <= 2
                                              ) {
                                                return question;
                                              }

                                              const nextOptions = (question.options || []).filter(
                                                (_, index) => index !== optionIndex
                                              );
                                              const removedOptionId = option.id || null;

                                              return {
                                                ...question,
                                                options: nextOptions,
                                                correctOptionId:
                                                  question.correctOptionId === removedOptionId
                                                    ? nextOptions[0]?.id || null
                                                    : question.correctOptionId,
                                              };
                                            })
                                          )
                                        }
                                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <p className="mt-3 text-[11px] text-slate-500">
                                Select one correct option so MCQ answers can be auto-marked during review.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                </div>

                <aside className="min-h-0 overflow-y-auto border-t border-white/80 bg-white/70 px-5 py-5 lg:border-l lg:border-t-0">
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-[#3D08BA]/10 bg-[linear-gradient(180deg,_rgba(61,8,186,0.08),_rgba(255,255,255,0.95))] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]/70">
                        Live summary
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-slate-900">
                        {title.trim() || 'Untitled exam'}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {subject.trim() || 'Subject'} • {department.trim() || 'Department'} • {classGroup.trim() || 'Class'}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/80 bg-white/85 p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <FaLayerGroup size={11} />
                            <span className="text-[11px] font-semibold">Questions</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{questions.length}</p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/85 p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <FaClock size={11} />
                            <span className="text-[11px] font-semibold">Duration</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{durationMinutes || 0} mins</p>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/80 bg-white/85 p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <FaFileAlt size={11} />
                            <span className="text-[11px] font-semibold">Total marks</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold text-slate-900">{totalDraftPoints}</p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/85 p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <FaUsers size={11} />
                            <span className="text-[11px] font-semibold">Level</span>
                          </div>
                          <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{draftLevel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Schedule preview</p>
                      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#3D08BA] shadow-sm">
                          <FaCalendarAlt size={12} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700">{formatSchedulePreview(startAt)}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Results will follow the {draftLevel} grading style: {gradingScheme[draftLevel]}.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Question bank</p>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">
                            Save a strong question set once, then pull it into the next exam in one click.
                          </p>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]">
                          <FaBookOpen size={14} />
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Bank name
                          </label>
                          <input
                            value={questionBankName}
                            onChange={(event) => setQuestionBankName(event.target.value)}
                            placeholder="Optional name for this question set"
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>

                        <button
                          onClick={handleSaveQuestionBank}
                          disabled={questionBankAction === 'save'}
                          className="flex w-full items-center justify-between rounded-2xl border border-[#3D08BA]/12 bg-[#3D08BA]/5 px-3 py-3 text-left text-sm font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-wait disabled:opacity-70"
                        >
                          <span className="inline-flex items-center gap-2">
                            <FaSave size={12} />
                            {questionBankAction === 'save' ? 'Saving question bank...' : 'Save current questions'}
                          </span>
                          <span className="text-[11px] text-[#3D08BA]/70">{questions.length} items</span>
                        </button>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Best matches
                          </p>
                          <span className="text-[11px] text-slate-400">{questionBanks.length} saved</span>
                        </div>

                        {isQuestionBanksLoading ? (
                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                            Loading saved question banks...
                          </div>
                        ) : recommendedQuestionBanks.length === 0 ? (
                          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                            No question bank saved yet. Once you save one here, it will show up for quick reuse.
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {recommendedQuestionBanks.slice(0, 4).map((questionBank) => (
                              <div
                                key={questionBank.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                      {questionBank.name}
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                      {[
                                        questionBank.subject || 'General',
                                        questionBank.department || 'Any department',
                                        questionBank.classGroup || 'Any class',
                                      ].join(' • ')}
                                    </p>
                                  </div>
                                  <div className="flex flex-none items-center gap-2">
                                    <button
                                      onClick={() => handleImportQuestionBank(questionBank)}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                                    >
                                      <FaDownload size={10} />
                                      Use
                                    </button>
                                    <button
                                      onClick={() =>
                                        editingQuestionBankId === questionBank.id
                                          ? setEditingQuestionBankId(null)
                                          : openQuestionBankEditor(questionBank)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-[#3D08BA]/20 hover:text-[#3D08BA]"
                                    >
                                      <FaEdit size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuestionBank(questionBank)}
                                      disabled={questionBankBusyId === questionBank.id}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                                    >
                                      <FaTrash size={11} />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                  <span>{questionBank.questionCount} questions</span>
                                  <span>Updated {formatExamDateTime(questionBank.updatedAt, 'full')}</span>
                                </div>

                                {editingQuestionBankId === questionBank.id && (
                                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                                    <div className="grid gap-2">
                                      <input
                                        value={questionBankEditor.name}
                                        onChange={(event) =>
                                          setQuestionBankEditor((current) => ({
                                            ...current,
                                            name: event.target.value,
                                          }))
                                        }
                                        placeholder="Question bank name"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                      />
                                      <div className="grid gap-2 sm:grid-cols-3">
                                        <input
                                          value={questionBankEditor.subject}
                                          onChange={(event) =>
                                            setQuestionBankEditor((current) => ({
                                              ...current,
                                              subject: event.target.value,
                                            }))
                                          }
                                          placeholder="Subject"
                                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                        />
                                        <input
                                          value={questionBankEditor.department}
                                          onChange={(event) =>
                                            setQuestionBankEditor((current) => ({
                                              ...current,
                                              department: event.target.value,
                                            }))
                                          }
                                          placeholder="Department"
                                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                        />
                                        <input
                                          value={questionBankEditor.classGroup}
                                          onChange={(event) =>
                                            setQuestionBankEditor((current) => ({
                                              ...current,
                                              classGroup: event.target.value,
                                            }))
                                          }
                                          placeholder="Class"
                                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleUpdateQuestionBankDetails(questionBank.id)}
                                        disabled={questionBankBusyId === questionBank.id}
                                        className="rounded-full bg-[#3D08BA] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#2c0691] disabled:cursor-wait disabled:opacity-70"
                                      >
                                        Save details
                                      </button>
                                      <button
                                        onClick={() => handleSyncQuestionBankWithDraft(questionBank)}
                                        disabled={questionBankBusyId === questionBank.id}
                                        className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-2 text-[11px] font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10 disabled:cursor-wait disabled:opacity-70"
                                      >
                                        Replace with current draft
                                      </button>
                                      <button
                                        onClick={() => setEditingQuestionBankId(null)}
                                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Quick actions</p>
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={() => addQuestion('mcq')}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Add multiple choice
                          <FaPlus size={11} className="text-[#3D08BA]" />
                        </button>
                        <button
                          onClick={() => addQuestion('short')}
                          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Add short answer
                          <FaPlus size={11} className="text-[#3D08BA]" />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-xs text-slate-600">
                      <p className="font-semibold text-slate-900">Navigation tip</p>
                      <p className="mt-2">
                        Use the question chips to jump between questions instead of scrolling through one long form.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col gap-2 border-t border-[#3D08BA]/10 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  The modal now stays contained on screen. Only the inside content scrolls when needed.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateExam}
                    className="rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.28)] hover:bg-[#2c0691]"
                  >
                    Create exam
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gradingTarget && activeExam && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] shadow-[0_35px_120px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.14),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          gradingTarget.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : gradingTarget.status === 'graded'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {gradingTarget.status}
                      </span>
                      <span className="rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {activeExam.subject}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">
                      Review {gradingTarget.studentName}&apos;s submission
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Submitted {formatExamDateTime(gradingTarget.submittedAt, 'full')} for {activeExam.title}.
                    </p>
                  </div>

                  <button
                    onClick={closeSubmissionReview}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Answers received
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {reviewedAnswerCount}/{activeExam.questions.length}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Review total
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {`${gradeScore || '0'}/${gradingTarget.maxScore}`}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                        Questions scored
                      </p>
                      <p className="mt-2 text-2xl font-bold capitalize text-slate-900">
                        {reviewedQuestionScoreCount}/{activeExam.questions.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeExam.questions.map((question, index) => {
                      const answer = findSubmissionAnswer(gradingTarget, question.id);
                      const selectedOption = resolveSelectedOption(question, answer);
                      const correctOption =
                        question.type === 'mcq'
                          ? (question.options || []).find((option) => option.id === question.correctOptionId) || null
                          : null;
                      const writtenResponse = String(answer?.response || '').trim();
                      const answered = hasSubmissionAnswer(answer);

                      return (
                        <div
                          key={question.id || `question-${index}`}
                          className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Question {index + 1}
                              </p>
                              <p className="mt-2 text-base font-semibold text-slate-900">
                                {question.prompt}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {question.type === 'mcq' ? 'Multiple choice' : 'Short answer'}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {question.maxPoints} pts
                              </span>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                              Student response
                            </p>

                            {question.type === 'mcq' ? (
                              <div className="mt-3 space-y-2">
                                {(question.options || []).map((option, optionIndex) => {
                                  const isSelected = option.id === selectedOption?.id;
                                  const isCorrect = option.id === correctOption?.id;

                                  return (
                                    <div
                                      key={option.id || `${question.id || 'question'}-option-${optionIndex}`}
                                      className={`flex items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                                        isCorrect
                                          ? 'border-emerald-300 bg-emerald-50'
                                          : isSelected
                                            ? 'border-[#3D08BA]/25 bg-[#3D08BA]/8'
                                            : 'border-slate-200 bg-slate-50'
                                      }`}
                                    >
                                      <span
                                        className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : isSelected
                                            ? 'bg-[#3D08BA] text-white'
                                            : 'bg-white text-slate-500'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optionIndex)}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm text-slate-800">{option.text}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                          {isCorrect && (
                                            <span className="text-emerald-700">Answer key</span>
                                          )}
                                          {isSelected && (
                                            <span className="text-[#3D08BA]">Selected by student</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {!answered && (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                    No option selected.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                                  {writtenResponse || 'No written answer submitted.'}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Marks awarded
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={question.maxPoints}
                                step="0.5"
                                value={questionReviewDrafts[question.id || '']?.awardedPoints ?? ''}
                                onChange={(event) =>
                                  setQuestionReviewDrafts((prev) => ({
                                    ...prev,
                                    [question.id || '']: {
                                      awardedPoints: event.target.value,
                                      feedback: prev[question.id || '']?.feedback || '',
                                    },
                                  }))
                                }
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                                placeholder={`0 - ${question.maxPoints}`}
                              />
                              {question.type === 'mcq' && question.correctOptionId && (
                                <p className="mt-2 text-[11px] text-slate-500">
                                  Auto-filled from the answer key. You can still adjust it before saving.
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Question note
                              </label>
                              <textarea
                                rows={3}
                                value={questionReviewDrafts[question.id || '']?.feedback ?? ''}
                                onChange={(event) =>
                                  setQuestionReviewDrafts((prev) => ({
                                    ...prev,
                                    [question.id || '']: {
                                      awardedPoints: prev[question.id || '']?.awardedPoints || '',
                                      feedback: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Add a short note for this question if needed."
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                            <span
                              className={`rounded-full px-3 py-1 font-semibold ${
                                answered
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {answered ? 'Answer received' : 'No answer'}
                            </span>
                            {selectedOption && (
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600">
                                Choice: {selectedOption.text}
                              </span>
                            )}
                            {correctOption && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                                Correct answer: {correctOption.text}
                              </span>
                            )}
                            {questionReviewDrafts[question.id || '']?.awardedPoints?.trim() && (
                              <span className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1 font-semibold text-[#3D08BA]">
                                Marked: {Math.max(
                                  0,
                                  Math.min(
                                    Number(questionReviewDrafts[question.id || '']?.awardedPoints || 0),
                                    question.maxPoints || 0
                                  )
                                )}{' '}
                                / {question.maxPoints}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50/80 px-5 py-5 xl:border-l xl:border-t-0">
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Grade submission</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Score each question below. The final result is calculated automatically.
                      </p>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600">
                            Final {formatScoreLabel(activeExamLevel)}
                          </label>
                          <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-lg font-semibold text-slate-900">
                              {gradeScore || '0'} / {gradingTarget.maxScore}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {reviewedQuestionScoreCount} of {activeExam.questions.length} questions scored
                            </p>
                          </div>
                          {activeExamLevel === 'tertiary' && (
                            <p className="mt-2 text-[11px] text-slate-500">
                              {formatGradePointLabel(activeExamLevel)}:{' '}
                              {computeGradePoint(
                                Number(gradeScore || 0),
                                gradingTarget.maxScore,
                                activeExamScheme.tertiary
                              ).toFixed(2)}{' '}
                              / {activeExamScheme.tertiary === 'cgpa-4' ? '4.00' : '5.00'}
                            </p>
                          )}
                          {gradeScore && (
                            <p className="mt-2 text-[11px] text-slate-500">
                              Grade:{' '}
                              {resolveGradeLabelWithScheme(
                                activeExamLevel,
                                activeExamScheme[activeExamLevel],
                                Number(gradeScore),
                                gradingTarget.maxScore
                              )}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-600">Teacher feedback</label>
                          <textarea
                            value={gradeFeedback}
                            onChange={(event) => setGradeFeedback(event.target.value)}
                            rows={5}
                            placeholder="Add a short review note for this student."
                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Review notes</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Submitted
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {formatExamDateTime(gradingTarget.submittedAt, 'full')}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Progress
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {reviewedQuestionScoreCount} of {activeExam.questions.length} questions scored
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Result visibility
                          </p>
                          <p className="mt-1 font-semibold text-slate-900">
                            Students will not see this until results are published.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Review answers here first, then save the grade when you are satisfied.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeSubmissionReview}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleGradeSubmission}
                    className="rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)] hover:bg-[#2c0691]"
                  >
                    Save grade
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolExams;
