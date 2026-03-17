import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowLeft,
  FaAward,
  FaCalendarAlt,
  FaCheckCircle,
  FaChartLine,
  FaClipboardCheck,
  FaClock,
  FaFileAlt,
  FaLayerGroup,
  FaRegCommentDots,
  FaSearch,
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchStudentExamResult,
  fetchStudentExams,
  saveStudentExamAttempt as saveStudentExamAttemptRequest,
  startStudentExamAttempt,
  submitStudentExam,
  type ExamSubmission,
  type ExamQuestionInput,
  type SchoolExam,
  type StudentExamAttempt,
  type StudentExamSubmissionSummary,
} from '../../schools/utils/examsApi';
import { loadStudentIdentity, saveStudentIdentity } from '../utils/studentIdentity';

type ExamAnswer = {
  questionId: string;
  response: string;
  optionId?: string | null;
};

type StudentExamWindowStatus = 'upcoming' | 'live' | 'ended';

type StudentExamDraft = {
  examId: string;
  studentId: number;
  startedAtMs: number;
  savedAtMs: number;
  activeQuestionIndex: number;
  answers: ExamAnswer[];
};

type StudentExamResultPreview = {
  exam: SchoolExam;
  submission: ExamSubmission;
  level: string;
  gradingScheme: string;
  gradeLabel: string;
  gradePoint: string | null;
  percentage: number;
  answeredCount: number;
  reviewedQuestionCount: number;
};

type RecentResultFilter = 'latest' | 'highest' | 'recent';

const STUDENT_EXAM_DRAFTS_STORAGE_KEY = 'edamaa_student_exam_drafts_v1';

const buildStudentExamDraftKey = (examId: string, studentId: number) => `${studentId}:${examId}`;

const isExamAnswer = (value: unknown): value is ExamAnswer => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.questionId === 'string' &&
    typeof candidate.response === 'string' &&
    (typeof candidate.optionId === 'string' || candidate.optionId === null || candidate.optionId === undefined)
  );
};

const normalizeStudentExamDraft = (value: unknown): StudentExamDraft | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const examId = typeof candidate.examId === 'string' ? candidate.examId : '';
  const studentId = Number(candidate.studentId);
  const startedAtMs = Number(candidate.startedAtMs);
  const savedAtMs = Number(candidate.savedAtMs);
  const activeQuestionIndex = Number(candidate.activeQuestionIndex);
  const answers = Array.isArray(candidate.answers)
    ? candidate.answers.filter(isExamAnswer).map((answer) => ({
        questionId: answer.questionId,
        response: answer.response,
        optionId: answer.optionId ?? null,
      }))
    : [];

  if (!examId || !Number.isFinite(studentId) || !Number.isFinite(startedAtMs) || !Number.isFinite(savedAtMs)) {
    return null;
  }

  return {
    examId,
    studentId,
    startedAtMs,
    savedAtMs,
    activeQuestionIndex: Number.isFinite(activeQuestionIndex) ? activeQuestionIndex : 0,
    answers,
  };
};

const readStudentExamDrafts = (): Record<string, StudentExamDraft> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STUDENT_EXAM_DRAFTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, StudentExamDraft>>(
      (collection, [key, value]) => {
        const normalized = normalizeStudentExamDraft(value);
        if (normalized) {
          collection[key] = normalized;
        }
        return collection;
      },
      {}
    );
  } catch {
    return {};
  }
};

const saveStudentExamDraft = (draft: StudentExamDraft) => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = buildStudentExamDraftKey(draft.examId, draft.studentId);
  const drafts = readStudentExamDrafts();
  drafts[key] = draft;
  window.localStorage.setItem(STUDENT_EXAM_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
};

