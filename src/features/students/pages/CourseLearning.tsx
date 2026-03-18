import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  PlayCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, useParams } from 'react-router-dom';
import StudentBottomNavigation from '../../../components/layout/student-layout/StudentBottomNavigation';
import { createPdfBlob, downloadFile } from '../../../utils/exportFiles';
import {
  getRecordedCourseById,
  type RecordedLesson,
  type RecordedModule,
} from '../data/recordedCourses';
import {
  buildCourseCertificateDocDefinition,
  getStudentCourseCertificateForCourse,
  issueCourseCertificateIfEligible,
  type CourseCertificateRecord,
} from '../utils/courseCertificatesApi';

type ProgressMap = Record<number, string[]>;
type ResumeLessonMap = Record<number, string>;

type ModuleQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
};

const LESSON_PROGRESS_STORAGE_KEY = 'edamaa_recorded_lesson_progress_v1';
const MODULE_QUIZ_STORAGE_KEY = 'edamaa_recorded_module_quiz_progress_v1';
const RESUME_LESSON_STORAGE_KEY = 'edamaa_recorded_resume_lesson_v1';
const LEARNER_KEY_STORAGE_KEY = 'edamaa_learner_key_v1';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

const loadProgressMap = (key: string): ProgressMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
};

const loadResumeMap = (): ResumeLessonMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(RESUME_LESSON_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as ResumeLessonMap;
  } catch {
    return {};
  }
};

