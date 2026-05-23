import {
  loadPersistedAuthEmail,
  loadSchoolBrandingNames,
  loadSchoolWorkspaceKey,
} from '../../../utils/schoolBranding';
import { loadStudentIdentity, type StudentSchoolLevel } from '../../students/utils/studentIdentity';

export type SchoolOnlineCourseLesson = {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  videoUrl: string;
};

export type SchoolOnlineCourseModule = {
  id: string;
  title: string;
  lessons: SchoolOnlineCourseLesson[];
};

export type SchoolOnlineCourseAudience = {
  schoolLevel: StudentSchoolLevel | '';
  department: string;
  classGroup: string;
};

export type SchoolOnlineCourseRecord = {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  skills: string[];
  thumbnailUrl: string;
  modules: SchoolOnlineCourseModule[];
  audience: SchoolOnlineCourseAudience;
  issuerType: 'school';
  issuerName: string;
  schoolWorkspaceKey: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type SchoolOnlineCoursesWorkspace = {
  courses: SchoolOnlineCourseRecord[];
};

type SchoolOnlineCourseUpsertInput = {
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  skills: string[];
  thumbnailUrl?: string;
  modules: Array<{
    title: string;
    lessons: Array<{
      title: string;
      summary: string;
      durationMinutes: number;
      videoUrl?: string;
    }>;
  }>;
  audience?: Partial<SchoolOnlineCourseAudience>;
  status?: SchoolOnlineCourseRecord['status'];
};

const STORAGE_KEY = 'edamaa_school_online_courses_v1';
const DEFAULT_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildStorageWorkspaceKey = () => {
  const workspaceKey = normalizeSlug(loadSchoolWorkspaceKey());
  if (workspaceKey) {
    return workspaceKey;
  }

  const emailPrefix = normalizeSlug((loadPersistedAuthEmail() || '').split('@')[0] || '');
  return emailPrefix || 'school-workspace';
};

const readStore = (): Record<string, SchoolOnlineCoursesWorkspace> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, SchoolOnlineCoursesWorkspace>)
      : {};
  } catch {
    return {};
  }
};

const writeStore = (value: Record<string, SchoolOnlineCoursesWorkspace>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota/privacy issues in local mode.
  }
};

const createThumbnailDataUrl = (title: string, category: string, issuerName: string) => {
  const safeTitle = normalizeText(title) || 'School Course';
  const safeCategory = normalizeText(category) || 'Digital Learning';
  const safeIssuer = normalizeText(issuerName) || 'School';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3D08BA" />
          <stop offset="55%" stop-color="#1D4ED8" />
          <stop offset="100%" stop-color="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)" rx="42" />
      <circle cx="1020" cy="120" r="88" fill="rgba(255,255,255,0.14)" />
      <circle cx="150" cy="560" r="120" fill="rgba(255,255,255,0.10)" />
      <rect x="72" y="72" width="220" height="40" rx="20" fill="rgba(255,255,255,0.16)" />
      <text x="94" y="98" font-family="Arial, sans-serif" font-size="18" fill="#F8FAFC">${safeCategory}</text>
      <text x="72" y="240" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#FFFFFF">${safeTitle}</text>
      <text x="72" y="312" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.88)">Published by ${safeIssuer}</text>
      <rect x="72" y="510" width="250" height="54" rx="27" fill="rgba(255,255,255,0.18)" />
      <text x="104" y="545" font-family="Arial, sans-serif" font-size="22" fill="#FFFFFF">Edamaa Online Course</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const ensureAudience = (input?: Partial<SchoolOnlineCourseAudience>): SchoolOnlineCourseAudience => ({
  schoolLevel:
    input?.schoolLevel === 'primary' ||
    input?.schoolLevel === 'secondary' ||
    input?.schoolLevel === 'tertiary' ||
    input?.schoolLevel === ''
      ? input.schoolLevel
      : '',
  department: normalizeText(input?.department),
  classGroup: normalizeText(input?.classGroup),
});

