import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BookOpenIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlayCircleIcon,
  PlusIcon,
  RectangleStackIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../../components/layout/school-layout/NavBar';
import { loadSchoolBrandingNames } from '../../../utils/schoolBranding';
import {
  buildSchoolCourseDurationLabel,
  countSchoolCourseLessons,
  createSchoolOnlineCourse,
  deleteSchoolOnlineCourse,
  fetchSchoolOnlineCoursesWorkspace,
  formatSchoolCourseAudience,
  updateSchoolOnlineCourse,
  updateSchoolOnlineCourseStatus,
  type SchoolOnlineCourseRecord,
} from '../../courses/utils/schoolOnlineCoursesStore';
import type { StudentSchoolLevel } from '../../students/utils/studentIdentity';

type CourseFormLesson = {
  title: string;
  summary: string;
  durationMinutes: string;
  videoUrl: string;
};

type CourseFormModule = {
  title: string;
  lessons: CourseFormLesson[];
};

type CourseFormState = {
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  skills: string;
  thumbnailUrl: string;
  status: SchoolOnlineCourseRecord['status'];
  audienceSchoolLevel: StudentSchoolLevel | '';
  audienceDepartment: string;
  audienceClassGroup: string;
  modules: CourseFormModule[];
};

type CourseProgressRecord = {
  learnerKey: string;
  courseId: number;
  selectedLessonId: string | null;
  completedLessonIds: string[];
  passedModuleIds: string[];
  updatedAt: string;
};

type CourseAnalytics = {
  activeLearners: number;
  completedLearners: number;
  averageCompletion: number;
  lastActivity: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

const createLessonForm = (): CourseFormLesson => ({
  title: '',
  summary: '',
  durationMinutes: '8',
  videoUrl: '',
});

const createModuleForm = (): CourseFormModule => ({
  title: '',
  lessons: [createLessonForm()],
});

const createCourseForm = (instructorName: string): CourseFormState => ({
  title: '',
  description: '',
  category: '',
  level: 'Beginner',
  instructor: instructorName,
  skills: '',
  thumbnailUrl: '',
  status: 'draft',
  audienceSchoolLevel: '',
  audienceDepartment: '',
  audienceClassGroup: '',
  modules: [createModuleForm()],
});

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No activity yet';
  }
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPercentage = (value: number) => `${Math.max(0, Math.min(100, Math.round(value)))}%`;

const courseCoverPalettes = [
  'from-[#dbe8ff] via-white to-[#e8f1ff]',
  'from-[#efe3ff] via-white to-[#e6f6ff]',
  'from-[#dff7f0] via-white to-[#edf9ff]',
  'from-[#fff0d9] via-white to-[#fdeef6]',
] as const;

const resolveCourseCoverPalette = (seed: string) => {
  const index = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % courseCoverPalettes.length;
  return courseCoverPalettes[index];
};

const buildInitials = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'SC';

type CourseCoverProps = {
  title: string;
  category: string;
  level: string;
  thumbnailUrl?: string;
  className?: string;
  caption?: string;
};

