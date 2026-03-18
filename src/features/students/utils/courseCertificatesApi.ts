import { type RecordedCourse } from '../data/recordedCourses';
import { loadStudentIdentity } from './studentIdentity';
import { loadPersistedAuthEmail, loadSchoolBrandingNames, loadSchoolProfileImage } from '../../../utils/schoolBranding';
import { loadTutorBranding } from '../../../utils/tutorBranding';

export type CourseCertificateIssuerType = 'edamaa' | 'school' | 'tutor';

export type CourseCertificateRecord = {
  id: string;
  certificateCode: string;
  verificationCode: string;
  learnerKey: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseTitle: string;
  courseCategory: string;
  instructorName: string;
  issuerType: CourseCertificateIssuerType;
  issuerName: string;
  issuerLogoDataUrl: string;
  issuerInitials: string;
  issuerRoleLabel: string;
  certificateTitle: string;
  achievementLine: string;
  issueDate: string;
  completionDate: string;
  issuedAt: string;
  durationLabel: string;
  totalLessons: number;
  completedLessons: number;
  moduleCount: number;
  passedModules: number;
};

type CourseBrandOwner = {
  issuerType: CourseCertificateIssuerType;
  fallbackName?: string;
  roleLabel: string;
};

const STORAGE_KEY = 'edamaa_course_certificates_v1';

const COURSE_BRAND_OVERRIDES: Record<number, CourseBrandOwner> = {
  1: { issuerType: 'tutor', roleLabel: 'Course tutor' },
  2: { issuerType: 'school', fallbackName: 'Edamaa Science Academy', roleLabel: 'School academic office' },
  3: { issuerType: 'tutor', roleLabel: 'Course tutor' },
  4: { issuerType: 'edamaa', fallbackName: 'Edamaa3D', roleLabel: 'Platform issuer' },
  5: { issuerType: 'school', fallbackName: 'Edamaa Scholars College', roleLabel: 'School academic office' },
  6: { issuerType: 'tutor', roleLabel: 'Course tutor' },
};

const normalizeText = (value: unknown) => String(value || '').trim();

const makeId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const deriveInitials = (value: string) => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return initials || 'ED';
};

const readStore = (): CourseCertificateRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? (parsed as CourseCertificateRecord[]) : [];
  } catch {
    return [];
  }
};