const sanitizeModules = (modules: SchoolOnlineCourseUpsertInput['modules']): SchoolOnlineCourseModule[] =>
  modules
    .map((module, moduleIndex) => ({
      id: `module-${Date.now().toString(36)}-${moduleIndex}-${Math.random().toString(36).slice(2, 7)}`,
      title: normalizeText(module.title) || `Module ${moduleIndex + 1}`,
      lessons: module.lessons
        .map((lesson, lessonIndex) => ({
          id: `lesson-${Date.now().toString(36)}-${moduleIndex}-${lessonIndex}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          title: normalizeText(lesson.title) || `Lesson ${lessonIndex + 1}`,
          summary: normalizeText(lesson.summary) || 'Lesson summary will appear here.',
          durationMinutes: Math.max(1, Number(lesson.durationMinutes) || 1),
          videoUrl: normalizeText(lesson.videoUrl) || DEFAULT_VIDEO_URL,
        }))
        .filter((lesson) => lesson.title),
    }))
    .filter((module) => module.title && module.lessons.length > 0);

const cloneCourse = (course: SchoolOnlineCourseRecord): SchoolOnlineCourseRecord => ({
  ...course,
  skills: [...course.skills],
  audience: { ...course.audience },
  modules: course.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => ({ ...lesson })),
  })),
});

const getWorkspace = () => {
  const store = readStore();
  const workspaceKey = buildStorageWorkspaceKey();
  const existing = store[workspaceKey];
  return {
    store,
    workspaceKey,
    workspace: existing
      ? {
          courses: existing.courses.map(cloneCourse),
        }
      : {
          courses: [],
        },
  };
};

const saveWorkspace = (
  store: Record<string, SchoolOnlineCoursesWorkspace>,
  workspaceKey: string,
  workspace: SchoolOnlineCoursesWorkspace
) => {
  store[workspaceKey] = {
    courses: workspace.courses.map(cloneCourse),
  };
  writeStore(store);
};

const countLessons = (course: Pick<SchoolOnlineCourseRecord, 'modules'>) =>
  course.modules.reduce((total, module) => total + module.lessons.length, 0);

export const fetchSchoolOnlineCoursesWorkspace = async () => {
  const { workspace } = getWorkspace();
  return {
    courses: workspace.courses
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
  };
};

export const createSchoolOnlineCourse = async (input: SchoolOnlineCourseUpsertInput) => {
  const title = normalizeText(input.title);
  if (!title) {
    throw new Error('Course title is required.');
  }

  const modules = sanitizeModules(input.modules || []);
  if (modules.length === 0) {
    throw new Error('Add at least one module with one lesson.');
  }

  const { schoolName } = loadSchoolBrandingNames();
  const { store, workspaceKey, workspace } = getWorkspace();
  const now = new Date().toISOString();
  const status = input.status === 'published' ? 'published' : 'draft';

  const course: SchoolOnlineCourseRecord = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    title,
    description: normalizeText(input.description),
    category: normalizeText(input.category) || 'General',
    level: normalizeText(input.level) || 'Beginner',
    instructor: normalizeText(input.instructor) || `${schoolName || 'School'} Academic Team`,
    skills: Array.from(new Set((input.skills || []).map((item) => normalizeText(item)).filter(Boolean))),
    thumbnailUrl:
      normalizeText(input.thumbnailUrl) || createThumbnailDataUrl(title, normalizeText(input.category), schoolName),
    modules,
    audience: ensureAudience(input.audience),
    issuerType: 'school',
    issuerName: schoolName || 'School',
    schoolWorkspaceKey: workspaceKey,
    status,
    createdAt: now,
    updatedAt: now,
    publishedAt: status === 'published' ? now : null,
  };

  workspace.courses.unshift(course);
  saveWorkspace(store, workspaceKey, workspace);
  return cloneCourse(course);
};

export const updateSchoolOnlineCourse = async (courseId: number, input: SchoolOnlineCourseUpsertInput) => {
  const { schoolName } = loadSchoolBrandingNames();
  const { store, workspaceKey, workspace } = getWorkspace();
  const course = workspace.courses.find((entry) => entry.id === courseId) || null;

  if (!course) {
    throw new Error('The selected course could not be found.');
  }

  const title = normalizeText(input.title);
  if (!title) {
    throw new Error('Course title is required.');
  }

  const modules = sanitizeModules(input.modules || []);
  if (modules.length === 0) {
    throw new Error('Add at least one module with one lesson.');
  }

  const nextStatus = input.status === 'published' ? 'published' : 'draft';
  course.title = title;
  course.description = normalizeText(input.description);
  course.category = normalizeText(input.category) || course.category;
  course.level = normalizeText(input.level) || course.level;
  course.instructor = normalizeText(input.instructor) || course.instructor;
  course.skills = Array.from(new Set((input.skills || []).map((item) => normalizeText(item)).filter(Boolean)));
  course.thumbnailUrl =
    normalizeText(input.thumbnailUrl) || createThumbnailDataUrl(title, course.category, schoolName || 'School');
  course.modules = modules;
  course.audience = ensureAudience(input.audience);
  course.issuerName = schoolName || course.issuerName || 'School';
  course.schoolWorkspaceKey = workspaceKey;
  course.status = nextStatus;
  course.updatedAt = new Date().toISOString();
  course.publishedAt = nextStatus === 'published' ? course.publishedAt || course.updatedAt : null;

  saveWorkspace(store, workspaceKey, workspace);
  return cloneCourse(course);
};

export const deleteSchoolOnlineCourse = async (courseId: number) => {
  const { store, workspaceKey, workspace } = getWorkspace();
  workspace.courses = workspace.courses.filter((course) => course.id !== courseId);
  saveWorkspace(store, workspaceKey, workspace);
  return {
    courses: workspace.courses.map(cloneCourse),
  };
};

export const updateSchoolOnlineCourseStatus = async (
  courseId: number,
  status: SchoolOnlineCourseRecord['status']
) => {
  const { store, workspaceKey, workspace } = getWorkspace();
  const course = workspace.courses.find((entry) => entry.id === courseId) || null;

  if (!course) {
    throw new Error('The selected course could not be found.');
  }

  course.status = status;
  course.updatedAt = new Date().toISOString();
  course.publishedAt = status === 'published' ? course.publishedAt || course.updatedAt : null;

  saveWorkspace(store, workspaceKey, workspace);
  return cloneCourse(course);
};

const matchesAudience = (course: SchoolOnlineCourseRecord) => {
  const identity = loadStudentIdentity();
  const normalizedDepartment = normalizeText(identity.department).toLowerCase();
  const normalizedClassGroup = normalizeText(identity.classGroup).toLowerCase();

  if (course.audience.schoolLevel && course.audience.schoolLevel !== (identity.schoolLevel || '')) {
    return false;
  }

  if (course.audience.department && normalizeText(course.audience.department).toLowerCase() !== normalizedDepartment) {
    return false;
  }

  if (course.audience.classGroup && normalizeText(course.audience.classGroup).toLowerCase() !== normalizedClassGroup) {
    return false;
  }

  return true;
};

export const loadPublishedSchoolOnlineCoursesForStudent = () => {
  const { workspace } = getWorkspace();
  return workspace.courses
    .filter((course) => course.status === 'published')
    .filter(matchesAudience)
    .sort((left, right) => new Date(right.publishedAt || right.updatedAt).getTime() - new Date(left.publishedAt || left.updatedAt).getTime())
    .map(cloneCourse);
};

export const countSchoolCourseLessons = countLessons;

export const formatSchoolCourseAudience = (course: Pick<SchoolOnlineCourseRecord, 'audience'>) => {
  const parts = [
    course.audience.schoolLevel ? `${course.audience.schoolLevel} level` : '',
    course.audience.department,
    course.audience.classGroup,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' • ') : 'All enrolled learners';
};

export const buildSchoolCourseDurationLabel = (course: Pick<SchoolOnlineCourseRecord, 'modules'>) => {
  const totalMinutes = course.modules.reduce(
    (sum, module) => sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.durationMinutes, 0),
    0
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${Math.max(1, totalMinutes)} min`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};
