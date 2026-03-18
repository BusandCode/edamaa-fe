import { loadPersistedLocalDevAuthSession } from '../../../utils/authSession';

export type SchoolCertificateTemplateId = 'completion' | 'excellence' | 'attendance' | 'graduation';

export type SchoolCertificateTemplate = {
  id: SchoolCertificateTemplateId;
  label: string;
  shortLabel: string;
  defaultTitle: string;
  description: string;
  accent: string;
};

export type SchoolCertificateRecord = {
  id: string;
  serialNumber: string;
  templateId: SchoolCertificateTemplateId;
  templateLabel: string;
  certificateTitle: string;
  programName: string;
  achievement: string;
  studentName: string;
  studentEmail: string;
  admissionNumber: string;
  department: string;
  classGroup: string;
  issueDate: string;
  signatoryName: string;
  signatoryRole: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SchoolCertificatesSummary = {
  totalIssued: number;
  issuedThisMonth: number;
  uniqueStudents: number;
  completionCount: number;
};

export type CreateSchoolCertificateInput = {
  templateId: SchoolCertificateTemplateId;
  certificateTitle: string;
  programName?: string;
  achievement?: string;
  studentName: string;
  studentEmail?: string;
  admissionNumber?: string;
  department?: string;
  classGroup?: string;
  issueDate: string;
  signatoryName: string;
  signatoryRole: string;
  notes?: string;
};

export type UpdateSchoolCertificateInput = CreateSchoolCertificateInput;

const STORAGE_KEY = 'edamaa_school_certificates_v1';

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeEmail = (value: unknown) => normalizeText(value).toLowerCase();

const makeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const certificateTemplates: SchoolCertificateTemplate[] = [
  {
    id: 'completion',
    label: 'Course completion',
    shortLabel: 'Completion',
    defaultTitle: 'Certificate of Completion',
    description: 'Use when a student successfully completes a course, class, or learning program.',
    accent: '#3D08BA',
  },
  {
    id: 'excellence',
    label: 'Academic excellence',
    shortLabel: 'Excellence',
    defaultTitle: 'Certificate of Academic Excellence',
    description: 'Use for high performance, best results, or outstanding subject achievement.',
    accent: '#0f766e',
  },
  {
    id: 'attendance',
    label: 'Perfect attendance',
    shortLabel: 'Attendance',
    defaultTitle: 'Certificate of Excellent Attendance',
    description: 'Use when a student maintains strong class attendance and punctuality.',
    accent: '#b45309',
  },
  {
    id: 'graduation',
    label: 'Graduation / promotion',
    shortLabel: 'Graduation',
    defaultTitle: 'Certificate of Graduation',
    description: 'Use for graduation, promotion to a new level, or completion of a school stage.',
    accent: '#1d4ed8',
  },
];

export const schoolCertificateTemplates = certificateTemplates;

const getTemplateById = (templateId: SchoolCertificateTemplateId) =>
  certificateTemplates.find((template) => template.id === templateId) || certificateTemplates[0];

const getSchoolStorageScope = () => {
  if (typeof window === 'undefined') {
    return 'school';
  }

  const localDevSession = loadPersistedLocalDevAuthSession();
  if (localDevSession?.email) {
    return normalizeEmail(localDevSession.email);
  }

  const schoolName = normalizeText(window.localStorage.getItem('edamaa_school_display_name'));
  return schoolName ? `school:${schoolName.toLowerCase()}` : 'school';
};

const readStore = (): Record<string, SchoolCertificateRecord[]> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }
    const parsed = JSON.parse(rawValue) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed as Record<string, SchoolCertificateRecord[]>;
  } catch {
    return {};
  }
};

const writeStore = (value: Record<string, SchoolCertificateRecord[]>) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

const getScopedCertificates = () => {
  const scope = getSchoolStorageScope();
  const store = readStore();
  const records = Array.isArray(store[scope]) ? store[scope] : [];
  return {
    scope,
    store,
    records: records
      .map((record) => ({
        id: normalizeText(record.id),
        serialNumber: normalizeText(record.serialNumber),
        templateId: (normalizeText(record.templateId) as SchoolCertificateTemplateId) || 'completion',
        templateLabel: normalizeText(record.templateLabel),
        certificateTitle: normalizeText(record.certificateTitle),
        programName: normalizeText(record.programName),
        achievement: normalizeText(record.achievement),
        studentName: normalizeText(record.studentName),
        studentEmail: normalizeEmail(record.studentEmail),
        admissionNumber: normalizeText(record.admissionNumber),
        department: normalizeText(record.department),
        classGroup: normalizeText(record.classGroup),
        issueDate: normalizeText(record.issueDate),
        signatoryName: normalizeText(record.signatoryName),
        signatoryRole: normalizeText(record.signatoryRole),
        notes: normalizeText(record.notes),
        createdAt: normalizeText(record.createdAt),
        updatedAt: normalizeText(record.updatedAt),
      }))
      .filter((record) => record.id),
  };
};