const writeStore = (records: CourseCertificateRecord[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const resolveStudentScope = () => {
  const studentIdentity = loadStudentIdentity();
  const studentEmail = loadPersistedAuthEmail();
  return {
    studentIdentity,
    studentEmail,
  };
};

const resolveIssuerSnapshot = (course: RecordedCourse) => {
  const override = COURSE_BRAND_OVERRIDES[course.id] || {
    issuerType: 'tutor' as CourseCertificateIssuerType,
    roleLabel: 'Course tutor',
  };

  if (override.issuerType === 'school') {
    const schoolBranding = loadSchoolBrandingNames();
    const issuerName = schoolBranding.schoolName || override.fallbackName || 'School';
    return {
      issuerType: 'school' as const,
      issuerName,
      issuerLogoDataUrl: loadSchoolProfileImage(),
      issuerInitials: deriveInitials(issuerName),
      issuerRoleLabel: override.roleLabel,
    };
  }

  if (override.issuerType === 'edamaa') {
    const issuerName = override.fallbackName || 'Edamaa3D';
    return {
      issuerType: 'edamaa' as const,
      issuerName,
      issuerLogoDataUrl: '',
      issuerInitials: 'E3',
      issuerRoleLabel: override.roleLabel,
    };
  }

  const tutorBranding = loadTutorBranding();
  const issuerName = tutorBranding.displayName || course.instructor || override.fallbackName || 'Tutor';
  return {
    issuerType: 'tutor' as const,
    issuerName,
    issuerLogoDataUrl: tutorBranding.profileImage,
    issuerInitials: tutorBranding.initials || deriveInitials(issuerName),
    issuerRoleLabel: override.roleLabel,
  };
};

const buildAchievementLine = (course: RecordedCourse) => `for successfully completing ${course.title}`;

const buildCertificateCode = (records: CourseCertificateRecord[]) => {
  const year = new Date().getFullYear();
  const nextIndex = records.filter((record) => record.certificateCode.includes(String(year))).length + 1;
  return `EDA-COURSE-${year}-${String(nextIndex).padStart(4, '0')}`;
};

const isEligibleForCourseCertificate = (
  course: RecordedCourse,
  completedLessonIds: string[],
  passedModuleIds: string[]
) => {
  const allLessons = course.modules.flatMap((module) => module.lessons);
  const uniqueCompletedLessons = new Set(completedLessonIds.map((item) => normalizeText(item)));
  const uniquePassedModules = new Set(passedModuleIds.map((item) => normalizeText(item)));
  const allLessonsCompleted = allLessons.length > 0 && allLessons.every((lesson) => uniqueCompletedLessons.has(lesson.id));
  const allModulesPassed = course.modules.length > 0 && course.modules.every((module) => uniquePassedModules.has(module.id));
  return allLessonsCompleted && allModulesPassed;
};

export const fetchStudentCourseCertificates = async () => {
  const { studentIdentity, studentEmail } = resolveStudentScope();
  const records = readStore()
    .filter(
      (record) =>
        record.studentId === studentIdentity.id ||
        (studentEmail && record.studentEmail === studentEmail)
    )
    .sort((left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime());

  const summary = {
    total: records.length,
    schoolIssued: records.filter((record) => record.issuerType === 'school').length,
    tutorIssued: records.filter((record) => record.issuerType === 'tutor').length,
    edamaaIssued: records.filter((record) => record.issuerType === 'edamaa').length,
  };

  return { certificates: records, summary };
};

export const getStudentCourseCertificateForCourse = (courseId: number, learnerKey?: string) => {
  const { studentIdentity, studentEmail } = resolveStudentScope();
  const normalizedLearnerKey = normalizeText(learnerKey);
  const records = readStore();
  return (
    records.find(
      (record) =>
        record.courseId === courseId &&
        (record.learnerKey === normalizedLearnerKey || record.studentId === studentIdentity.id || (studentEmail && record.studentEmail === studentEmail))
    ) || null
  );
};

export const issueCourseCertificateIfEligible = async (input: {
  learnerKey: string;
  course: RecordedCourse;
  completedLessonIds: string[];
  passedModuleIds: string[];
}) => {
  const { learnerKey, course, completedLessonIds, passedModuleIds } = input;
  if (!isEligibleForCourseCertificate(course, completedLessonIds, passedModuleIds)) {
    return {
      eligible: false,
      issuedNow: false,
      certificate: null,
    };
  }

  const existing = getStudentCourseCertificateForCourse(course.id, learnerKey);
  if (existing) {
    return {
      eligible: true,
      issuedNow: false,
      certificate: existing,
    };
  }

  const { studentIdentity, studentEmail } = resolveStudentScope();
  const issuer = resolveIssuerSnapshot(course);
  const records = readStore();
  const completionDate = new Date().toISOString();
  const certificate: CourseCertificateRecord = {
    id: makeId('COURSE_CERT'),
    certificateCode: buildCertificateCode(records),
    verificationCode: makeId('VERIFY').toUpperCase(),
    learnerKey: normalizeText(learnerKey),
    studentId: studentIdentity.id,
    studentName: studentIdentity.name,
    studentEmail,
    courseId: course.id,
    courseTitle: course.title,
    courseCategory: course.category,
    instructorName: course.instructor,
    issuerType: issuer.issuerType,
    issuerName: issuer.issuerName,
    issuerLogoDataUrl: issuer.issuerLogoDataUrl,
    issuerInitials: issuer.issuerInitials,
    issuerRoleLabel: issuer.issuerRoleLabel,
    certificateTitle: 'Certificate of Completion',
    achievementLine: buildAchievementLine(course),
    issueDate: completionDate,
    completionDate,
    issuedAt: completionDate,
    durationLabel: course.duration,
    totalLessons: course.totalLessons,
    completedLessons: completedLessonIds.length,
    moduleCount: course.modules.length,
    passedModules: passedModuleIds.length,
  };

  writeStore([certificate, ...records]);
  return {
    eligible: true,
    issuedNow: true,
    certificate,
  };
};

export const buildCourseCertificateDocDefinition = (certificate: CourseCertificateRecord) => {
  const accentColor =
    certificate.issuerType === 'school'
      ? '#3D08BA'
      : certificate.issuerType === 'tutor'
        ? '#0f766e'
        : '#1d4ed8';

  const logoBlock = certificate.issuerLogoDataUrl
    ? {
        image: certificate.issuerLogoDataUrl,
        fit: [58, 58],
        alignment: 'center',
        margin: [0, 4, 0, 6],
      }
    : {
        table: {
          widths: [58],
          body: [
            [
              {
                text: certificate.issuerInitials,
                alignment: 'center',
                color: '#ffffff',
                bold: true,
                fillColor: accentColor,
                fontSize: 22,
                margin: [0, 16, 0, 16],
              },
            ],
          ],
        },
        layout: 'noBorders',
      };

  return {
    pageSize: 'A4',
    pageMargins: [26, 28, 26, 28],
    background: [
      {
        canvas: [
          { type: 'rect', x: 18, y: 18, w: 559, h: 806, r: 20, lineColor: accentColor, lineWidth: 2 },
          { type: 'rect', x: 28, y: 28, w: 539, h: 786, r: 16, lineColor: '#cbd5e1', lineWidth: 1 },
        ],
      },
    ],
    content: [
      { stack: [logoBlock], margin: [0, 0, 0, 2] },
      { text: certificate.issuerName, alignment: 'center', fontSize: 24, bold: true, color: '#0f172a', margin: [0, 4, 0, 4] },
      { text: 'Issued via Edamaa3D', alignment: 'center', fontSize: 10, bold: true, color: '#64748b', margin: [0, 0, 0, 18] },
      { text: certificate.certificateTitle, alignment: 'center', fontSize: 30, bold: true, color: accentColor, margin: [0, 14, 0, 22] },
      { text: 'This is to certify that', alignment: 'center', fontSize: 14, color: '#475569', margin: [0, 0, 0, 10] },
      { text: certificate.studentName, alignment: 'center', fontSize: 28, bold: true, color: '#0f172a', margin: [0, 0, 0, 12] },
      { text: certificate.achievementLine, alignment: 'center', fontSize: 14, color: '#334155', margin: [40, 0, 40, 10] },
      { text: `Course: ${certificate.courseTitle}`, alignment: 'center', fontSize: 12, color: '#475569', margin: [0, 0, 0, 6] },
      { text: `Category: ${certificate.courseCategory} • Duration: ${certificate.durationLabel}`, alignment: 'center', fontSize: 12, color: '#475569', margin: [0, 0, 0, 24] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Completion date', fontSize: 10, color: '#64748b', bold: true, margin: [0, 0, 0, 4] },
              { text: formatDate(certificate.completionDate), fontSize: 13, color: '#0f172a' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Certificate code', fontSize: 10, color: '#64748b', bold: true, margin: [0, 0, 0, 4] },
              { text: certificate.certificateCode, fontSize: 13, color: '#0f172a' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Verification code', fontSize: 10, color: '#64748b', bold: true, margin: [0, 0, 0, 4] },
              { text: certificate.verificationCode, fontSize: 13, color: '#0f172a' },
            ],
          },
        ],
        columnGap: 18,
        margin: [34, 0, 34, 28],
      },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: `Lessons completed: ${certificate.completedLessons}/${certificate.totalLessons}`, fontSize: 11, color: '#334155', margin: [10, 10, 10, 10] },
              { text: `Module checkpoints passed: ${certificate.passedModules}/${certificate.moduleCount}`, fontSize: 11, color: '#334155', margin: [10, 10, 10, 10] },
            ],
          ],
        },
        layout: {
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
        },
        margin: [34, 0, 34, 34],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineColor: '#94a3b8', lineWidth: 0.8 }] },
              { text: certificate.issuerName, fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 2] },
              { text: certificate.issuerRoleLabel, fontSize: 10, color: '#64748b' },
            ],
          },
          {
            width: '*',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineColor: '#94a3b8', lineWidth: 0.8 }] },
              { text: 'Edamaa3D', fontSize: 12, bold: true, color: '#0f172a', margin: [0, 8, 0, 2] },
              { text: 'Platform verification layer', fontSize: 10, color: '#64748b' },
            ],
          },
        ],
        columnGap: 32,
        margin: [34, 0, 34, 0],
      },
    ],
    footer: {
      margin: [28, 10, 28, 14],
      columns: [
        { text: `${certificate.issuerName} • Issued via Edamaa3D`, color: '#64748b', fontSize: 9 },
        { text: certificate.verificationCode, alignment: 'right', color: '#64748b', fontSize: 9 },
      ],
    },
  };
};