const clearStudentExamDraft = (examId: string, studentId: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = buildStudentExamDraftKey(examId, studentId);
  const drafts = readStudentExamDrafts();
  if (!(key in drafts)) {
    return;
  }

  delete drafts[key];
  window.localStorage.setItem(STUDENT_EXAM_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
};

const mergeDraftAnswers = (questions: ExamQuestionInput[], draftAnswers: ExamAnswer[]) => {
  const draftAnswerMap = new Map(draftAnswers.map((answer) => [answer.questionId, answer]));

  return questions.map((question) => {
    const draftAnswer = draftAnswerMap.get(question.id || '');
    if (!draftAnswer) {
      return {
        questionId: question.id || '',
        response: '',
        optionId: null,
      };
    }

    return {
      questionId: question.id || '',
      response: draftAnswer.response || '',
      optionId: draftAnswer.optionId ?? null,
    };
  });
};

const formatSavedTime = (timestampMs: number | null) => {
  if (!timestampMs) {
    return null;
  }

  return new Date(timestampMs).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPercentage = (score: number, maxScore: number) => {
  if (maxScore <= 0) {
    return '0%';
  }

  return `${Math.round((score / maxScore) * 100)}%`;
};

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

const formatExamDateTime = (value: string, variant: 'compact' | 'full' = 'compact') => {
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

const formatTimeRemaining = (timeRemainingMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getStudentExamWindowStatus = (exam: SchoolExam): StudentExamWindowStatus => {
  const startAtMs = new Date(exam.startAt).getTime();
  const endAtMs = startAtMs + exam.durationMinutes * 60 * 1000;
  const nowMs = Date.now();

  if (Number.isFinite(startAtMs) && nowMs < startAtMs) {
    return 'upcoming';
  }
  if (Number.isFinite(endAtMs) && nowMs > endAtMs) {
    return 'ended';
  }
  return 'live';
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

const formatGradingSchemeLabel = (level: string, scheme: string) => {
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

const findSubmittedAnswer = (submission: ExamSubmission, questionId?: string) => {
  if (!questionId) {
    return null;
  }

  return submission.answers.find((answer) => answer.questionId === questionId) || null;
};

const findSubmittedQuestionReview = (submission: ExamSubmission, questionId?: string) => {
  if (!questionId) {
    return null;
  }

  return submission.questionReviews?.find((review) => review.questionId === questionId) || null;
};

const computeGradePoint = (score: number, maxScore: number, scheme: string) => {
  if (maxScore <= 0) {
    return 0;
  }
  const scale = scheme === 'cgpa-4' ? 4 : 5;
  return Math.min(scale, Math.max(0, (score / maxScore) * scale));
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

const StudentExams = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const studentIdentity = useMemo(() => loadStudentIdentity(), []);
  const [department, setDepartment] = useState(studentIdentity.department || '');
  const [classGroup, setClassGroup] = useState(studentIdentity.classGroup || '');
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [examAttempts, setExamAttempts] = useState<StudentExamAttempt[]>([]);
  const [examSubmissionStates, setExamSubmissionStates] = useState<StudentExamSubmissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<SchoolExam | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [resultNotice, setResultNotice] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<StudentExamResultPreview | null>(null);
  const [examSearch, setExamSearch] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number | null>(null);
  const [draftSavedAtMs, setDraftSavedAtMs] = useState<number | null>(null);
  const [sessionBanner, setSessionBanner] = useState<string | null>(null);
  const [autoOpenedResultExamId, setAutoOpenedResultExamId] = useState<string | null>(null);
  const [recentResultFilter, setRecentResultFilter] = useState<RecentResultFilter>('latest');

  const resultRequestParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      examId: params.get('examId')?.trim() || '',
      department: params.get('department')?.trim() || '',
      classGroup: params.get('classGroup')?.trim() || '',
      view: params.get('view')?.trim() || '',
    };
  }, [location.search]);

  const filteredExams = useMemo(() => {
    const query = examSearch.trim().toLowerCase();
    if (!query) {
      return exams;
    }

    return exams.filter((exam) =>
      [exam.title, exam.subject, exam.classGroup, exam.department]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [exams, examSearch]);

  const availableExamsCount = useMemo(
    () => exams.filter((exam) => getStudentExamWindowStatus(exam) === 'live').length,
    [exams]
  );
  const upcomingExamsCount = useMemo(
    () => exams.filter((exam) => getStudentExamWindowStatus(exam) === 'upcoming').length,
    [exams]
  );
  const nextExam = useMemo(() => {
    const futureExams = exams
      .filter((exam) => getStudentExamWindowStatus(exam) === 'upcoming')
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());

    return futureExams[0] || null;
  }, [exams]);
  const answeredCount = useMemo(
    () =>
      answers.filter((answer) => Boolean(answer.optionId || String(answer.response || '').trim()))
        .length,
    [answers]
  );
  const activeQuestion = useMemo(
    () => activeExam?.questions[activeQuestionIndex] || null,
    [activeExam, activeQuestionIndex]
  );
  const currentAnswer = useMemo(() => {
    if (!activeQuestion) {
      return null;
    }

    return answers.find((item) => item.questionId === activeQuestion.id) || null;
  }, [answers, activeQuestion]);
  const sessionProgressPercentage = activeExam?.questions.length
    ? Math.round((answeredCount / activeExam.questions.length) * 100)
    : 0;
  const draftTimeLabel = useMemo(() => formatSavedTime(draftSavedAtMs), [draftSavedAtMs]);
  const examAttemptLookup = useMemo(
    () =>
      examAttempts.reduce<Record<string, StudentExamAttempt>>((collection, attempt) => {
        collection[attempt.examId] = attempt;
        return collection;
      }, {}),
    [examAttempts]
  );
  const examSubmissionLookup = useMemo(
    () =>
      examSubmissionStates.reduce<Record<string, StudentExamSubmissionSummary>>((collection, submission) => {
        collection[submission.examId] = submission;
        return collection;
      }, {}),
    [examSubmissionStates]
  );
  const recentPublishedResults = useMemo(() => {
    return exams
      .map((exam) => {
        const submission = examSubmissionLookup[exam.id];
        if (!submission || submission.status !== 'published') {
          return null;
        }

        const publishedAt =
          submission.publishedAt || submission.gradedAt || submission.submittedAt || exam.startAt;
        const percentage =
          typeof submission.score === 'number' && submission.maxScore > 0
            ? Math.round((submission.score / submission.maxScore) * 100)
            : null;

        return {
          exam,
          submission,
          publishedAt,
          percentage,
        };
      })
      .filter(
        (
          item
        ): item is {
          exam: SchoolExam;
          submission: StudentExamSubmissionSummary;
          publishedAt: string;
          percentage: number | null;
        } => Boolean(item)
      )
      .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
      .slice(0, 3);
  }, [examSubmissionLookup, exams]);
  const filteredRecentPublishedResults = useMemo(() => {
    const now = Date.now();
    let collection = [...recentPublishedResults];

    if (recentResultFilter === 'highest') {
      collection.sort((left, right) => {
        const leftScore = left.percentage ?? -1;
        const rightScore = right.percentage ?? -1;
        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
        return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      });
    } else if (recentResultFilter === 'recent') {
      collection = collection.filter((item) => {
        const publishedAtMs = new Date(item.publishedAt).getTime();
        return Number.isFinite(publishedAtMs) && now - publishedAtMs <= 1000 * 60 * 60 * 24 * 30;
      });
    }

    return collection;
  }, [recentPublishedResults, recentResultFilter]);

  const loadExams = async () => {
    if (!department || !classGroup) {
      setNotice('Select department and class to load available exams.');
      return;
    }
    setIsLoading(true);
    setNotice(null);
    try {
      const payload = await fetchStudentExams({ department, classGroup });
      setExams(payload.exams || []);
      setExamAttempts(payload.attempts || []);
      setExamSubmissionStates(payload.submissions || []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load exams.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (resultRequestParams.department && resultRequestParams.department !== department) {
      setDepartment(resultRequestParams.department);
    }
    if (resultRequestParams.classGroup && resultRequestParams.classGroup !== classGroup) {
      setClassGroup(resultRequestParams.classGroup);
    }
  }, [resultRequestParams.department, resultRequestParams.classGroup, department, classGroup]);

  useEffect(() => {
    saveStudentIdentity({
      department,
      classGroup,
    });
  }, [classGroup, department]);

  useEffect(() => {
    if (
      resultRequestParams.view !== 'result' ||
      !resultRequestParams.examId ||
      !department ||
      !classGroup
    ) {
      return;
    }

    if (
      resultRequestParams.department &&
      resultRequestParams.department !== department
    ) {
      return;
    }
    if (
      resultRequestParams.classGroup &&
      resultRequestParams.classGroup !== classGroup
    ) {
      return;
    }

    if (exams.some((exam) => exam.id === resultRequestParams.examId)) {
      return;
    }

    void loadExams();
  }, [
    resultRequestParams,
    department,
    classGroup,
    exams,
  ]);

  const upsertExamAttempt = (attempt: StudentExamAttempt) => {
    setExamAttempts((previous) => {
      const remaining = previous.filter((item) => item.id !== attempt.id);
      return [attempt, ...remaining];
    });
  };

  const persistAttemptBackup = (
    exam: SchoolExam,
    answersValue: ExamAnswer[],
    questionIndex: number,
    savedAtMs = Date.now()
  ) => {
    const startedAtMs = sessionStartedAtMs || Date.now();
    saveStudentExamDraft({
      examId: exam.id,
      studentId: studentIdentity.id,
      startedAtMs,
      savedAtMs,
      activeQuestionIndex: questionIndex,
      answers: answersValue,
    });
    setDraftSavedAtMs(savedAtMs);
  };

  const startExam = async (exam: SchoolExam) => {
    setNotice(null);
    setStartingExamId(exam.id);
    setActiveExam(exam);
    setResultNotice(null);
    setResultPreview(null);
    setSessionBanner('Your progress is saved automatically to your account until you submit.');

    try {
      const payload = await startStudentExamAttempt({
        examId: exam.id,
        studentId: studentIdentity.id,
        studentName: studentIdentity.name || 'Student',
      });
      const attempt = payload.attempt;
      const startedAtMs = new Date(attempt.startedAt).getTime();
      const lastSavedAtMs = new Date(attempt.lastSavedAt).getTime();

      upsertExamAttempt(attempt);
      setActiveAttemptId(attempt.id);
      setAnswers(mergeDraftAnswers(exam.questions, attempt.answers));
      setActiveQuestionIndex(
        Math.min(Math.max(attempt.activeQuestionIndex || 0, 0), Math.max(exam.questions.length - 1, 0))
      );
      setSessionStartedAtMs(Number.isFinite(startedAtMs) ? startedAtMs : Date.now());
      setTimeRemainingMs(Math.max(0, attempt.timeRemainingMs));
      setDraftSavedAtMs(Number.isFinite(lastSavedAtMs) ? lastSavedAtMs : Date.now());
      setSessionBanner(
        attempt.answeredCount > 0
          ? 'Saved progress restored from your account. Continue from where you stopped.'
          : 'Your progress is saved automatically to your account until you submit.'
      );
    } catch (error) {
      setActiveExam(null);
      setActiveAttemptId(null);
      setSessionBanner(null);
      setNotice(error instanceof Error ? error.message : 'Could not open this exam right now.');
    } finally {
      setStartingExamId(null);
    }
  };

  useEffect(() => {
    if (timeRemainingMs === null) {
      return;
    }
    if (timeRemainingMs <= 0) {
      void handleSubmitExam();
      return;
    }
    const timer = window.setTimeout(() => {
      setTimeRemainingMs((prev) => (prev ? prev - 1000 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [timeRemainingMs]);

  useEffect(() => {
    if (!activeExam) {
      return;
    }

    if (activeQuestionIndex >= activeExam.questions.length) {
      setActiveQuestionIndex(Math.max(0, activeExam.questions.length - 1));
    }
  }, [activeExam, activeQuestionIndex]);

  useEffect(() => {
    if (!activeExam || !activeAttemptId || !sessionStartedAtMs || isSubmitting) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await saveStudentExamAttemptRequest({
            examId: activeExam.id,
            attemptId: activeAttemptId,
            activeQuestionIndex,
            answers,
          });
          upsertExamAttempt(payload.attempt);
          setDraftSavedAtMs(new Date(payload.attempt.lastSavedAt).getTime());
          clearStudentExamDraft(activeExam.id, studentIdentity.id);
        } catch {
          const savedAtMs = Date.now();
          persistAttemptBackup(activeExam, answers, activeQuestionIndex, savedAtMs);
          setSessionBanner(
            'Connection issue detected. A backup was saved on this device while we retry syncing your progress.'
          );
        }
      })();
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeAttemptId,
    activeExam,
    activeQuestionIndex,
    answers,
    isSubmitting,
    sessionStartedAtMs,
    studentIdentity.id,
  ]);

  const handleSubmitExam = async () => {
    if (!activeExam || !activeAttemptId || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      await submitStudentExam({
        examId: activeExam.id,
        attemptId: activeAttemptId,
        studentName: studentIdentity.name || 'Student',
        activeQuestionIndex,
        answers,
      });
      clearStudentExamDraft(activeExam.id, studentIdentity.id);
      setResultNotice('Submitted. Results will appear after teacher review and publish.');
      setExamAttempts((previous) => previous.filter((attempt) => attempt.id !== activeAttemptId));
      setExamSubmissionStates((previous) => [
        {
          examId: activeExam.id,
          status: 'submitted',
          submittedAt: new Date().toISOString(),
          maxScore: activeExam.questions.reduce((sum, question) => sum + (question.maxPoints || 0), 0),
        },
        ...previous.filter((submission) => submission.examId !== activeExam.id),
      ]);
      setActiveExam(null);
      setActiveAttemptId(null);
      setTimeRemainingMs(null);
      setAnswers([]);
      setActiveQuestionIndex(0);
      setSessionStartedAtMs(null);
      setDraftSavedAtMs(null);
      setSessionBanner(null);
      if (department && classGroup) {
        void loadExams();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeExamSession = async () => {
    if (activeExam && activeAttemptId) {
      try {
        const payload = await saveStudentExamAttemptRequest({
          examId: activeExam.id,
          attemptId: activeAttemptId,
          activeQuestionIndex,
          answers,
        });
        upsertExamAttempt(payload.attempt);
        setDraftSavedAtMs(new Date(payload.attempt.lastSavedAt).getTime());
        clearStudentExamDraft(activeExam.id, studentIdentity.id);
        setNotice('Exam progress saved to your account. Resume on any device before the timer runs out.');
      } catch {
        persistAttemptBackup(activeExam, answers, activeQuestionIndex);
        setNotice('Could not sync your latest change. A backup was kept on this device for safety.');
      }
    }

    setActiveExam(null);
    setActiveAttemptId(null);
    setAnswers([]);
    setTimeRemainingMs(null);
    setActiveQuestionIndex(0);
    setSessionStartedAtMs(null);
    setDraftSavedAtMs(null);
    setSessionBanner(null);
  };

  const updateAnswer = (questionId: string, nextAnswer: Partial<ExamAnswer>) => {
    setAnswers((previous) =>
      previous.map((item) =>
        item.questionId === questionId
          ? {
              ...item,
              ...nextAnswer,
            }
          : item
      )
    );
  };

  const handleCheckResult = async (exam: SchoolExam) => {
    setNotice(null);
    setResultPreview(null);
    try {
      const payload = await fetchStudentExamResult(exam.id);
      const submission = payload.submission;
      const scheme = exam.gradingScheme || { primary: 'standard', secondary: 'waec', tertiary: 'cgpa-5' };
      const level = resolveEducationLevel(exam.classGroup);
      const schemeForLevel = scheme[level];
      const score = submission.score || 0;
      const gradePoint =
        level === 'tertiary'
          ? computeGradePoint(score, submission.maxScore, scheme.tertiary).toFixed(2)
          : null;
      const gradeLabel = resolveGradeLabelWithScheme(level, schemeForLevel, score, submission.maxScore);
      const answeredSubmissionCount = submission.answers.filter((answer) =>
        Boolean(answer.optionId || String(answer.response || '').trim())
      ).length;
      const reviewedQuestionCount = (submission.questionReviews || []).filter(
        (review) => typeof review.awardedPoints === 'number'
      ).length;

      setResultPreview({
        exam,
        submission,
        level,
        gradingScheme: schemeForLevel,
        gradeLabel,
        gradePoint,
        percentage: submission.maxScore > 0 ? (score / submission.maxScore) * 100 : 0,
        answeredCount: answeredSubmissionCount,
        reviewedQuestionCount,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Result is not ready yet.');
    }
  };

  useEffect(() => {
    if (
      resultRequestParams.view !== 'result' ||
      !resultRequestParams.examId ||
      autoOpenedResultExamId === resultRequestParams.examId ||
      exams.length === 0
    ) {
      return;
    }

    const targetExam = exams.find((exam) => exam.id === resultRequestParams.examId);
    if (!targetExam) {
      return;
    }

    setAutoOpenedResultExamId(resultRequestParams.examId);
    void handleCheckResult(targetExam);
  }, [resultRequestParams, exams, autoOpenedResultExamId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.10),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_20%),#f8fafc] pb-24">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/student-dashboard')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            >
              <FaArrowLeft size={12} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Student Exams</h1>
              <p className="text-xs text-slate-500">
                Take your class exams and check published results from one place.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-6 overflow-hidden rounded-[32px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.16),_transparent_38%),linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(249,245,255,0.96)_55%,_rgba(239,246,255,0.94)_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                Assessment Center
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Stay ready for every exam without losing focus
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Load your class exams, start only when the session is live, and check your published results after review.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {availableExamsCount} available now
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {upcomingExamsCount} upcoming
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {exams.length} total loaded
                </span>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span className="font-semibold text-slate-900">Next exam:</span>{' '}
                {nextExam
                  ? `${nextExam.title} on ${formatExamDateTime(nextExam.startAt, 'full')}`
                  : 'No upcoming exam scheduled yet for this class.'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <FaFileAlt size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Exams Loaded
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{exams.length}</p>
                <p className="mt-1 text-xs text-slate-500">Assessments returned for your department and class.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FaCheckCircle size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Ready Now
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{availableExamsCount}</p>
                <p className="mt-1 text-xs text-slate-500">You can enter these exams immediately.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sky-600">
                  <FaCalendarAlt size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Upcoming
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{upcomingExamsCount}</p>
                <p className="mt-1 text-xs text-slate-500">Scheduled exams that have not opened yet.</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600">
                  <FaLayerGroup size={13} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                    Identity
                  </span>
                </div>
                <p className="mt-3 text-lg font-bold text-slate-900">
                  {studentIdentity.name || 'Student'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {department || 'Department not selected'} • {classGroup || 'Class not selected'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {recentPublishedResults.length > 0 && (
          <section className="mb-6 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Recent published results</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Open your latest released results without searching through the full exam list.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  {filteredRecentPublishedResults.length} showing
                </span>
                {([
                  { value: 'latest', label: 'Latest' },
                  { value: 'highest', label: 'Highest score' },
                  { value: 'recent', label: 'Last 30 days' },
                ] as { value: RecentResultFilter; label: string }[]).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecentResultFilter(option.value)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      recentResultFilter === option.value
                        ? 'bg-[#3D08BA] text-white shadow-[0_10px_22px_rgba(61,8,186,0.18)]'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecentPublishedResults.length === 0 ? (
              <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No published results match this filter yet.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {filteredRecentPublishedResults.map(({ exam, submission, publishedAt, percentage }) => (
                <div
                  key={exam.id}
                  className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,_rgba(236,253,245,0.88),_rgba(255,255,255,0.98))] p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <FaAward size={13} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                          Result ready
                        </span>
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-slate-900">{exam.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {exam.subject} • {exam.classGroup}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {percentage !== null ? `${percentage}%` : 'Published'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1">
                      {typeof submission.score === 'number'
                        ? `${submission.score}/${submission.maxScore}`
                        : 'Score available'}
                    </span>
                    <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1">
                      Released {formatExamDateTime(publishedAt)}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => void handleCheckResult(exam)}
                      className="rounded-full bg-[#3D08BA] px-4 py-2 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(61,8,186,0.18)] hover:bg-[#2c0691]"
                    >
                      Open result
                    </button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-slate-900">Find your exams</h3>
                <p className="text-xs text-slate-500">
                  Use your department and class to load the right assessment list.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Department</label>
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                    placeholder="e.g. Science"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Class</label>
                  <input
                    value={classGroup}
                    onChange={(event) => setClassGroup(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
                    placeholder="e.g. SS2"
                  />
                </div>
                <button
                  onClick={loadExams}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#3D08BA] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)] hover:bg-[#2c0691]"
                >
                  Load exams
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-3 flex items-center gap-2 text-slate-500">
                <FaSearch size={12} />
                <p className="text-xs font-semibold uppercase tracking-[0.15em]">Quick search</p>
              </div>
              <input
                value={examSearch}
                onChange={(event) => setExamSearch(event.target.value)}
                placeholder="Search by title or subject"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:bg-white focus:ring-4 focus:ring-[#3D08BA]/10"
              />
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Results only appear after teacher review and school publishing.
              </p>
            </div>

            {notice && (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
                {notice}
              </div>
            )}

            {resultNotice && (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-900 shadow-sm">
                {resultNotice}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Available exams</h3>
                  <p className="text-xs text-slate-500">
                    {filteredExams.length} of {exams.length} exams showing
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {department || 'Department'} • {classGroup || 'Class'}
                </span>
              </div>

              <div className="space-y-3">
                {isLoading && (
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    Loading exams...
                  </div>
                )}

                {!isLoading && exams.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">No exams available yet</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Load your class first, then come back when a teacher or school schedules an assessment.
                    </p>
                  </div>
                )}

                {!isLoading && exams.length > 0 && filteredExams.length === 0 && (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-800">No exam matches this search</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Try a different keyword or clear the search box.
                    </p>
                  </div>
                )}

                {filteredExams.map((exam) => {
                  const windowStatus = getStudentExamWindowStatus(exam);
                  const attempt = examAttemptLookup[exam.id];
                  const submissionState = examSubmissionLookup[exam.id];
                  const hasSavedAttempt = Boolean(
                    attempt && attempt.status === 'in_progress' && attempt.timeRemainingMs > 0
                  );
                  const hasSubmitted = Boolean(
                    submissionState &&
                      (submissionState.status === 'submitted' ||
                        submissionState.status === 'graded' ||
                        submissionState.status === 'published')
                  );
                  const canStart = windowStatus === 'live' && !hasSubmitted;
                  const resultReady = submissionState?.status === 'published';
                  const awaitingReview =
                    submissionState?.status === 'submitted' || submissionState?.status === 'graded';
                  const startButtonBusy = startingExamId === exam.id;

                  return (
                    <div
                      key={exam.id}
                      className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.96))] p-4 shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-[#3D08BA]/10 text-[#3D08BA]">
                            <FaFileAlt size={14} />
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{exam.title}</p>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                  windowStatus === 'live'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : windowStatus === 'upcoming'
                                      ? 'bg-sky-100 text-sky-700'
                                      : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {windowStatus}
                              </span>
                              {hasSavedAttempt && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                  Resume ready
                                </span>
                              )}
                              {awaitingReview && (
                                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                                  Awaiting release
                                </span>
                              )}
                              {resultReady && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                  Result ready
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {exam.subject} • {exam.department} • {exam.classGroup}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400">{formatExamDateTime(exam.startAt)}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          {exam.questions.length} questions
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          {exam.durationMinutes} mins
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                          Starts {formatExamDateTime(exam.startAt, 'full')}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          {resultReady
                            ? 'Your school has published this result. Open it to review your performance.'
                            : awaitingReview
                              ? 'You already submitted this exam. Wait for teacher review and school publishing.'
                              : windowStatus === 'live'
                            ? 'Exam room is open. Enter when you are ready.'
                            : windowStatus === 'upcoming'
                              ? 'This exam is scheduled and will open at the start time.'
                              : 'This exam window has closed. Check your result when published.'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => void startExam(exam)}
                            disabled={!canStart || startButtonBusy}
                            className={`rounded-full px-4 py-2 text-[11px] font-semibold transition ${
                              canStart
                                ? 'bg-[#3D08BA] text-white shadow-[0_10px_22px_rgba(61,8,186,0.22)] hover:bg-[#2c0691]'
                                : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {startButtonBusy
                              ? 'Opening...'
                              : windowStatus === 'live'
                                ? hasSavedAttempt
                                  ? 'Resume exam'
                                  : hasSubmitted
                                    ? 'Submitted'
                                    : 'Enter exam'
                              : windowStatus === 'upcoming'
                                ? 'Starts soon'
                                : 'Closed'}
                          </button>
                          <button
                            onClick={() => void handleCheckResult(exam)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Check result
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      {resultPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(248,250,252,0.97))] shadow-[0_35px_120px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Published Result
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{resultPreview.exam.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {resultPreview.exam.subject} • {resultPreview.exam.classGroup} •{' '}
                      {formatGradingSchemeLabel(resultPreview.level, resultPreview.gradingScheme)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Published {formatExamDateTime(resultPreview.submission.publishedAt || resultPreview.submission.gradedAt || resultPreview.submission.submittedAt, 'full')}
                    </span>
                    <button
                      onClick={() => setResultPreview(null)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-[#3D08BA]">
                        <FaClipboardCheck size={13} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                          {formatScoreLabel(resultPreview.level)}
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-900">
                        {resultPreview.submission.score || 0}/{resultPreview.submission.maxScore}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPercentage(resultPreview.submission.score || 0, resultPreview.submission.maxScore)} overall performance
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-600">
                        <FaAward size={13} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                          Grade
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{resultPreview.gradeLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Graded with {formatGradingSchemeLabel(resultPreview.level, resultPreview.gradingScheme).toLowerCase()}.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-sky-600">
                        <FaChartLine size={13} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                          Performance
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-900">
                        {Math.round(resultPreview.percentage)}%
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {resultPreview.reviewedQuestionCount || resultPreview.answeredCount} of {resultPreview.exam.questions.length} questions reviewed.
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <FaCheckCircle size={13} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em]">
                          {resultPreview.level === 'tertiary' ? formatGradePointLabel(resultPreview.level) : 'Status'}
                        </span>
                      </div>
                      <p className="mt-3 text-3xl font-bold text-slate-900">
                        {resultPreview.level === 'tertiary'
                          ? `${resultPreview.gradePoint}/${resultPreview.gradingScheme === 'cgpa-4' ? '4.00' : '5.00'}`
                          : 'Published'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {resultPreview.level === 'tertiary'
                          ? 'Course point converted from your final score.'
                          : 'Your school has released this result to you.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FaRegCommentDots size={14} />
                      <p className="text-sm font-semibold text-slate-900">Teacher note</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {resultPreview.submission.feedback?.trim() ||
                        'No written feedback was added for this result yet.'}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Answer review</h3>
                        <p className="text-xs text-slate-500">
                          Review every response you submitted for this exam.
                        </p>
                      </div>
                    </div>

                    {resultPreview.exam.questions.map((question, index) => {
                      const submittedAnswer = findSubmittedAnswer(resultPreview.submission, question.id);
                      const questionReview = findSubmittedQuestionReview(resultPreview.submission, question.id);
                      const selectedOption =
                        question.type === 'mcq'
                          ? (question.options || []).find((option) => option.id === submittedAnswer?.optionId) || null
                          : null;
                      const correctOption =
                        question.type === 'mcq'
                          ? (question.options || []).find((option) => option.id === question.correctOptionId) || null
                          : null;
                      const selectedOptionIndex =
                        selectedOption && question.options
                          ? question.options.findIndex((option) => option.id === selectedOption.id)
                          : -1;
                      const answerText =
                        question.type === 'mcq'
                          ? selectedOption?.text || submittedAnswer?.response || ''
                          : submittedAnswer?.response || '';
                      const hasAnswer = Boolean(
                        submittedAnswer?.optionId || String(submittedAnswer?.response || '').trim()
                      );

                      return (
                        <div
                          key={question.id || `result-question-${index}`}
                          className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] p-5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[#3D08BA]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#3D08BA]">
                                Question {index + 1}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                {question.type === 'mcq' ? 'Multiple choice' : 'Written response'}
                              </span>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {question.maxPoints} marks
                            </span>
                          </div>

                          <p className="mt-4 text-base font-semibold leading-7 text-slate-900">
                            {question.prompt}
                          </p>

                          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                                Your response
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                    hasAnswer
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {hasAnswer ? 'Answered' : 'No response'}
                                </span>
                                {questionReview && (
                                  <span className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3D08BA]">
                                    Marked {questionReview.awardedPoints}/{question.maxPoints}
                                  </span>
                                )}
                              </div>
                            </div>

                            {hasAnswer ? (
                              <div className="mt-3 text-sm leading-6 text-slate-700">
                                {question.type === 'mcq' && selectedOptionIndex >= 0 && (
                                  <div className="mb-2 inline-flex items-center rounded-full bg-[#3D08BA]/8 px-3 py-1 text-xs font-semibold text-[#3D08BA]">
                                    Option {String.fromCharCode(65 + selectedOptionIndex)}
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap">{answerText}</p>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-400">
                                You did not submit an answer for this question.
                              </p>
                            )}

                            {correctOption && (
                              <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                                  Correct answer
                                </p>
                                <p className="mt-2 text-sm leading-6 text-emerald-900">
                                  {correctOption.text}
                                </p>
                              </div>
                            )}

                            {questionReview?.feedback?.trim() && (
                              <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-700">
                                  Teacher note
                                </p>
                                <p className="mt-2 text-sm leading-6 text-amber-900">
                                  {questionReview.feedback}
                                </p>
                              </div>
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
                      <p className="text-sm font-semibold text-slate-900">Result summary</p>
                      <div className="mt-3 space-y-3 text-sm text-slate-600">
                        <div className="flex items-center justify-between gap-3">
                          <span>Student</span>
                          <span className="font-semibold text-slate-900">{resultPreview.submission.studentName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Submitted</span>
                          <span className="text-right font-semibold text-slate-900">
                            {formatExamDateTime(resultPreview.submission.submittedAt, 'full')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Published</span>
                          <span className="text-right font-semibold text-slate-900">
                            {formatExamDateTime(
                              resultPreview.submission.publishedAt ||
                                resultPreview.submission.gradedAt ||
                                resultPreview.submission.submittedAt,
                              'full'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Questions</span>
                          <span className="font-semibold text-slate-900">
                            {resultPreview.exam.questions.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Answered</span>
                          <span className="font-semibold text-slate-900">
                            {resultPreview.answeredCount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Questions reviewed</span>
                          <span className="font-semibold text-slate-900">
                            {resultPreview.reviewedQuestionCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Result guide</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        Your final score has already been reviewed and published by the school. If you need clarification, use the teacher note first before asking for a remark.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-white/92 px-5 py-4 sm:px-6">
                <button
                  onClick={() => setResultPreview(null)}
                  className="rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)] hover:bg-[#2c0691]"
                >
                  Close result
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeExam && activeQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/65 px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-6xl items-center justify-center">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(248,250,252,0.97))] shadow-[0_35px_120px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(61,8,186,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center rounded-full border border-[#3D08BA]/15 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                      Live Exam Session
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{activeExam.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {activeExam.subject} • {activeExam.classGroup} • {activeExam.durationMinutes} mins
                    </p>
                    {sessionBanner && (
                      <p className="mt-3 max-w-2xl rounded-[18px] border border-[#3D08BA]/10 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600">
                        {sessionBanner}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {draftTimeLabel && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        Saved {draftTimeLabel}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        timeRemainingMs !== null && timeRemainingMs <= 5 * 60 * 1000
                          ? 'border border-red-200 bg-red-50 text-red-700'
                          : 'border border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      <FaClock size={12} />
                      {timeRemainingMs !== null ? formatTimeRemaining(timeRemainingMs) : '00:00'}
                    </span>
                    <button
                      onClick={closeExamSession}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Leave
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Question {activeQuestionIndex + 1} of {activeExam.questions.length}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {answeredCount} answered • {activeExam.questions.length - answeredCount} remaining
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {sessionProgressPercentage}% complete
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#3D08BA] transition-all"
                        style={{ width: `${sessionProgressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#3D08BA]">
                        {activeQuestion.type === 'mcq' ? 'Multiple choice' : 'Written response'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                        {activeQuestion.maxPoints} marks
                      </span>
                    </div>

                    <p className="mt-4 text-xl font-semibold leading-8 text-slate-900">
                      {activeQuestion.prompt}
                    </p>

                    {activeQuestion.type === 'mcq' && (
                      <div className="mt-6 space-y-3">
                        {(activeQuestion.options || []).map((option, optionIndex) => {
                          const isSelected = currentAnswer?.optionId === option.id;

                          return (
                            <button
                              key={option.id || `${activeQuestion.id || 'question'}-option-${optionIndex}`}
                              type="button"
                              onClick={() =>
                                updateAnswer(activeQuestion.id || '', {
                                  response: option.text,
                                  optionId: option.id,
                                })
                              }
                              className={`flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition ${
                                isSelected
                                  ? 'border-[#3D08BA]/25 bg-[#3D08BA]/8 shadow-[0_10px_24px_rgba(61,8,186,0.12)]'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-semibold ${
                                  isSelected ? 'bg-[#3D08BA] text-white' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <div className="pt-1 text-sm text-slate-800">{option.text}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activeQuestion.type === 'short' && (
                      <div className="mt-6">
                        <textarea
                          value={currentAnswer?.response || ''}
                          onChange={(event) =>
                            updateAnswer(activeQuestion.id || '', {
                              response: event.target.value,
                              optionId: null,
                            })
                          }
                          className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-800 outline-none transition focus:border-[#3D08BA]/35 focus:ring-4 focus:ring-[#3D08BA]/10"
                          rows={8}
                          placeholder="Write your answer here..."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50/80 px-5 py-5 xl:border-l xl:border-t-0">
                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Session summary</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Answered
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{answeredCount}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                            Remaining
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {activeExam.questions.length - answeredCount}
                          </p>
                        </div>
                      </div>
                      {draftTimeLabel && (
                        <p className="mt-3 text-xs text-slate-500">Last account save: {draftTimeLabel}</p>
                      )}
                    </div>

                    <div className="rounded-[24px] border border-white bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">Question navigator</p>
                      <div className="mt-3 grid grid-cols-5 gap-2">
                        {activeExam.questions.map((question, index) => {
                          const answer = answers.find((item) => item.questionId === question.id);
                          const hasAnswer = Boolean(answer?.optionId || String(answer?.response || '').trim());
                          const isActive = index === activeQuestionIndex;

                          return (
                            <button
                              key={question.id || `nav-${index}`}
                              type="button"
                              onClick={() => setActiveQuestionIndex(index)}
                              className={`rounded-2xl px-3 py-3 text-xs font-semibold transition ${
                                isActive
                                  ? 'bg-[#3D08BA] text-white shadow-[0_10px_24px_rgba(61,8,186,0.22)]'
                                  : hasAnswer
                                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                              }`}
                            >
                              {index + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white bg-white p-4 text-sm text-slate-600 shadow-sm">
                      <p className="font-semibold text-slate-900">Exam tip</p>
                      <p className="mt-2 leading-6">
                        Move through the navigator to review unanswered questions before you submit.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white/92 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveQuestionIndex((previous) => Math.max(0, previous - 1))}
                    disabled={activeQuestionIndex === 0}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQuestionIndex((previous) =>
                        Math.min(activeExam.questions.length - 1, previous + 1)
                      )
                    }
                    disabled={activeQuestionIndex === activeExam.questions.length - 1}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Next
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeExamSession}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSubmitExam()}
                    disabled={isSubmitting}
                    className="rounded-full bg-[#3D08BA] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(61,8,186,0.25)] hover:bg-[#2c0691] disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit exam'}
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

export default StudentExams;
