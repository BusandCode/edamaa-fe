import {
  loadPersistedLocalDevAuthSession,
  loadPersistedSupabaseAccessToken,
} from '../../../utils/authSession';

export type SchoolScheduleSession = {
  id: string;
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  expectedStudents: number;
  roomCode: string;
  notes: string | null;
  assignedTutorEmail?: string | null;
  assignedTutorName?: string | null;
  department?: string | null;
  classGroup?: string | null;
  audienceTag?: string | null;
  tutorJoinLink?: string | null;
  tutorAccessCode?: string | null;
  status: 'upcoming' | 'live' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export type SchoolScheduleListResponse = {
  generatedAt: string;
  school: {
    userId: string;
    email: string;
    name: string;
  };
  sessions: SchoolScheduleSession[];
};

export type SchoolTeacherRosterItem = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  classGroup: string | null;
  subjectFocus: string | null;
  isActive: boolean;
  inviteStatus: 'invited' | 'accepted' | 'inactive';
  invitedAt: string | null;
  acceptedAt: string | null;
  lastInviteSentAt: string | null;
  lastInviteChannel: 'in_app' | 'email' | 'both' | null;
  lastInviteDeliveryStatus: 'queued' | 'sent' | 'simulated' | 'failed' | null;
  lastInviteDeliveryNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchoolTeacherInviteDispatch = {
  channel: 'in_app' | 'email' | 'both';
  status: 'queued' | 'sent' | 'simulated' | 'failed';
  note: string;
  payload?: {
    template: string;
    to: string;
    subject: string;
    body: string;
    metadata: {
      schoolName: string;
      schoolEmail: string;
      teacherName: string;
      teacherEmail: string;
      inviteLink: string;
    };
  };
};

export type SchoolTeacherRosterResponse = {
  generatedAt: string;
  school: {
    userId: string;
    email: string;
    name: string;
  };
  teachers: SchoolTeacherRosterItem[];
};

export type CreateSchoolTeacherInput = {
  name: string;
  email: string;
  department?: string;
  classGroup?: string;
  subjectFocus?: string;
  isActive?: boolean;
};

export type CreateSchoolTeacherResponse = {
  message: string;
  teacher: SchoolTeacherRosterItem;
  teachers: SchoolTeacherRosterItem[];
  invite?: SchoolTeacherInviteDispatch;
};

export type UpdateSchoolTeacherInput = {
  name?: string;
  email?: string;
  department?: string | null;
  classGroup?: string | null;
  subjectFocus?: string | null;
  isActive?: boolean;
};

export type UpdateSchoolTeacherResponse = {
  message: string;
  teacher: SchoolTeacherRosterItem;
  teachers: SchoolTeacherRosterItem[];
  invite?: SchoolTeacherInviteDispatch;
};

export type DeleteSchoolTeacherResponse = {
  message: string;
  teachers: SchoolTeacherRosterItem[];
};

export type ResendSchoolTeacherInviteResponse = {
  message: string;
  teacher: SchoolTeacherRosterItem;
  teachers: SchoolTeacherRosterItem[];
  invite?: SchoolTeacherInviteDispatch;
};

export type SchoolScheduleFeedSession = SchoolScheduleSession & {
  school: {
    userId: string;
    email: string;
    name: string;
  };
};

export type SchoolScheduleFeedResponse = {
  generatedAt: string;
  viewer: {
    userId: string;
    email: string;
    role: 'student' | 'tutor' | 'school' | 'admin';
  };
  sessions: SchoolScheduleFeedSession[];
};

export type CreateSchoolScheduleSessionInput = {
  title: string;
  subject: string;
  instructor: string;
  startAt: string;
  durationMinutes: number;
  expectedStudents?: number;
  roomCode?: string;
  notes?: string;
  assignedTutorEmail?: string;
  assignedTutorName?: string;
  department?: string;
  classGroup?: string;
  audienceTag?: string;
};

export type CreateSchoolScheduleSessionResponse = {
  session: SchoolScheduleSession;
  message: string;
  classInvite?: SchoolTeacherInviteDispatch;
};

export type UpdateSchoolScheduleSessionInput = {
  title?: string;
  subject?: string;
  instructor?: string;
  startAt?: string;
  durationMinutes?: number;
  expectedStudents?: number;
  roomCode?: string;
  notes?: string | null;
  assignedTutorEmail?: string | null;
  assignedTutorName?: string | null;
  department?: string | null;
  classGroup?: string | null;
  audienceTag?: string | null;
};

export type UpdateSchoolScheduleSessionResponse = {
  session: SchoolScheduleSession;
  message: string;
};

export type SchoolScheduleNotification = {
  id: string;
  kind:
    | 'created'
    | 'updated'
    | 'canceled'
    | 'teacher_invite'
    | 'class_assignment'
    | 'teacher_access_accepted';
  sessionId: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  createdAtLabel: string;
  isRead: boolean;
  action?: {
    type: 'verify_teacher_access';
    sessionId: string;
    token: string;
    code: string;
    joinLink?: string | null;
  } | null;
};

export type SchoolScheduleNotificationsResponse = {
  generatedAt: string;
  unreadCount: number;
  notifications: SchoolScheduleNotification[];
};

export type SchoolScheduleActivityItem = {
  id: string;
  type:
    | 'class_live'
    | 'class_upcoming'
    | 'class_created'
    | 'class_updated'
    | 'invite_sent'
    | 'invite_accepted'
    | 'attendance_recorded'
    | 'system';
  title: string;
  detail: string;
  sessionId?: string | null;
  createdAt: string;
  createdAtLabel: string;
};

export type SchoolScheduleActivityResponse = {
  generatedAt: string;
  activities: SchoolScheduleActivityItem[];
};

export type SchoolScheduleTeacherAccess = {
  sessionId: string;
  roomCode: string;
  assignedTutorEmail: string | null;
  assignedTutorName: string | null;
  department: string | null;
  classGroup: string | null;
  audienceTag: string | null;
  tutorAccessCode: string | null;
  tutorJoinLink: string | null;
  generatedAt?: string;
  message?: string;
};

export type SchoolScheduleAttendanceRecord = {
  id: string;
  participantId: string | null;
  participantName: string;
  participantRole: 'student' | 'tutor' | 'school';
  status: 'present' | 'absent';
  source: 'live' | 'manual';
  joinedAt: string | null;
  lastSeenAt: string | null;
  leftAt: string | null;
  manualMarkedAt: string | null;
  note: string | null;
  durationMinutes: number | null;
  isLive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SchoolScheduleAttendanceSummary = {
  expectedStudents: number;
  presentCount: number;
  absentCount: number;
  liveCount: number;
  completedCount: number;
  missingCount: number;
  attendanceRate: number;
};

export type SchoolScheduleAttendanceResponse = {
  generatedAt: string;
  session: SchoolScheduleSession;
  summary: SchoolScheduleAttendanceSummary;
  records: SchoolScheduleAttendanceRecord[];
};

export type UpsertSchoolScheduleAttendanceInput = {
  participantId?: string | number;
  participantName: string;
  status: 'present' | 'absent';
  note?: string;
  schoolEmail?: string;
};

export type UpdateSchoolScheduleAttendanceInput = {
  status?: 'present' | 'absent';
  note?: string;
  schoolEmail?: string;
};

export type RecordSchoolScheduleAttendanceInput = {
  sessionId: string;
  action: 'join' | 'leave';
  participantId?: string | number;
  participantName?: string;
  note?: string;
};

export type VerifySchoolTeacherAccessInput = {
  sessionId: string;
  token: string;
  code: string;
};

export type VerifySchoolTeacherAccessResponse = {
  verified: boolean;
  session: SchoolScheduleFeedSession;
  launch: {
    liveClassPath: string;
    roomCode: string;
  };
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
    // Fall through to plain-text fallback.
  }

  try {
    const textPayload = (await response.text()).replace(/\s+/g, ' ').trim();
    if (textPayload && !/^</.test(textPayload)) {
      return textPayload;
    }
  } catch {
    // Fall through to generic fallback.
  }

  return `Request failed with status ${response.status}`;
};

const requestWithAuth = async (endpoint: string, init?: RequestInit) => {
  const token = loadPersistedSupabaseAccessToken();
  const localDevSession = loadPersistedLocalDevAuthSession();
  if (!token && !localDevSession?.email) {
    throw new Error('Sign in with your account to continue to class schedule.');
  }

  const bases = resolveApiBaseCandidates();
  let networkError: Error | null = null;

  const shouldTryNextBase = (response: Response, base: string) => {
    if (base.startsWith('/') && response.status === 500) {
      return true;
    }
    if ([502, 503, 504].includes(response.status)) {
      return true;
    }
    if (base.startsWith('/') && [404, 405].includes(response.status)) {
      return true;
    }
    return false;
  };

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];
    let response: Response;

    try {
      response = await fetch(`${base}${endpoint}`, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(localDevSession?.email ? { 'X-Dev-User-Email': localDevSession.email } : {}),
          ...(localDevSession?.defaultRole
            ? { 'X-Dev-User-Role': localDevSession.defaultRole }
            : {}),
        },
      });
    } catch (error) {
      networkError = error instanceof Error ? error : new Error('Network request failed');
      continue;
    }

    if (!response.ok) {
      if (shouldTryNextBase(response, base)) {
        continue;
      }
      throw new Error(await extractErrorMessage(response));
    }

    return response;
  }

  const fallbackMessage =
    networkError?.message && networkError.message.trim()
      ? networkError.message
      : 'Failed to fetch';

  throw new Error(
    `${fallbackMessage}. Could not reach backend API on ${bases.join(', ')}. Start the API with "bash scripts/api-up.sh" or run backend/nestjs with "SKIP_PRISMA_CONNECT=1 npm run start", then retry.`
  );
};

