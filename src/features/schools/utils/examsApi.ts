import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type ExamQuestionInput = {
  id?: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: { id?: string; text: string }[];
  correctOptionId?: string | null;
  maxPoints: number;
};

export type SchoolExam = {
  id: string;
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  durationMinutes: number;
  startAt: string;
  createdAt: string;
  publishedAt?: string | null;
  gradingScheme?: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  questions: ExamQuestionInput[];
};

export type SchoolQuestionBank = {
  id: string;
  name: string;
  subject?: string | null;
  department?: string | null;
  classGroup?: string | null;
  questions: ExamQuestionInput[];
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SchoolExamNotification = {
  id: string;
  examId: string;
  kind: 'results_published';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export type ExamSubmission = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; response: string; optionId?: string | null }[];
  questionReviews?: {
    questionId: string;
    awardedPoints: number;
    feedback?: string | null;
  }[];
  submittedAt: string;
  status: 'submitted' | 'graded' | 'published';
  score?: number;
  maxScore: number;
  feedback?: string | null;
  gradedAt?: string | null;
  publishedAt?: string | null;
};

export type StudentExamAttempt = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; response: string; optionId?: string | null }[];
  activeQuestionIndex: number;
  startedAt: string;
  lastSavedAt: string;
  expiresAt: string;
  status: 'in_progress' | 'submitted' | 'expired';
  submittedAt?: string | null;
  questionCount: number;
  answeredCount: number;
  timeRemainingMs: number;
};

export type StudentExamNotification = {
  id: string;
  examId: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  department: string;
  classGroup: string;
};

export type StudentExamSubmissionSummary = {
  examId: string;
  status: 'submitted' | 'graded' | 'published';
  submittedAt: string;
  gradedAt?: string | null;
  publishedAt?: string | null;
  score?: number;
  maxScore: number;
};

export type SchoolExamTrendPoint = {
  examId: string;
  title: string;
  startAt: string;
  status: 'draft' | 'published';
  submissionsCount: number;
  scoredCount: number;
  averagePercentage: number | null;
  isCurrent: boolean;
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

export const fetchSchoolExams = async (): Promise<{ exams: SchoolExam[]; gradingScheme?: { primary: string; secondary: string; tertiary: string } }> => {
  const response = await requestWithAuth('/school-exams', undefined, 'school');
  return response.json();
};

export const fetchSchoolQuestionBanks = async (): Promise<{ questionBanks: SchoolQuestionBank[] }> => {
  const response = await requestWithAuth('/school-exams/question-banks', undefined, 'school');
  return response.json();
};

export const fetchSchoolExamNotifications = async (): Promise<{
  unreadCount: number;
  notifications: SchoolExamNotification[];
}> => {
  const response = await requestWithAuth('/school-exams/notifications', undefined, 'school');
  return response.json();
};

export const markSchoolExamNotificationAsRead = async (notificationId: string) => {
  const response = await requestWithAuth(
    `/school-exams/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'school'
  );
  return response.json() as Promise<{ notificationId: string; unreadCount: number }>;
};

export const markAllSchoolExamNotificationsAsRead = async () => {
  const response = await requestWithAuth(
    '/school-exams/notifications/read-all',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'school'
  );
  return response.json() as Promise<{ updated: number; unreadCount: number }>;
};

export const archiveSchoolExamNotification = async (notificationId: string) => {
  const response = await requestWithAuth(
    `/school-exams/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'DELETE',
    },
    'school'
  );
  return response.json() as Promise<{ notificationId: string; unreadCount: number; archived: true }>;
};

export const fetchSchoolGradingScheme = async (): Promise<{ gradingScheme: { primary: string; secondary: string; tertiary: string } }> => {
  const response = await requestWithAuth('/school-exams/grading-scheme', undefined, 'school');
  return response.json();
};

export const updateSchoolGradingScheme = async (payload: {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}) => {
  const response = await requestWithAuth('/school-exams/grading-scheme', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'school');
  return response.json();
};

export const createSchoolExam = async (payload: {
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  durationMinutes: number;
  startAt: string;
  questions: ExamQuestionInput[];
  gradingScheme?: { primary: string; secondary: string; tertiary: string };
}) => {
  const response = await requestWithAuth('/school-exams', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'school');
  return response.json();
};

export const createSchoolQuestionBank = async (payload: {
  name: string;
  subject?: string;
  department?: string;
  classGroup?: string;
  questions: ExamQuestionInput[];
}) => {
  const response = await requestWithAuth('/school-exams/question-banks', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'school');
  return response.json() as Promise<{ questionBank: SchoolQuestionBank }>;
};