const getOrCreateLearnerKey = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.localStorage.getItem(LEARNER_KEY_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = `learner-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  window.localStorage.setItem(LEARNER_KEY_STORAGE_KEY, created);
  return created;
};

const uniqueList = (items: string[]) => Array.from(new Set(items.filter((item) => item.trim().length > 0)));

const formatMinutes = (minutes: number) => `${minutes} min`;

const formatTotalRuntime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) {
    return `${remainder} min`;
  }
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

const buildCountOptions = (correct: number) => {
  const options = uniqueList([
    String(correct),
    String(Math.max(1, correct - 1)),
    String(correct + 1),
    String(correct + 2),
  ]);
  while (options.length < 4) {
    options.push(String(correct + options.length + 1));
  }
  return options.slice(0, 4);
};

const buildModuleQuiz = (
  module: RecordedModule,
  moduleIndex: number,
  allLessons: RecordedLesson[]
): ModuleQuizQuestion[] => {
  const moduleLessonTitles = module.lessons.map((lesson) => lesson.title);
  const externalLessons = allLessons
    .filter((lesson) => !moduleLessonTitles.includes(lesson.title))
    .map((lesson) => lesson.title);

  const lessonCountAnswer = String(module.lessons.length);
  const lessonCountOptions = buildCountOptions(module.lessons.length);

  const correctLesson = module.lessons[Math.floor(module.lessons.length / 2)]?.title || module.lessons[0]?.title || '';
  const lessonMembershipOptions = uniqueList([
    correctLesson,
    externalLessons[0] || `${module.title} Practice Session`,
    externalLessons[1] || `${module.title} Review`,
    externalLessons[2] || `${module.title} Wrap-Up`,
  ]).slice(0, 4);

  const moduleMinutes = module.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0);
  const minutesAnswer = String(moduleMinutes);
  const moduleMinutesOptions = uniqueList([
    String(moduleMinutes),
    String(Math.max(1, moduleMinutes - 3)),
    String(moduleMinutes + 3),
    String(moduleMinutes + 6),
  ]).slice(0, 4);

  return [
    {
      id: `${module.id}-q1`,
      prompt: `How many lessons are in Module ${moduleIndex + 1}?`,
      options: lessonCountOptions,
      correctAnswer: lessonCountAnswer,
    },
    {
      id: `${module.id}-q2`,
      prompt: `Which lesson belongs to "${module.title}"?`,
      options: lessonMembershipOptions,
      correctAnswer: correctLesson,
    },
    {
      id: `${module.id}-q3`,
      prompt: `What is the total runtime for this module (minutes)?`,
      options: moduleMinutesOptions,
      correctAnswer: minutesAnswer,
    },
  ];
};

const CourseLearning = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const parsedCourseId = Number(courseId);
  const course = useMemo(
    () => (Number.isFinite(parsedCourseId) ? getRecordedCourseById(parsedCourseId) : undefined),
    [parsedCourseId]
  );

  const [learnerKey, setLearnerKey] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [lessonProgress, setLessonProgress] = useState<ProgressMap>(() =>
    loadProgressMap(LESSON_PROGRESS_STORAGE_KEY)
  );
  const [moduleQuizProgress, setModuleQuizProgress] = useState<ProgressMap>(() =>
    loadProgressMap(MODULE_QUIZ_STORAGE_KEY)
  );
  const [resumeLessonMap, setResumeLessonMap] = useState<ResumeLessonMap>(() => loadResumeMap());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle');
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [issuedCertificate, setIssuedCertificate] = useState<CourseCertificateRecord | null>(null);
  const [certificateBusy, setCertificateBusy] = useState(false);

  useEffect(() => {
    setLearnerKey(getOrCreateLearnerKey());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(lessonProgress));
  }, [lessonProgress]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(MODULE_QUIZ_STORAGE_KEY, JSON.stringify(moduleQuizProgress));
  }, [moduleQuizProgress]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(RESUME_LESSON_STORAGE_KEY, JSON.stringify(resumeLessonMap));
  }, [resumeLessonMap]);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }
    const timer = window.setTimeout(() => setActionNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!course) {
      setSelectedLessonId('');
      setExpandedModules({});
      setActiveQuizModuleId(null);
      setQuizAnswers({});
      setQuizResult(null);
      setIssuedCertificate(null);
      setInitialSyncDone(false);
      return;
    }

    const allLessons = course.modules.flatMap((module) => module.lessons);
    const firstLesson = allLessons[0]?.id || '';
    const resumeLessonId = resumeLessonMap[course.id];

    setSelectedLessonId((current) => {
      if (allLessons.some((lesson) => lesson.id === current)) {
        return current;
      }
      if (resumeLessonId && allLessons.some((lesson) => lesson.id === resumeLessonId)) {
        return resumeLessonId;
      }
      return firstLesson;
    });

    // Keep the first module expanded on entry so lesson flow stays obvious.
    setExpandedModules(
      Object.fromEntries(course.modules.map((module, index) => [module.id, index === 0]))
    );

    setActiveQuizModuleId(null);
    setQuizAnswers({});
    setQuizResult(null);
    setIssuedCertificate(null);
    setInitialSyncDone(false);
  }, [course, resumeLessonMap]);

  const allLessons = useMemo(
    () => (course ? course.modules.flatMap((module) => module.lessons) : []),
    [course]
  );

  const selectedLesson = useMemo(
    () => allLessons.find((lesson) => lesson.id === selectedLessonId) || allLessons[0],
    [allLessons, selectedLessonId]
  );

  const completedLessonList = useMemo(
    () => (course ? lessonProgress[course.id] || [] : []),
    [lessonProgress, course]
  );

  const passedModuleList = useMemo(
    () => (course ? moduleQuizProgress[course.id] || [] : []),
    [moduleQuizProgress, course]
  );

  const completedLessonIds = useMemo(
    () => new Set(completedLessonList),
    [completedLessonList]
  );

  const passedModuleIds = useMemo(() => new Set(passedModuleList), [passedModuleList]);

  const completedLessonCount = useMemo(
    () => allLessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
    [allLessons, completedLessonIds]
  );

  const certificateEligible = useMemo(() => {
    if (!course || allLessons.length === 0 || course.modules.length === 0) {
      return false;
    }

    const allLessonsCompleted = completedLessonCount === allLessons.length;
    const allModulesPassed = course.modules.every((module) => passedModuleIds.has(module.id));
    return allLessonsCompleted && allModulesPassed;
  }, [allLessons.length, completedLessonCount, course, passedModuleIds]);

  const completionPercent = allLessons.length
    ? Math.round((completedLessonCount / allLessons.length) * 100)
    : 0;

  const nextLesson = allLessons.find((lesson) => !completedLessonIds.has(lesson.id));

  useEffect(() => {
    if (!course || !learnerKey) {
      setIssuedCertificate(null);
      return;
    }

    setIssuedCertificate(getStudentCourseCertificateForCourse(course.id, learnerKey));
  }, [course, learnerKey]);

  const totalRuntimeMinutes = useMemo(
    () => allLessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0),
    [allLessons]
  );

  const moduleQuizzes = useMemo(() => {
    if (!course) {
      return {} as Record<string, ModuleQuizQuestion[]>;
    }

    return Object.fromEntries(
      course.modules.map((module, index) => [module.id, buildModuleQuiz(module, index, allLessons)])
    ) as Record<string, ModuleQuizQuestion[]>;
  }, [course, allLessons]);

  const activeQuizQuestions = useMemo(
    () => (activeQuizModuleId ? moduleQuizzes[activeQuizModuleId] || [] : []),
    [moduleQuizzes, activeQuizModuleId]
  );

  const activeQuizModule = useMemo(
    () => course?.modules.find((module) => module.id === activeQuizModuleId) || null,
    [course, activeQuizModuleId]
  );

  const findModuleByLessonId = (lessonId: string) =>
    course?.modules.find((module) => module.lessons.some((lesson) => lesson.id === lessonId));

  const expandModuleForLesson = (lessonId: string) => {
    const module = findModuleByLessonId(lessonId);
    if (!module) {
      return;
    }
    setExpandedModules((prev) => ({ ...prev, [module.id]: true }));
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const markLessonCompletion = (lesson: RecordedLesson, completed: boolean) => {
    if (!course) {
      return;
    }

    setLessonProgress((prev) => {
      const existing = new Set(prev[course.id] || []);
      if (completed) {
        existing.add(lesson.id);
      } else {
        existing.delete(lesson.id);
      }
      return { ...prev, [course.id]: Array.from(existing) };
    });
  };

  useEffect(() => {
    if (!course || !selectedLessonId) {
      return;
    }

    setResumeLessonMap((prev) => {
      if (prev[course.id] === selectedLessonId) {
        return prev;
      }
      return { ...prev, [course.id]: selectedLessonId };
    });
  }, [course, selectedLessonId]);

  // Fetch remote progress once per course and merge with local state.
  useEffect(() => {
    if (!course || !learnerKey) {
      return;
    }

    let cancelled = false;

    const fetchRemoteProgress = async () => {
      setSyncStatus('syncing');

      try {
        const response = await fetch(
          `${API_BASE_URL}/learning-progress/${encodeURIComponent(learnerKey)}/${course.id}`
        );
        if (!response.ok) {
          throw new Error('Progress endpoint unavailable');
        }

        const remote = (await response.json()) as {
          selectedLessonId?: string | null;
          completedLessonIds?: string[];
          passedModuleIds?: string[];
        };

        if (cancelled) {
          return;
        }

        const remoteCompleted = Array.isArray(remote.completedLessonIds)
          ? uniqueList(remote.completedLessonIds)
          : [];
        const remotePassed = Array.isArray(remote.passedModuleIds)
          ? uniqueList(remote.passedModuleIds)
          : [];

        if (remoteCompleted.length > 0) {
          setLessonProgress((prev) => ({
            ...prev,
            [course.id]: uniqueList([...(prev[course.id] || []), ...remoteCompleted]),
          }));
        }

        if (remotePassed.length > 0) {
          setModuleQuizProgress((prev) => ({
            ...prev,
            [course.id]: uniqueList([...(prev[course.id] || []), ...remotePassed]),
          }));
        }

        if (
          typeof remote.selectedLessonId === 'string' &&
          remote.selectedLessonId &&
          allLessons.some((lesson) => lesson.id === remote.selectedLessonId)
        ) {
          setSelectedLessonId(remote.selectedLessonId);
          setResumeLessonMap((prev) => ({ ...prev, [course.id]: remote.selectedLessonId as string }));
          expandModuleForLesson(remote.selectedLessonId);
        }

        setSyncStatus('synced');
      } catch {
        if (!cancelled) {
          setSyncStatus('offline');
        }
      } finally {
        if (!cancelled) {
          setInitialSyncDone(true);
        }
      }
    };

    void fetchRemoteProgress();

    return () => {
      cancelled = true;
    };
  }, [course, learnerKey, allLessons]);

  // Push updates so a learner can resume on another device.
  useEffect(() => {
    if (!course || !learnerKey || !initialSyncDone) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSyncStatus('syncing');

      try {
        const response = await fetch(
          `${API_BASE_URL}/learning-progress/${encodeURIComponent(learnerKey)}/${course.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              selectedLessonId: selectedLessonId || null,
              completedLessonIds: completedLessonList,
              passedModuleIds: passedModuleList,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Could not sync progress');
        }

        setSyncStatus('synced');
      } catch {
        setSyncStatus('offline');
      }
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [
    course,
    learnerKey,
    selectedLessonId,
    completedLessonList,
    passedModuleList,
    initialSyncDone,
  ]);

  useEffect(() => {
    if (!course || !learnerKey || !certificateEligible) {
      return;
    }

    let cancelled = false;

    const maybeIssueCertificate = async () => {
      setCertificateBusy(true);
      try {
        const result = await issueCourseCertificateIfEligible({
          learnerKey,
          course,
          completedLessonIds: completedLessonList,
          passedModuleIds: passedModuleList,
        });

        if (cancelled || !result.certificate) {
          return;
        }

        setIssuedCertificate(result.certificate);
        if (result.issuedNow) {
          setActionNotice('Course completed. Your Edamaa3D certificate is now in your certificate wallet.');
        }
      } finally {
        if (!cancelled) {
          setCertificateBusy(false);
        }
      }
    };

    void maybeIssueCertificate();

    return () => {
      cancelled = true;
    };
  }, [certificateEligible, completedLessonList, course, learnerKey, passedModuleList]);

  const downloadIssuedCertificate = async () => {
    if (!issuedCertificate) {
      return;
    }

    setCertificateBusy(true);
    try {
      const pdfBlob = await createPdfBlob(buildCourseCertificateDocDefinition(issuedCertificate));
      const safeTitle =
        course?.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'course';
      downloadFile(pdfBlob, `${issuedCertificate.certificateCode.toLowerCase()}-${safeTitle}.pdf`);
    } catch {
      setActionNotice('Certificate is ready, but the PDF could not be prepared right now.');
    } finally {
      setCertificateBusy(false);
    }
  };

  const handleLessonEnded = () => {
    if (!selectedLesson) {
      return;
    }

    markLessonCompletion(selectedLesson, true);

    if (!autoPlayEnabled) {
      setActionNotice('Lesson completed. Select your next lesson when ready.');
      return;
    }

    const currentIndex = allLessons.findIndex((lesson) => lesson.id === selectedLesson.id);
    const next = currentIndex >= 0 ? allLessons[currentIndex + 1] : undefined;

    if (!next) {
      setActionNotice('Great work. You completed the final lesson in this recorded class.');
      return;
    }

    setSelectedLessonId(next.id);
    expandModuleForLesson(next.id);
    setActionNotice(`Auto-playing next lesson: ${next.title}`);
  };

  const openModuleQuiz = (moduleId: string) => {
    setActiveQuizModuleId(moduleId);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitActiveQuiz = () => {
    if (!course || !activeQuizModuleId || activeQuizQuestions.length === 0) {
      return;
    }

    const score = activeQuizQuestions.reduce((total, question) => {
      return total + (quizAnswers[question.id] === question.correctAnswer ? 1 : 0);
    }, 0);
    const total = activeQuizQuestions.length;
    const passMark = Math.ceil(total * 0.67);
    const passed = score >= passMark;

    setQuizResult({ score, total, passed });

    if (passed) {
      setModuleQuizProgress((prev) => ({
        ...prev,
        [course.id]: uniqueList([...(prev[course.id] || []), activeQuizModuleId]),
      }));
      setActionNotice('Checkpoint passed. Module marked complete.');
    } else {
      setActionNotice('Checkpoint not passed yet. Review lessons and retake.');
    }
  };

  const onHomeClick = () => navigate('/student-dashboard');
  const onCoursesClick = () => navigate('/mycourses');
  const onAssignmentsClick = () => navigate('/assignments');
  const onPerformanceClick = () => navigate('/performance');
  const onCertificatesClick = () => navigate('/student-certificates');

  if (!course) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-16 pb-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Course Not Found</h1>
          <p className="mt-2 text-sm text-gray-600">
            This recorded class is unavailable or the link is invalid.
          </p>
          <button
            onClick={() => navigate('/mycourses')}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
              <ArrowLeftIcon className="h-3.5 w-3.5 text-gray-700" />
            </span>
            Back to Courses
          </button>
        </div>

        <StudentBottomNavigation
          activeTab="courses"
          onHomeClick={onHomeClick}
          onCoursesClick={onCoursesClick}
          onAssignmentsClick={onAssignmentsClick}
          onPerformanceClick={onPerformanceClick}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => navigate('/mycourses')}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
              <ArrowLeftIcon className="h-3.5 w-3.5 text-gray-700" />
            </span>
            Back to Courses
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{course.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <AcademicCapIcon className="h-4 w-4" />
              {course.instructor}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpenIcon className="h-4 w-4" />
              {allLessons.length} short lessons
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {formatTotalRuntime(totalRuntimeMinutes)} total runtime
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                syncStatus === 'synced'
                  ? 'bg-green-100 text-green-700'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-100 text-blue-700'
                  : syncStatus === 'offline'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {syncStatus === 'synced'
                ? 'Progress Synced'
                : syncStatus === 'syncing'
                ? 'Syncing'
                : syncStatus === 'offline'
                ? 'Local Only'
                : 'Idle'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {actionNotice && (
          <div className="mb-4 rounded-lg border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-3 text-sm text-[#3D08BA]">
            {actionNotice}
          </div>
        )}

        {issuedCertificate && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,_rgba(16,185,129,0.08),_rgba(255,255,255,0.98))] px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  <SparklesIcon className="h-4 w-4" />
                  Certificate ready
                </div>
                <h2 className="mt-3 text-lg font-bold text-gray-900">Your course certificate has been issued.</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {issuedCertificate.issuerName} issued this certificate via Edamaa3D after you completed all lessons and passed every module checkpoint.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCertificatesClick}
                  className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  Open wallet
                </button>
                <button
                  type="button"
                  onClick={() => void downloadIssuedCertificate()}
                  disabled={certificateBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {certificateBusy ? 'Preparing PDF...' : 'Download certificate'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="aspect-video bg-black">
                {selectedLesson ? (
                  <video
                    ref={videoRef}
                    key={selectedLesson.id}
                    controls
                    className="h-full w-full"
                    poster={course.thumbnail}
                    preload="metadata"
                    onEnded={handleLessonEnded}
                  >
                    <source src={selectedLesson.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-white/70">
                    No lesson selected
                  </div>
                )}
              </div>

              {selectedLesson && (
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#3D08BA]">
                    <PlayCircleIcon className="h-4 w-4" />
                    Recorded Lesson
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900">{selectedLesson.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{selectedLesson.summary}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {formatMinutes(selectedLesson.durationMinutes)}
                    </span>
                    {completedLessonIds.has(selectedLesson.id) ? (
                      <button
                        onClick={() => markLessonCompletion(selectedLesson, false)}
                        className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                      >
                        Completed
                      </button>
                    ) : (
                      <button
                        onClick={() => markLessonCompletion(selectedLesson, true)}
                        className="rounded-full border border-[#3D08BA]/30 bg-[#3D08BA]/5 px-3 py-1 text-xs font-medium text-[#3D08BA] hover:bg-[#3D08BA]/10 transition-colors"
                      >
                        Mark as Complete
                      </button>
                    )}
                    <button
                      onClick={() => setAutoPlayEnabled((prev) => !prev)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        autoPlayEnabled
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {autoPlayEnabled ? 'Auto-Play On' : 'Auto-Play Off'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">About This Recorded Class</h3>
              <p className="mt-2 text-sm text-gray-700">{course.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {activeQuizModule && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Module Checkpoint
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">{activeQuizModule.title}</h3>
                  </div>
                  {passedModuleIds.has(activeQuizModule.id) && (
                    <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      Passed
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  {activeQuizQuestions.map((question, index) => (
                    <div key={question.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm font-medium text-gray-900">
                        {index + 1}. {question.prompt}
                      </p>
                      <div className="mt-2 space-y-2">
                        {question.options.map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5 hover:bg-gray-50 text-sm text-gray-700"
                          >
                            <input
                              type="radio"
                              name={question.id}
                              checked={quizAnswers[question.id] === option}
                              onChange={() => handleQuizAnswer(question.id, option)}
                              className="accent-[#3D08BA]"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={submitActiveQuiz}
                    disabled={activeQuizQuestions.some((question) => !quizAnswers[question.id])}
                    className="rounded-lg bg-[#3D08BA] px-4 py-2 text-sm font-medium text-white hover:bg-[#2D0690] transition-colors disabled:opacity-50"
                  >
                    Submit Checkpoint
                  </button>
                  <button
                    onClick={() => {
                      setQuizAnswers({});
                      setQuizResult(null);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {quizResult && (
                  <p
                    className={`mt-3 text-sm font-medium ${
                      quizResult.passed ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    Score: {quizResult.score}/{quizResult.total} {quizResult.passed ? 'Passed' : 'Not passed yet'}
                  </p>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Learning Progress</h3>
              <p className="mt-1 text-xs text-gray-600">
                {completedLessonCount} of {allLessons.length} lessons complete
              </p>
              <div className="mt-3 h-2 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#3D08BA] to-red-400 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#3D08BA]">{completionPercent}% complete</p>
              {nextLesson && (
                <p className="mt-2 text-xs text-gray-600">
                  Next up: <span className="font-medium text-gray-800">{nextLesson.title}</span>
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Modules passed: {passedModuleList.length}/{course.modules.length}
              </p>
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Certificate status
                </p>
                {issuedCertificate ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">Issued and saved in your wallet</p>
                    <p className="mt-1 text-xs text-gray-600">
                      Code: {issuedCertificate.certificateCode}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {certificateEligible
                        ? 'Finalizing certificate issue...'
                        : 'Complete every lesson and pass all module checkpoints to unlock it.'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Lessons: {completedLessonCount}/{allLessons.length} • Checkpoints: {passedModuleList.length}/{course.modules.length}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Course Contents</h3>
                <p className="text-xs text-gray-600">
                  Short lesson breakdown with checkpoint quizzes per module.
                </p>
              </div>

              <div className="max-h-[560px] overflow-y-auto">
                {course.modules.map((module, moduleIndex) => {
                  const moduleMinutes = module.lessons.reduce(
                    (sum, lesson) => sum + lesson.durationMinutes,
                    0
                  );
                  const isExpanded = !!expandedModules[module.id];
                  const moduleCompleted = module.lessons.every((lesson) => completedLessonIds.has(lesson.id));
                  const modulePassed = passedModuleIds.has(module.id);

                  return (
                    <div key={module.id} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Module {moduleIndex + 1}
                            </p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{module.title}</p>
                            <p className="text-xs text-gray-500">
                              {module.lessons.length} lessons • {formatTotalRuntime(moduleMinutes)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {modulePassed && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-2 pb-3">
                          {module.lessons.map((lesson, lessonIndex) => {
                            const isSelected = selectedLesson?.id === lesson.id;
                            const isCompleted = completedLessonIds.has(lesson.id);

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => {
                                  setSelectedLessonId(lesson.id);
                                  setResumeLessonMap((prev) => ({ ...prev, [course.id]: lesson.id }));
                                }}
                                className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-[#3D08BA]/8 border border-[#3D08BA]/25'
                                    : 'border border-transparent hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-gray-500">
                                      Lesson {lessonIndex + 1}
                                    </p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                                  </div>
                                  {isCompleted && (
                                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-600" />
                                  )}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                  <ClockIcon className="h-3 w-3" />
                                  {formatMinutes(lesson.durationMinutes)}
                                </div>
                              </button>
                            );
                          })}

                          <button
                            onClick={() => openModuleQuiz(module.id)}
                            disabled={!moduleCompleted}
                            className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                              moduleCompleted
                                ? modulePassed
                                  ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                                  : 'border-[#3D08BA]/30 bg-[#3D08BA]/5 text-[#3D08BA] hover:bg-[#3D08BA]/10'
                                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {modulePassed
                              ? 'Retake Checkpoint Quiz'
                              : moduleCompleted
                              ? 'Take Checkpoint Quiz'
                              : 'Complete lessons to unlock quiz'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <StudentBottomNavigation
        activeTab="courses"
        onHomeClick={onHomeClick}
        onCoursesClick={onCoursesClick}
        onAssignmentsClick={onAssignmentsClick}
        onPerformanceClick={onPerformanceClick}
      />
    </div>
  );
};

export default CourseLearning;