const writeScopedCertificates = (scope: string, store: Record<string, SchoolCertificateRecord[]>, records: SchoolCertificateRecord[]) => {
  store[scope] = records;
  writeStore(store);
};

const buildSerialNumber = (existingRecords: SchoolCertificateRecord[]) => {
  const year = new Date().getFullYear();
  const yearRecords = existingRecords.filter((record) => record.serialNumber.includes(String(year)));
  const nextIndex = yearRecords.length + 1;
  return `EDA-CERT-${year}-${String(nextIndex).padStart(4, '0')}`;
};

const buildSummary = (records: SchoolCertificateRecord[]): SchoolCertificatesSummary => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const uniqueStudents = new Set(
    records.map((record) => normalizeEmail(record.studentEmail) || normalizeText(record.studentName).toLowerCase())
  );

  return {
    totalIssued: records.length,
    issuedThisMonth: records.filter((record) => {
      const issuedAt = new Date(record.issueDate || record.createdAt);
      return !Number.isNaN(issuedAt.getTime()) && issuedAt.getMonth() === currentMonth && issuedAt.getFullYear() === currentYear;
    }).length,
    uniqueStudents: uniqueStudents.size,
    completionCount: records.filter((record) => record.templateId === 'completion').length,
  };
};

export const fetchSchoolCertificatesWorkspace = async (): Promise<{
  templates: SchoolCertificateTemplate[];
  certificates: SchoolCertificateRecord[];
  summary: SchoolCertificatesSummary;
}> => {
  const { records } = getScopedCertificates();
  const sortedRecords = [...records].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
  return {
    templates: certificateTemplates,
    certificates: sortedRecords,
    summary: buildSummary(sortedRecords),
  };
};

export const createSchoolCertificate = async (
  input: CreateSchoolCertificateInput
): Promise<{ certificate: SchoolCertificateRecord; summary: SchoolCertificatesSummary }> => {
  const { scope, store, records } = getScopedCertificates();
  const template = getTemplateById(input.templateId);
  const nowIso = new Date().toISOString();
  const certificate: SchoolCertificateRecord = {
    id: makeId('CERT'),
    serialNumber: buildSerialNumber(records),
    templateId: template.id,
    templateLabel: template.label,
    certificateTitle: normalizeText(input.certificateTitle) || template.defaultTitle,
    programName: normalizeText(input.programName),
    achievement: normalizeText(input.achievement),
    studentName: normalizeText(input.studentName),
    studentEmail: normalizeEmail(input.studentEmail),
    admissionNumber: normalizeText(input.admissionNumber),
    department: normalizeText(input.department),
    classGroup: normalizeText(input.classGroup),
    issueDate: normalizeText(input.issueDate) || nowIso.slice(0, 10),
    signatoryName: normalizeText(input.signatoryName),
    signatoryRole: normalizeText(input.signatoryRole),
    notes: normalizeText(input.notes),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const nextRecords = [certificate, ...records];
  writeScopedCertificates(scope, store, nextRecords);
  return {
    certificate,
    summary: buildSummary(nextRecords),
  };
};

export const updateSchoolCertificate = async (
  certificateId: string,
  input: UpdateSchoolCertificateInput
): Promise<{ certificate: SchoolCertificateRecord; summary: SchoolCertificatesSummary }> => {
  const { scope, store, records } = getScopedCertificates();
  const existing = records.find((record) => record.id === certificateId);
  if (!existing) {
    throw new Error('Certificate record could not be found.');
  }

  const template = getTemplateById(input.templateId);
  const updated: SchoolCertificateRecord = {
    ...existing,
    templateId: template.id,
    templateLabel: template.label,
    certificateTitle: normalizeText(input.certificateTitle) || template.defaultTitle,
    programName: normalizeText(input.programName),
    achievement: normalizeText(input.achievement),
    studentName: normalizeText(input.studentName),
    studentEmail: normalizeEmail(input.studentEmail),
    admissionNumber: normalizeText(input.admissionNumber),
    department: normalizeText(input.department),
    classGroup: normalizeText(input.classGroup),
    issueDate: normalizeText(input.issueDate) || existing.issueDate,
    signatoryName: normalizeText(input.signatoryName),
    signatoryRole: normalizeText(input.signatoryRole),
    notes: normalizeText(input.notes),
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = records.map((record) => (record.id === certificateId ? updated : record));
  writeScopedCertificates(scope, store, nextRecords);
  return {
    certificate: updated,
    summary: buildSummary(nextRecords),
  };
};

export const deleteSchoolCertificate = async (
  certificateId: string
): Promise<{ deleted: boolean; summary: SchoolCertificatesSummary }> => {
  const { scope, store, records } = getScopedCertificates();
  const nextRecords = records.filter((record) => record.id !== certificateId);
  writeScopedCertificates(scope, store, nextRecords);
  return {
    deleted: nextRecords.length !== records.length,
    summary: buildSummary(nextRecords),
  };
};