export const updateSchoolQuestionBank = async (
  questionBankId: string,
  payload: {
    name?: string;
    subject?: string;
    department?: string;
    classGroup?: string;
    questions?: ExamQuestionInput[];
  }
) => {
  const response = await requestWithAuth(`/school-exams/question-banks/${encodeURIComponent(questionBankId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, 'school');
  return response.json() as Promise<{ questionBank: SchoolQuestionBank }>;
};

export const deleteSchoolQuestionBank = async (questionBankId: string) => {
  const response = await requestWithAuth(`/school-exams/question-banks/${encodeURIComponent(questionBankId)}`, {
    method: 'DELETE',
  }, 'school');
  return response.json() as Promise<{ questionBankId: string; removed: true }>;
};

export const fetchExamSubmissions = async (examId: string): Promise<{ exam: SchoolExam; submissions: ExamSubmission[] }> => {
  const response = await requestWithAuth(`/school-exams/submissions?examId=${encodeURIComponent(examId)}`, undefined, 'school');
  return response.json();
};

export const fetchSchoolExamTrends = async (
  examId: string,
  limit = 6
): Promise<{ examId: string; trends: SchoolExamTrendPoint[] }> => {
  const params = new URLSearchParams({
    examId,
    limit: String(limit),
  });
  const response = await requestWithAuth(`/school-exams/trends?${params.toString()}`, undefined, 'school');
  return response.json();
};

export const gradeExamSubmission = async (payload: {
  examId: string;
  submissionId: string;
  score: number;
  feedback?: string;
  questionReviews?: {
    questionId: string;
    awardedPoints: number;
    feedback?: string | null;
  }[];
}) => {
  const response = await requestWithAuth('/school-exams/grade', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'school');
  return response.json();
};

export const publishExamResults = async (examId: string) => {
  const response = await requestWithAuth('/school-exams/publish', {
    method: 'POST',
    body: JSON.stringify({ examId }),
  }, 'school');
  return response.json() as Promise<{
    examId: string;
    publishedAt: string;
    newlyPublishedCount: number;
    publishedSubmissionsCount: number;
    awaitingReviewCount: number;
  }>;
};

export const fetchStudentExams = async (params: { department: string; classGroup: string }) => {
  const query = new URLSearchParams(params).toString();
  const response = await requestWithAuth(`/student-exams?${query}`, undefined, 'student');
  return response.json() as Promise<{
    exams: SchoolExam[];
    attempts: StudentExamAttempt[];
    submissions: StudentExamSubmissionSummary[];
  }>;
};

export const fetchStudentExamNotifications = async () => {
  const response = await requestWithAuth('/student-exams/notifications', undefined, 'student');
  return response.json() as Promise<{
    unreadCount: number;
    notifications: StudentExamNotification[];
  }>;
};

export const markStudentExamNotificationAsRead = async (notificationId: string) => {
  const response = await requestWithAuth(
    `/student-exams/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'student'
  );
  return response.json() as Promise<{ notificationId: string; unreadCount: number }>;
};

export const markAllStudentExamNotificationsAsRead = async () => {
  const response = await requestWithAuth(
    '/student-exams/notifications/read-all',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    'student'
  );
  return response.json() as Promise<{ updated: number; unreadCount: number }>;
};

export const archiveStudentExamNotification = async (notificationId: string) => {
  const response = await requestWithAuth(
    `/student-exams/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'DELETE',
    },
    'student'
  );
  return response.json() as Promise<{ notificationId: string; unreadCount: number; archived: true }>;
};

export const startStudentExamAttempt = async (payload: {
  examId: string;
  studentName: string;
  studentId?: string | number;
}) => {
  const response = await requestWithAuth('/student-exams/attempt/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'student');
  return response.json() as Promise<{ exam: SchoolExam; attempt: StudentExamAttempt }>;
};

export const saveStudentExamAttempt = async (payload: {
  examId: string;
  attemptId: string;
  activeQuestionIndex: number;
  answers: { questionId: string; response: string; optionId?: string | null }[];
}) => {
  const response = await requestWithAuth('/student-exams/attempt/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'student');
  return response.json() as Promise<{ attempt: StudentExamAttempt }>;
};

export const submitStudentExam = async (payload: {
  examId: string;
  attemptId: string;
  studentName: string;
  activeQuestionIndex?: number;
  answers: { questionId: string; response: string; optionId?: string | null }[];
}) => {
  const response = await requestWithAuth('/student-exams/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'student');
  return response.json();
};

export const fetchStudentExamResult = async (
  examId: string,
  studentId?: string
): Promise<{ submission: ExamSubmission }> => {
  const params = new URLSearchParams({ examId });
  if (studentId) {
    params.set('studentId', studentId);
  }
  const response = await requestWithAuth(`/student-exams/result?${params.toString()}`, undefined, 'student');
  return response.json();
};