export const fetchSchoolScheduleSessions = async (input?: {
  search?: string;
  status?: 'all' | 'upcoming' | 'live' | 'completed';
  dateFrom?: string;
  dateTo?: string;
}) => {
  const query = new URLSearchParams();
  if (input?.search) {
    query.set('search', input.search);
  }
  if (input?.status && input.status !== 'all') {
    query.set('status', input.status);
  }
  if (input?.dateFrom) {
    query.set('dateFrom', input.dateFrom);
  }
  if (input?.dateTo) {
    query.set('dateTo', input.dateTo);
  }

  const endpoint = query.toString()
    ? `/school-schedule/me/sessions?${query.toString()}`
    : '/school-schedule/me/sessions';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleListResponse;
};

export const fetchSchoolTeachers = async (input?: {
  search?: string;
  includeInactive?: boolean;
  schoolEmail?: string;
}) => {
  const query = new URLSearchParams();
  if (input?.search) {
    query.set('search', input.search);
  }
  if (input?.includeInactive) {
    query.set('includeInactive', 'true');
  }
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }

  const endpoint = query.toString()
    ? `/school-schedule/me/teachers?${query.toString()}`
    : '/school-schedule/me/teachers';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolTeacherRosterResponse;
};

export const createSchoolTeacher = async (input: CreateSchoolTeacherInput) => {
  const response = await requestWithAuth('/school-schedule/me/teachers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as CreateSchoolTeacherResponse;
};

export const updateSchoolTeacher = async (teacherId: string, input: UpdateSchoolTeacherInput) => {
  const response = await requestWithAuth(
    `/school-schedule/me/teachers/${encodeURIComponent(teacherId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
  return (await response.json()) as UpdateSchoolTeacherResponse;
};

export const deleteSchoolTeacher = async (teacherId: string) => {
  const response = await requestWithAuth(
    `/school-schedule/me/teachers/${encodeURIComponent(teacherId)}`,
    {
      method: 'DELETE',
    }
  );
  return (await response.json()) as DeleteSchoolTeacherResponse;
};

export const resendSchoolTeacherInvite = async (teacherId: string, schoolEmail?: string) => {
  const response = await requestWithAuth(
    `/school-schedule/me/teachers/${encodeURIComponent(teacherId)}/invite`,
    {
      method: 'POST',
      body: JSON.stringify(schoolEmail ? { schoolEmail } : {}),
    }
  );
  return (await response.json()) as ResendSchoolTeacherInviteResponse;
};

export const fetchSchoolScheduleFeed = async (input?: {
  search?: string;
  status?: 'all' | 'upcoming' | 'live' | 'completed';
  dateFrom?: string;
  dateTo?: string;
  schoolEmail?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (input?.search) {
    query.set('search', input.search);
  }
  if (input?.status && input.status !== 'all') {
    query.set('status', input.status);
  }
  if (input?.dateFrom) {
    query.set('dateFrom', input.dateFrom);
  }
  if (input?.dateTo) {
    query.set('dateTo', input.dateTo);
  }
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0) {
    query.set('limit', String(Math.trunc(input.limit)));
  }

  const endpoint = query.toString()
    ? `/school-schedule/feed?${query.toString()}`
    : '/school-schedule/feed';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleFeedResponse;
};

export const fetchSchoolScheduleNotifications = async (input?: { schoolEmail?: string }) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }

  const endpoint = query.toString()
    ? `/school-schedule/me/notifications?${query.toString()}`
    : '/school-schedule/me/notifications';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleNotificationsResponse;
};

export const fetchSchoolScheduleActivity = async (input?: { schoolEmail?: string; limit?: number }) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  if (typeof input?.limit === 'number' && Number.isFinite(input.limit) && input.limit > 0) {
    query.set('limit', String(Math.trunc(input.limit)));
  }

  const endpoint = query.toString()
    ? `/school-schedule/me/activity?${query.toString()}`
    : '/school-schedule/me/activity';
  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleActivityResponse;
};

export const markSchoolScheduleNotificationAsRead = async (
  notificationId: string,
  input?: { schoolEmail?: string }
) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  const endpoint = query.toString()
    ? `/school-schedule/me/notifications/${encodeURIComponent(notificationId)}/read?${query.toString()}`
    : `/school-schedule/me/notifications/${encodeURIComponent(notificationId)}/read`;

  const response = await requestWithAuth(endpoint, {
    method: 'POST',
  });
  return (await response.json()) as {
    notificationId: string;
    isRead: boolean;
    unreadCount: number;
  };
};

export const markAllSchoolScheduleNotificationsAsRead = async (input?: {
  schoolEmail?: string;
}) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  const endpoint = query.toString()
    ? `/school-schedule/me/notifications/read-all?${query.toString()}`
    : '/school-schedule/me/notifications/read-all';

  const response = await requestWithAuth(endpoint, {
    method: 'POST',
  });
  return (await response.json()) as {
    updated: number;
    unreadCount: number;
  };
};

export const fetchSchoolScheduleTeacherAccess = async (
  sessionId: string,
  input?: { schoolEmail?: string }
) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  const endpoint = query.toString()
    ? `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/teacher-access?${query.toString()}`
    : `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/teacher-access`;

  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleTeacherAccess;
};

export const fetchSchoolScheduleAttendance = async (
  sessionId: string,
  input?: { schoolEmail?: string }
) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  const endpoint = query.toString()
    ? `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/attendance?${query.toString()}`
    : `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/attendance`;

  const response = await requestWithAuth(endpoint, { method: 'GET' });
  return (await response.json()) as SchoolScheduleAttendanceResponse;
};

export const upsertSchoolScheduleAttendance = async (
  sessionId: string,
  input: UpsertSchoolScheduleAttendanceInput
) => {
  const response = await requestWithAuth(
    `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/attendance/manual`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
  return (await response.json()) as {
    message: string;
    record: SchoolScheduleAttendanceRecord;
    attendance: SchoolScheduleAttendanceResponse;
  };
};

export const updateSchoolScheduleAttendance = async (
  sessionId: string,
  attendanceId: string,
  input: UpdateSchoolScheduleAttendanceInput
) => {
  const response = await requestWithAuth(
    `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/attendance/${encodeURIComponent(attendanceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
  return (await response.json()) as {
    message: string;
    record: SchoolScheduleAttendanceRecord;
    attendance: SchoolScheduleAttendanceResponse;
  };
};

export const recordSchoolScheduleAttendance = async (input: RecordSchoolScheduleAttendanceInput) => {
  const response = await requestWithAuth('/school-schedule/attendance/record', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as {
    recorded: boolean;
    ignored?: boolean;
    action?: 'join' | 'leave';
    record?: SchoolScheduleAttendanceRecord;
  };
};

export const regenerateSchoolScheduleTeacherAccess = async (
  sessionId: string,
  input?: { schoolEmail?: string }
) => {
  const query = new URLSearchParams();
  if (input?.schoolEmail) {
    query.set('schoolEmail', input.schoolEmail);
  }
  const endpoint = query.toString()
    ? `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/teacher-access/regenerate?${query.toString()}`
    : `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}/teacher-access/regenerate`;

  const response = await requestWithAuth(endpoint, { method: 'POST' });
  return (await response.json()) as SchoolScheduleTeacherAccess;
};

export const verifySchoolTeacherAccess = async (input: VerifySchoolTeacherAccessInput) => {
  const response = await requestWithAuth('/school-schedule/teacher-access/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as VerifySchoolTeacherAccessResponse;
};

export const createSchoolScheduleSession = async (input: CreateSchoolScheduleSessionInput) => {
  const response = await requestWithAuth('/school-schedule/me/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (await response.json()) as CreateSchoolScheduleSessionResponse;
};

export const deleteSchoolScheduleSession = async (sessionId: string) => {
  const response = await requestWithAuth(
    `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'DELETE',
    }
  );
  return (await response.json()) as {
    sessionId: string;
    message: string;
  };
};

export const updateSchoolScheduleSession = async (
  sessionId: string,
  input: UpdateSchoolScheduleSessionInput
) => {
  const response = await requestWithAuth(
    `/school-schedule/me/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  );
  return (await response.json()) as UpdateSchoolScheduleSessionResponse;
};