const CourseCover = ({ title, category, level, thumbnailUrl, className = '', caption }: CourseCoverProps) => {
  if (thumbnailUrl.trim()) {
    return (
      <div className={`overflow-hidden bg-slate-100 ${className}`}>
        <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
      </div>
    );
  }

  const palette = resolveCourseCoverPalette(`${title}-${category}-${level}`);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${palette} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(61,8,186,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_32%)]" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm backdrop-blur">
            <PlayCircleIcon className="h-3.5 w-3.5 text-[#3D08BA]" />
            Course
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/85 text-sm font-semibold text-[#3D08BA] shadow-sm">
            {buildInitials(title)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{category || 'General'}</p>
          <h3 className="mt-2 max-w-[18rem] text-lg font-semibold leading-tight text-slate-900">{title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs text-slate-600 shadow-sm">
              {level || 'All levels'}
            </span>
            {caption ? (
              <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs text-slate-500 shadow-sm">
                {caption}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const summaryCardConfig = [
  {
    id: 'courses',
    label: 'Courses',
    description: 'All school-created courses',
    icon: RectangleStackIcon,
    accentClassName: 'bg-[#3D08BA]/10 text-[#3D08BA]',
  },
  {
    id: 'published',
    label: 'Published',
    description: 'Visible to learners now',
    icon: CheckCircleIcon,
    accentClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'lessons',
    label: 'Lessons',
    description: 'Across all modules',
    icon: BookOpenIcon,
    accentClassName: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'learners',
    label: 'Active learners',
    description: 'Tracked from synced progress',
    icon: UserGroupIcon,
    accentClassName: 'bg-amber-100 text-amber-700',
  },
] as const;

const fetchCourseProgressRecords = async (courseId: number): Promise<CourseProgressRecord[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/learning-progress/course/${courseId}`);
    if (!response.ok) {
      throw new Error('Progress endpoint unavailable');
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as CourseProgressRecord[]) : [];
  } catch {
    return [];
  }
};

const deriveCourseAnalytics = (
  course: SchoolOnlineCourseRecord,
  progressRecords: CourseProgressRecord[]
): CourseAnalytics => {
  const totalLessons = Math.max(1, countSchoolCourseLessons(course));
  const activeLearners = progressRecords.length;
  const completedLearners = progressRecords.filter(
    (record) => (record.completedLessonIds || []).length >= totalLessons
  ).length;
  const averageCompletion =
    activeLearners === 0
      ? 0
      : progressRecords.reduce(
          (sum, record) => sum + Math.min(100, ((record.completedLessonIds || []).length / totalLessons) * 100),
          0
        ) / activeLearners;
  const lastActivity = progressRecords[0]?.updatedAt ? formatDateTime(progressRecords[0].updatedAt) : 'No activity yet';

  return {
    activeLearners,
    completedLearners,
    averageCompletion,
    lastActivity,
  };
};

const toFormState = (course: SchoolOnlineCourseRecord): CourseFormState => ({
  title: course.title,
  description: course.description,
  category: course.category,
  level: course.level,
  instructor: course.instructor,
  skills: course.skills.join(', '),
  thumbnailUrl: course.thumbnailUrl,
  status: course.status,
  audienceSchoolLevel: course.audience.schoolLevel,
  audienceDepartment: course.audience.department,
  audienceClassGroup: course.audience.classGroup,
  modules: course.modules.map((module) => ({
    title: module.title,
    lessons: module.lessons.map((lesson) => ({
      title: lesson.title,
      summary: lesson.summary,
      durationMinutes: String(lesson.durationMinutes),
      videoUrl: lesson.videoUrl,
    })),
  })),
});

const SchoolOnlineCourses = () => {
  const navigate = useNavigate();
  const { schoolName, adminName } = loadSchoolBrandingNames();
  const defaultInstructor = `${adminName || schoolName || 'School'} Academic Team`;
  const [courses, setCourses] = useState<SchoolOnlineCourseRecord[]>([]);
  const [analyticsMap, setAnalyticsMap] = useState<Record<number, CourseAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [form, setForm] = useState<CourseFormState>(() => createCourseForm(defaultInstructor));

  const loadWorkspace = async (nextNotice?: string) => {
    setLoading(true);

    try {
      const payload = await fetchSchoolOnlineCoursesWorkspace();
      const nextCourses = payload.courses;
      setCourses(nextCourses);

      const analyticsEntries = await Promise.all(
        nextCourses.map(async (course) => {
          const progressRecords = await fetchCourseProgressRecords(course.id);
          return [course.id, deriveCourseAnalytics(course, progressRecords)] as const;
        })
      );

      setAnalyticsMap(Object.fromEntries(analyticsEntries));
      setActiveCourseId((current) => current ?? nextCourses[0]?.id ?? null);
      setNotice(nextNotice || '');
    } catch (error) {
      setCourses([]);
      setAnalyticsMap({});
      setActiveCourseId(null);
      setNotice(error instanceof Error ? error.message : 'Could not load school online courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCourses = useMemo(() => {
    const filteredByStatus = statusFilter === 'all' ? courses : courses.filter((course) => course.status === statusFilter);
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) {
      return filteredByStatus;
    }

    return filteredByStatus.filter((course) =>
      [course.title, course.category, course.instructor, course.level, course.description].some((value) =>
        value.toLowerCase().includes(searchTerm)
      )
    );
  }, [courses, query, statusFilter]);

  const activeCourse =
    filteredCourses.find((course) => course.id === activeCourseId) ||
    courses.find((course) => course.id === activeCourseId) ||
    courses[0] ||
    null;

  const summary = useMemo(() => {
    const publishedCount = courses.filter((course) => course.status === 'published').length;
    const totalLessons = courses.reduce((sum, course) => sum + countSchoolCourseLessons(course), 0);

    return {
      courses: courses.length,
      published: publishedCount,
      lessons: totalLessons,
      learners: Object.values(analyticsMap).reduce((sum, analytics) => sum + analytics.activeLearners, 0),
    };
  }, [analyticsMap, courses]);

  const resetForm = () => {
    setEditingCourseId(null);
    setForm(createCourseForm(defaultInstructor));
  };

  const handleThumbnailUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((current) => ({ ...current, thumbnailUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      level: form.level,
      instructor: form.instructor,
      skills: form.skills
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      thumbnailUrl: form.thumbnailUrl,
      status: form.status,
      audience: {
        schoolLevel: form.audienceSchoolLevel,
        department: form.audienceDepartment,
        classGroup: form.audienceClassGroup,
      },
      modules: form.modules.map((module) => ({
        title: module.title,
        lessons: module.lessons.map((lesson) => ({
          title: lesson.title,
          summary: lesson.summary,
          durationMinutes: Number(lesson.durationMinutes) || 1,
          videoUrl: lesson.videoUrl,
        })),
      })),
    };

    try {
      if (editingCourseId) {
        await updateSchoolOnlineCourse(editingCourseId, payload);
        await loadWorkspace('School course updated.');
      } else {
        await createSchoolOnlineCourse(payload);
        await loadWorkspace('School course created.');
      }

      resetForm();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save the course.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (course: SchoolOnlineCourseRecord) => {
    setEditingCourseId(course.id);
    setForm(toFormState(course));
    setActiveCourseId(course.id);
    document.getElementById('school-course-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDelete = async (courseId: number) => {
    await deleteSchoolOnlineCourse(courseId);
    await loadWorkspace('Course removed.');
    if (editingCourseId === courseId) {
      resetForm();
    }
  };

  const handleToggleStatus = async (course: SchoolOnlineCourseRecord) => {
    await updateSchoolOnlineCourseStatus(course.id, course.status === 'published' ? 'draft' : 'published');
    await loadWorkspace(
      course.status === 'published' ? 'Course moved back to draft.' : 'Course published for learners.'
    );
  };

  const updateModule = (moduleIndex: number, updater: (module: CourseFormModule) => CourseFormModule) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.map((module, index) => (index === moduleIndex ? updater(module) : module)),
    }));
  };

  const activeCourseAnalytics =
    activeCourse && analyticsMap[activeCourse.id]
      ? analyticsMap[activeCourse.id]
      : {
          activeLearners: 0,
          completedLearners: 0,
          averageCompletion: 0,
          lastActivity: 'No activity yet',
        };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(61,8,186,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_44%,#f8fafc_100%)] pb-24">
      <main className="mx-auto max-w-[1460px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/85 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="relative border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(61,8,186,0.10),rgba(255,255,255,0.98)_42%,rgba(14,165,233,0.12))] px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.92))]" />
            <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/school-dashboard')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to dashboard
                </button>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#3D08BA]/15 bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D08BA] shadow-sm">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Online Courses
                </div>

                <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  School digital course studio
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  Publish structured lessons, shape the course journey, and keep learner participation visible from one
                  polished school workspace.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      document
                        .getElementById('school-course-builder')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#3D08BA] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(61,8,186,0.8)] transition hover:bg-[#2f0693]"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Create new course
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/mycourses')}
                    className="rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    Preview learner view
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadWorkspace('Course analytics refreshed.')}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Refresh analytics
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Publishing posture
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">Course operations snapshot</h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]">
                    <AcademicCapIcon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Published</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.published}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active learners</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.learners}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{schoolName || 'School workspace'}</p>
                      <p className="mt-1 text-sm text-slate-500">Lead team: {defaultInstructor}</p>
                    </div>
                    <span className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/6 px-3 py-1 text-xs font-semibold text-[#3D08BA]">
                      {summary.courses} total courses
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Lessons prepared</span>
                      <span className="font-semibold text-slate-900">{summary.lessons}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Draft workload</span>
                      <span className="font-semibold text-slate-900">{summary.courses - summary.published}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {notice ? (
            <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700 sm:px-8">{notice}</div>
          ) : null}

          <div className="px-5 py-6 sm:px-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCardConfig.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                          {summary[card.id as keyof typeof summary]}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.accentClassName}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_430px] xl:grid-cols-[minmax(0,1fr)_400px]">
              <section className="grid gap-6">
                <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)] sm:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                          Course catalog
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                          Published and draft courses
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          Review course quality, update publishing state, and move directly into editing without losing
                          context.
                        </p>
                      </div>

                      <label className="relative block w-full lg:max-w-sm">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search title, subject, instructor, or level"
                          className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#3D08BA] focus:bg-white focus:ring-2 focus:ring-[#3D08BA]/10"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: `All courses (${courses.length})` },
                        { value: 'published', label: `Published (${summary.published})` },
                        { value: 'draft', label: `Draft (${summary.courses - summary.published})` },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatusFilter(option.value as 'all' | 'published' | 'draft')}
                          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                            statusFilter === option.value
                              ? 'bg-[#3D08BA] text-white shadow-[0_12px_24px_-18px_rgba(61,8,186,0.8)]'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {loading ? (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        Loading school course catalog...
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                        No course matches this view yet. Create one from the builder to start publishing digital lessons.
                      </div>
                    ) : (
                      filteredCourses.map((course) => {
                        const lessonsCount = countSchoolCourseLessons(course);
                        const analytics = analyticsMap[course.id] || {
                          activeLearners: 0,
                          completedLearners: 0,
                          averageCompletion: 0,
                          lastActivity: 'No activity yet',
                        };

                        return (
                          <article
                            key={course.id}
                            onClick={() => setActiveCourseId(course.id)}
                            className={`cursor-pointer rounded-[30px] border p-4 transition sm:p-5 ${
                              activeCourse?.id === course.id
                                ? 'border-[#3D08BA]/35 bg-[#3D08BA]/[0.03] shadow-[0_20px_45px_-34px_rgba(61,8,186,0.45)]'
                                : 'border-slate-200 bg-slate-50/70 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.4)] hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_250px]">
                              <CourseCover
                                title={course.title}
                                category={course.category}
                                level={course.level}
                                thumbnailUrl={course.thumbnailUrl}
                                caption={`${lessonsCount} lessons`}
                                className="aspect-[4/3] rounded-[26px] border border-slate-200/80"
                              />

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                      course.status === 'published'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {course.status}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    {course.category}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    {course.level}
                                  </span>
                                </div>

                                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">{course.title}</h3>
                                    <p className="mt-2 text-sm text-slate-500">Lead instructor: {course.instructor}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCourseId(course.id)}
                                    className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    Spotlight
                                    <ArrowLeftIcon className="h-4 w-4 rotate-180" />
                                  </button>
                                </div>

                                <p className="mt-3 text-sm leading-7 text-slate-600">{course.description}</p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    {course.modules.length} modules
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    {lessonsCount} lessons
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    {buildSchoolCourseDurationLabel(course)}
                                  </span>
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    Audience: {formatSchoolCourseAudience(course)}
                                  </span>
                                </div>

                                {course.skills.length > 0 ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    {course.skills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="rounded-full border border-[#3D08BA]/15 bg-[#3D08BA]/5 px-3 py-1 text-xs text-[#3D08BA]"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_-34px_rgba(15,23,42,0.4)]">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Learners</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">{analytics.activeLearners}</p>
                                  </div>
                                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Completed</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-900">{analytics.completedLearners}</p>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                    <span>Average completion</span>
                                    <span>{formatPercentage(analytics.averageCompletion)}</span>
                                  </div>
                                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                                    <div
                                      className="h-2 rounded-full bg-gradient-to-r from-[#3D08BA] to-sky-500"
                                      style={{ width: `${Math.max(6, Math.round(analytics.averageCompletion))}%` }}
                                    />
                                  </div>
                                  <p className="mt-3 text-xs text-slate-500">Last activity: {analytics.lastActivity}</p>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(course)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    <PencilSquareIcon className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleStatus(course)}
                                    className="rounded-full border border-[#3D08BA]/20 bg-[#3D08BA]/5 px-4 py-2 text-sm font-semibold text-[#3D08BA] transition hover:bg-[#3D08BA]/10"
                                  >
                                    {course.status === 'published' ? 'Move to draft' : 'Publish'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDelete(course.id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>

              <aside className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
                <form
                  id="school-course-builder"
                  onSubmit={handleSubmit}
                  className="rounded-[30px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)] sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">Course builder</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                        {editingCourseId ? 'Update course' : 'Create course'}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Shape the course experience, keep it polished, then publish only when it is ready for students.
                      </p>
                    </div>
                    {editingCourseId ? (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Clear form
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-5">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Course cover</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Add a clean visual preview so the catalog feels curated instead of text-only.
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#3D08BA] shadow-sm">
                          <PhotoIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <CourseCover
                        title={form.title || 'Untitled course'}
                        category={form.category || 'Course'}
                        level={form.level || 'All levels'}
                        thumbnailUrl={form.thumbnailUrl}
                        caption={form.status === 'published' ? 'Ready for learners' : 'Draft preview'}
                        className="mt-4 aspect-[16/9] rounded-[24px] border border-slate-200"
                      />

                      <div className="mt-4 grid gap-3">
                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-semibold text-slate-700">Thumbnail URL</span>
                          <input
                            type="text"
                            value={form.thumbnailUrl}
                            onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="Optional custom cover image"
                          />
                        </label>
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 self-end rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                          <PhotoIcon className="h-4 w-4" />
                          Upload image
                          <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="w-full hidden" />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Core details</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Keep the headline, positioning, and instructor details clear before building the lessons.
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]">
                          <RectangleStackIcon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4">
                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-semibold text-slate-700">Course title</span>
                          <input
                            type="text"
                            value={form.title}
                            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="STEM Foundations for JSS 2"
                          />
                        </label>

                        <div className="grid gap-4">
                          <label className="grid min-w-0 gap-2">
                            <span className="text-sm font-semibold text-slate-700">Category</span>
                            <input
                              type="text"
                              value={form.category}
                              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                              placeholder="Science"
                            />
                          </label>

                          <label className="grid min-w-0 gap-2">
                            <span className="text-sm font-semibold text-slate-700">Level</span>
                            <input
                              type="text"
                              value={form.level}
                              onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                              placeholder="Intermediate"
                            />
                          </label>
                        </div>

                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-semibold text-slate-700">Lead instructor</span>
                          <input
                            type="text"
                            value={form.instructor}
                            onChange={(event) => setForm((current) => ({ ...current, instructor: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                          />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-semibold text-slate-700">Description</span>
                          <textarea
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="Explain what students will learn and why the course matters."
                          />
                        </label>

                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-semibold text-slate-700">Skills</span>
                          <input
                            type="text"
                            value={form.skills}
                            onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="Problem Solving, Critical Thinking, Revision"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-sm font-semibold text-slate-900">Audience targeting</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Leave these fields empty when the course should be visible to every learner in the school
                        workspace.
                      </p>
                      <div className="mt-4 grid gap-4">
                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-medium text-slate-600">School level</span>
                          <select
                            value={form.audienceSchoolLevel}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                audienceSchoolLevel: event.target.value as StudentSchoolLevel | '',
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                          >
                            <option value="">All levels</option>
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="tertiary">Tertiary</option>
                          </select>
                        </label>
                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-medium text-slate-600">Department</span>
                          <input
                            type="text"
                            value={form.audienceDepartment}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, audienceDepartment: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="Science"
                          />
                        </label>
                        <label className="grid min-w-0 gap-2">
                          <span className="text-sm font-medium text-slate-600">Class group</span>
                          <input
                            type="text"
                            value={form.audienceClassGroup}
                            onChange={(event) =>
                              setForm((current) => ({ ...current, audienceClassGroup: event.target.value }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                            placeholder="JSS 2 Blue"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Modules and lessons</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Build the learning flow the same way students will consume it.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              modules: [...current.modules, createModuleForm()],
                            }))
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add module
                        </button>
                      </div>

                      <div className="mt-4 grid gap-4">
                        {form.modules.map((module, moduleIndex) => (
                          <div key={`module-${moduleIndex}`} className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <label className="grid min-w-0 flex-1 gap-2">
                                <span className="text-sm font-semibold text-slate-700">Module title</span>
                                <input
                                  type="text"
                                  value={module.title}
                                  onChange={(event) =>
                                    updateModule(moduleIndex, (current) => ({ ...current, title: event.target.value }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                                  placeholder={`Module ${moduleIndex + 1}`}
                                />
                              </label>
                              {form.modules.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      modules: current.modules.filter((_, index) => index !== moduleIndex),
                                    }))
                                  }
                                  className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  Remove module
                                </button>
                              ) : null}
                            </div>

                            <div className="mt-4 grid gap-4">
                              {module.lessons.map((lesson, lessonIndex) => (
                                <div
                                  key={`module-${moduleIndex}-lesson-${lessonIndex}`}
                                  className="rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <span className="rounded-full border border-[#3D08BA]/12 bg-[#3D08BA]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#3D08BA]">
                                      Lesson {lessonIndex + 1}
                                    </span>
                                    {module.lessons.length > 1 ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateModule(moduleIndex, (current) => ({
                                            ...current,
                                            lessons: current.lessons.filter((_, index) => index !== lessonIndex),
                                          }))
                                        }
                                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                      >
                                        Remove lesson
                                      </button>
                                    ) : null}
                                  </div>

                                  <div className="grid gap-4">
                                    <div className="grid gap-4">
                                      <label className="grid min-w-0 gap-2">
                                        <span className="text-sm font-medium text-slate-700">Lesson title</span>
                                        <input
                                          type="text"
                                          value={lesson.title}
                                          onChange={(event) =>
                                            updateModule(moduleIndex, (current) => ({
                                              ...current,
                                              lessons: current.lessons.map((entry, index) =>
                                                index === lessonIndex ? { ...entry, title: event.target.value } : entry
                                              ),
                                            }))
                                          }
                                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                                          placeholder={`Lesson ${lessonIndex + 1}`}
                                        />
                                      </label>
                                      <label className="grid min-w-0 gap-2">
                                        <span className="text-sm font-medium text-slate-700">Minutes</span>
                                        <input
                                          type="number"
                                          min="1"
                                          value={lesson.durationMinutes}
                                          onChange={(event) =>
                                            updateModule(moduleIndex, (current) => ({
                                              ...current,
                                              lessons: current.lessons.map((entry, index) =>
                                                index === lessonIndex
                                                  ? { ...entry, durationMinutes: event.target.value }
                                                  : entry
                                              ),
                                            }))
                                          }
                                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                                        />
                                      </label>
                                    </div>

                                    <label className="grid min-w-0 gap-2">
                                      <span className="text-sm font-medium text-slate-700">Lesson summary</span>
                                      <textarea
                                        rows={3}
                                        value={lesson.summary}
                                        onChange={(event) =>
                                          updateModule(moduleIndex, (current) => ({
                                            ...current,
                                            lessons: current.lessons.map((entry, index) =>
                                              index === lessonIndex ? { ...entry, summary: event.target.value } : entry
                                            ),
                                          }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                                        placeholder="Explain what happens in this lesson."
                                      />
                                    </label>

                                    <label className="grid min-w-0 gap-2">
                                      <span className="text-sm font-medium text-slate-700">Video URL</span>
                                      <input
                                        type="text"
                                        value={lesson.videoUrl}
                                        onChange={(event) =>
                                          updateModule(moduleIndex, (current) => ({
                                            ...current,
                                            lessons: current.lessons.map((entry, index) =>
                                              index === lessonIndex ? { ...entry, videoUrl: event.target.value } : entry
                                            ),
                                          }))
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                                        placeholder="Optional. Leave blank to use the default lesson video."
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-4 flex flex-wrap justify-between gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateModule(moduleIndex, (current) => ({
                                          ...current,
                                          lessons: [...current.lessons, createLessonForm()],
                                        }))
                                      }
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                      Add lesson
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Publication state</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Draft keeps the course private. Publish makes it available to matching students.
                          </p>
                        </div>
                        <select
                          value={form.status}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              status: event.target.value as SchoolOnlineCourseRecord['status'],
                            }))
                          }
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3D08BA] focus:ring-2 focus:ring-[#3D08BA]/10"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-full bg-[#3D08BA] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(61,8,186,0.8)] transition hover:bg-[#2f0693] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving course...' : editingCourseId ? 'Update course' : 'Create course'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/mycourses')}
                      className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Preview learner view
                    </button>
                  </div>
                </form>

                {activeCourse ? (
                  <div className="rounded-[30px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.35)] sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3D08BA]">
                          Course spotlight
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{activeCourse.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{activeCourse.description}</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3D08BA]/8 text-[#3D08BA]">
                        <BookOpenIcon className="h-5 w-5" />
                      </div>
                    </div>

                    <CourseCover
                      title={activeCourse.title}
                      category={activeCourse.category}
                      level={activeCourse.level}
                      thumbnailUrl={activeCourse.thumbnailUrl}
                      caption={buildSchoolCourseDurationLabel(activeCourse)}
                      className="mt-4 aspect-video rounded-[26px] border border-slate-200"
                    />

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Active learners</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{activeCourseAnalytics.activeLearners}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Completed learners</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                          {activeCourseAnalytics.completedLearners}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Average completion</span>
                        <span>{formatPercentage(activeCourseAnalytics.averageCompletion)}</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#3D08BA] to-sky-500"
                          style={{ width: `${Math.max(6, Math.round(activeCourseAnalytics.averageCompletion))}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-slate-500">Last activity: {activeCourseAnalytics.lastActivity}</p>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Instructor:</span> {activeCourse.instructor}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Audience:</span>{' '}
                        {formatSchoolCourseAudience(activeCourse)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Runtime:</span>{' '}
                        {buildSchoolCourseDurationLabel(activeCourse)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">Last updated:</span>{' '}
                        {formatDateTime(activeCourse.updatedAt)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </section>
      </main>
      <NavBar />
    </div>
  );
};

export default SchoolOnlineCourses;
