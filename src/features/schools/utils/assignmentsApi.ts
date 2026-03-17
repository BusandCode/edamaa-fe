import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type AssignmentType = 'assignment' | 'classwork';
export type AssignmentDeliveryMode = 'virtual' | 'offline';
export type AssignmentReleaseMode = 'immediate' | 'scheduled' | 'on_class_end';
export type AssignmentSessionStatus = 'upcoming' | 'live' | 'completed' | null;

export type AssignmentQuestionInput = {
  id?: string;
  prompt: string;
  points: number;
  options: { id?: string; text: string }[];
  correctOptionId: string;
};

export type AssignmentFileMeta = {
  name: string;
  sizeBytes: number;
  mimeType: string;
};

export type AssignmentQuestionResult = {
  questionId: string;
  prompt: string;
  selectedOptionId?: string | null;
  selectedOptionLabel?: string;
  correctOptionId: string;
  correctOptionLabel: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
};

export type SchoolAssignment = {
  id: string;
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  description: string;
  content: string;
  checklist: string[];
  type: AssignmentType;
  deliveryMode: AssignmentDeliveryMode;
  releaseMode: AssignmentReleaseMode;
  releaseAt: string | null;
  dueAt: string;
  points: number;
  attachments: number;
  questions: AssignmentQuestionInput[];
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  submissionsCount: number;
  gradedCount: number;
  isReleased: boolean;
  linkedSessionStatus: AssignmentSessionStatus;
};

export type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
  submissionNote?: string | null;
  submissionFiles?: AssignmentFileMeta[];
  answers?: { questionId: string; optionId: string }[];
  score?: number | null;
  maxScore: number;
  feedback?: string | null;
  gradedAt?: string | null;
  lateSubmission: boolean;
  questionResults?: AssignmentQuestionResult[];
};

export type StudentAssignment = Omit<SchoolAssignment, 'submissionsCount' | 'gradedCount'>;

export type CreateSchoolAssignmentInput = {
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  description: string;
  content: string;
  checklist?: string[];
  type: AssignmentType;
  deliveryMode: AssignmentDeliveryMode;
  releaseMode: AssignmentReleaseMode;
  releaseAt?: string | null;
  dueAt: string;
  points: number;
  attachments?: number;
  questions?: AssignmentQuestionInput[];
  sessionId?: string | null;
};

export type UpdateSchoolAssignmentInput = Partial<CreateSchoolAssignmentInput>;

export type SubmitStudentAssignmentInput = {
  assignmentId: string;
  studentId: number | string;
  studentName: string;
  submissionNote?: string;
  submissionFiles?: AssignmentFileMeta[];
  answers?: { questionId: string; optionId: string }[];
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const isLocalhostHost = (host: string) => host === '127.0.0.1' || host === 'localhost';

const resolveApiBaseCandidates = () => {
  const candidates = new Set<string>();
  candidates.add('/api');

  if (API_BASE_URL && API_BASE_URL !== '/api') {
    candidates.add(API_BASE_URL);
  }

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').trim();
    if (isLocalhostHost(host)) {
      candidates.add(`http://${host}:3001`);
    }
  }

  candidates.add('http://127.0.0.1:3001');
  candidates.add('http://localhost:3001');
  return Array.from(candidates).map((base) => base.replace(/\/+$/, ''));
};

const extractErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) {
      return payload.message.join(', ');
    }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // fall through
  }

  try {
    const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (textPayload && !/^</.test(textPayload)) {
      return textPayload;
    }
  } catch {
    // fall through
  }

  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (endpoint: string, init?: RequestInit, fallbackRole = 'school') => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in to continue.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (localDevSession?.email) {
    headers['x-dev-user-email'] = localDevSession.email;
    headers['x-dev-user-role'] = localDevSession.role || fallbackRole;
  }

  const bases = resolveApiBaseCandidates();
  let networkError: Error | null = null;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${endpoint}`, {
        ...init,
        headers,
      });
      if (!response.ok) {
        const message = await extractErrorMessage(response);
        throw new Error(message);
      }
      return response;
    } catch (error) {
      networkError = error as Error;
    }
  }

  throw networkError || new Error('Failed to fetch');
};

export const fetchSchoolAssignments = async () => {
  const response = await requestWithAuth('/school-assignments', undefined, 'school');
  return response.json() as Promise<{
    assignments: SchoolAssignment[];
    summary: { total: number; active: number; awaitingReview: number };
  }>;
};

export const createSchoolAssignment = async (input: CreateSchoolAssignmentInput) => {
  const response = await requestWithAuth('/school-assignments', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'school');
  return response.json() as Promise<{
    message: string;
    assignment: SchoolAssignment;
    assignments: SchoolAssignment[];
  }>;
};

export const updateSchoolAssignment = async (assignmentId: string, input: UpdateSchoolAssignmentInput) => {
  const response = await requestWithAuth(`/school-assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }, 'school');
  return response.json() as Promise<{
    message: string;
    assignment: SchoolAssignment;
    assignments: SchoolAssignment[];
  }>;
};

export const deleteSchoolAssignment = async (assignmentId: string) => {
  const response = await requestWithAuth(`/school-assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
  }, 'school');
  return response.json() as Promise<{
    message: string;
    assignments: SchoolAssignment[];
  }>;
};

export const fetchSchoolAssignmentSubmissions = async (assignmentId: string) => {
  const response = await requestWithAuth(
    `/school-assignments/submissions?assignmentId=${encodeURIComponent(assignmentId)}`,
    undefined,
    'school'
  );
  return response.json() as Promise<{
    assignment: SchoolAssignment;
    submissions: AssignmentSubmission[];
  }>;
};

export const gradeSchoolAssignmentSubmission = async (input: {
  submissionId: string;
  score: number;
  feedback?: string;
}) => {
  const response = await requestWithAuth('/school-assignments/grade', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'school');
  return response.json() as Promise<{
    message: string;
    submission: AssignmentSubmission;
  }>;
};

export const fetchStudentAssignments = async (params: {
  department: string;
  classGroup: string;
  studentId?: string | number;
}) => {
  const query = new URLSearchParams({
    department: params.department,
    classGroup: params.classGroup,
    ...(params.studentId ? { studentId: String(params.studentId) } : {}),
  });
  const response = await requestWithAuth(`/student-assignments?${query.toString()}`, undefined, 'student');
  return response.json() as Promise<{
    assignments: StudentAssignment[];
    submissions: AssignmentSubmission[];
  }>;
};

export const submitStudentAssignment = async (input: SubmitStudentAssignmentInput) => {
  const response = await requestWithAuth('/student-assignments/submit', {
    method: 'POST',
    body: JSON.stringify(input),
  }, 'student');
  return response.json() as Promise<{
    submission: AssignmentSubmission;
    autoGradeResult: {
      assignmentId: string;
      title: string;
      score: number;
      maxScore: number;
      percentage: number;
      feedback: string;
      questionResults: AssignmentQuestionResult[];
      submittedAtIso: string;
    } | null;
  }>;
};
