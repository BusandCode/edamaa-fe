import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { AccountRole, AccountRoleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  appMetadata?: Record<string, unknown> | null;
  userMetadata?: Record<string, unknown> | null;
};

type ScheduleStatus = 'upcoming' | 'live' | 'completed';

type ListSchoolSessionsInput = {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  schoolEmail?: string;
};

type ListScheduleFeedInput = {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  schoolEmail?: string;
  limit?: string;
};

type CreateSchoolSessionInput = {
  title?: string;
  subject?: string;
  instructor?: string;
  startAt?: string;
  durationMinutes?: number;
  expectedStudents?: number;
  attendanceGracePeriodMinutes?: number;
  roomCode?: string;
  notes?: string;
  schoolEmail?: string;
  assignedTutorEmail?: string;
  assignedTutorName?: string;
  department?: string;
  classGroup?: string;
  audienceTag?: string;
};

type UpdateSchoolSessionInput = {
  title?: string;
  subject?: string;
  instructor?: string;
  startAt?: string;
  durationMinutes?: number;
  expectedStudents?: number;
  attendanceGracePeriodMinutes?: number;
  roomCode?: string;
  notes?: string | null;
  schoolEmail?: string;
  assignedTutorEmail?: string | null;
  assignedTutorName?: string | null;
  department?: string | null;
  classGroup?: string | null;
  audienceTag?: string | null;
};

type ListSchoolTeachersInput = {
  search?: string;
  includeInactive?: string;
  schoolEmail?: string;
};

type CreateSchoolTeacherInput = {
  name?: string;
  email?: string;
  department?: string;
  classGroup?: string;
  subjectFocus?: string;
  isActive?: boolean;
  schoolEmail?: string;
};

type UpdateSchoolTeacherInput = {
  name?: string;
  email?: string;
  department?: string | null;
  classGroup?: string | null;
  subjectFocus?: string | null;
  isActive?: boolean;
  schoolEmail?: string;
};

type RegenerateTeacherAccessInput = {
  schoolEmail?: string;
};

type VerifyTeacherAccessInput = {
  sessionId?: string;
  token?: string;
  code?: string;
};

type ResolveWorkspaceResult = {
  schoolUserId: number;
  schoolEmail: string;
  schoolName: string;
};

type AuthUserRecord = {
  id: number;
  email: string;
  name: string | null;
  activeRoles: Set<string>;
  isSchool: boolean;
  isAdmin: boolean;
};

type ScheduleNotificationKind =
  | 'created'
  | 'updated'
  | 'canceled'
  | 'teacher_invite'
  | 'class_assignment'
  | 'teacher_access_accepted';

type ActivityType =
  | 'class_live'
  | 'class_upcoming'
  | 'class_created'
  | 'class_updated'
  | 'invite_sent'
  | 'invite_accepted'
  | 'attendance_recorded'
  | 'system';

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  sessionId?: string | null;
  createdAt: string;
  createdAtLabel: string;
  timestampMs: number;
};
type ScheduleNotificationPriority = 'high' | 'medium' | 'low';

type SchoolScheduleNotificationRecord = {
  id: string;
  kind: ScheduleNotificationKind;
  schoolUserId: number;
  schoolName: string;
  sessionId: string;
  sessionTitle: string;
  subject: string;
  instructor: string;
  roomCode: string;
  startAt: Date;
  assignedTutorEmail: string | null;
  department: string | null;
  classGroup: string | null;
  audienceTag: string | null;
  targetEmail: string | null;
  tutorJoinLink: string | null;
  tutorJoinCode: string | null;
  tutorJoinToken: string | null;
  createdAt: Date;
};

type SessionTeacherAccess = {
  assignedTutorEmail: string | null;
  assignedTutorName: string | null;
  department: string | null;
  classGroup: string | null;
  audienceTag: string | null;
  tutorJoinCode: string | null;
  tutorJoinToken: string | null;
};

type SchoolTeacherRosterItem = {
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

type SchoolTeacherRosterStore = {
  roleRowId: number;
  roleRowMetadata: Prisma.JsonValue | null;
  teachers: SchoolTeacherRosterItem[];
};

type FallbackSchoolScheduleSessionRecord = {
  id: number;
  publicId: string;
  schoolUserId: number;
  schoolEmail: string;
  schoolName: string;
  title: string;
  subject: string;
  instructor: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  expectedStudents: number;
  roomCode: string;
  notes: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

const ATTENDANCE_LATE_GRACE_PERIOD_MINUTES = 5;

type SessionAttendanceStatus = 'present' | 'absent' | 'pending' | 'late';
type SessionAttendanceSource = 'live' | 'manual' | 'check_in';

type SessionAttendanceWindowState = {
  isOpen: boolean;
  openedAt: string | null;
  openedByName: string | null;
  closedAt: string | null;
  gracePeriodMinutes: number;
};

type SessionAttendanceRecord = {
  id: string;
  schoolUserId: number;
  sessionId: string;
  sessionTitle: string;
  sessionSubject: string;
  participantKey: string;
  participantId: string | null;
  participantName: string;
  participantRole: 'student' | 'tutor' | 'school';
  status: SessionAttendanceStatus;
  source: SessionAttendanceSource;
  joinedAt: Date | null;
  lastSeenAt: Date | null;
  leftAt: Date | null;
  checkedInAt: Date | null;
  manualMarkedAt: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type RecordSessionAttendanceInput = {
  sessionId?: string;
  action?: string;
  participantId?: string | number;
  participantName?: string;
  note?: string;
};

type SetSessionAttendanceWindowInput = {
  sessionId?: string;
  action?: string;
  schoolEmail?: string;
};

type UpsertManualSessionAttendanceInput = {
  schoolEmail?: string;
  participantId?: string | number;
  participantName?: string;
  status?: string;
  note?: string;
};

type UpdateSessionAttendanceInput = {
  schoolEmail?: string;
  status?: string;
  note?: string;
};

type SessionLookupRecord = {
  id: number;
  publicId: string;
  schoolUserId: number;
  schoolEmail?: string;
  schoolName?: string;
  title: string;
  subject: string;
  instructor: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  expectedStudents: number;
  roomCode: string;
  notes: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SchoolScheduleService {
  private readonly notifications: SchoolScheduleNotificationRecord[] = [];
  private readonly readNotificationIdsByEmail = new Map<string, Set<string>>();
  private readonly fallbackTeacherRosterBySchoolId = new Map<number, SchoolTeacherRosterItem[]>();
  private readonly fallbackSessionsBySchoolId = new Map<number, FallbackSchoolScheduleSessionRecord[]>();
  private readonly attendanceRecordsBySchoolId = new Map<number, SessionAttendanceRecord[]>();
  private fallbackSessionAutoId = 1;
  private readonly fallbackSessionsPath =
    String(process.env.FALLBACK_SCHEDULE_PATH || '').trim() ||
    '/tmp/edamaa-fallback-schedule.json';
  private readonly fallbackAttendancePath =
    String(process.env.FALLBACK_SCHEDULE_ATTENDANCE_PATH || '').trim() ||
    '/tmp/edamaa-schedule-attendance.json';

  constructor(private readonly prisma: PrismaService) {
    this.loadFallbackSessionsFromDisk();
    this.loadAttendanceRecordsFromDisk();
  }

  async listSessionsForAuthUser(authUser: AuthUserContext, input: ListSchoolSessionsInput) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const normalizedStatus = this.normalizeStatus(input.status);
    const normalizedSearch = this.normalizeOptionalText(input.search);

    const where: Prisma.SchoolScheduleSessionWhereInput = {
      schoolUserId: workspace.schoolUserId,
    };

    const dateFrom = this.parseOptionalDate(input.dateFrom);
    const dateTo = this.parseOptionalDate(input.dateTo);
    if (dateFrom || dateTo) {
      where.startAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    if (normalizedSearch) {
      where.OR = [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          subject: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          instructor: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          roomCode: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ];
    }

    const sessions = await this.prisma.schoolScheduleSession
      .findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
        take: 500,
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.listFallbackSessionsForSchool(workspace.schoolUserId);
        }
        throw error;
      });

    const nowMs = Date.now();
    const mapped = sessions
      .map((session) => this.mapSession(session, nowMs, { includeTeacherAccess: true }))
      .filter((session) => normalizedStatus === 'all' || session.status === normalizedStatus);

    return {
      generatedAt: new Date().toISOString(),
      school: {
        userId: String(workspace.schoolUserId),
        email: workspace.schoolEmail,
        name: workspace.schoolName,
      },
      sessions: mapped,
    };
  }

  async listTeachersForAuthUser(authUser: AuthUserContext, input: ListSchoolTeachersInput) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const includeInactive = this.parseBooleanFlag(input.includeInactive);
    const search = this.normalizeOptionalText(input.search);

    const { teachers } = await this.ensureTeacherRoster(workspace.schoolUserId);
    const filtered = teachers.filter((teacher) => {
      if (!includeInactive && !teacher.isActive) {
        return false;
      }
      if (!search) {
        return true;
      }
      const query = search.toLowerCase();
      return (
        teacher.name.toLowerCase().includes(query) ||
        teacher.email.toLowerCase().includes(query) ||
        (teacher.department || '').toLowerCase().includes(query) ||
        (teacher.classGroup || '').toLowerCase().includes(query) ||
        (teacher.subjectFocus || '').toLowerCase().includes(query)
      );
    });

    return {
      generatedAt: new Date().toISOString(),
      school: {
        userId: String(workspace.schoolUserId),
        email: workspace.schoolEmail,
        name: workspace.schoolName,
      },
      teachers: filtered,
    };
  }

  async createTeacherForAuthUser(authUser: AuthUserContext, input: CreateSchoolTeacherInput) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    if (!this.isSchoolOrAdmin(authUser)) {
      throw new ForbiddenException('Only school or admin accounts can add teachers.');
    }

    const name = this.normalizeRequiredText(input.name, 'Teacher name');
    const email = this.normalizeOptionalEmail(input.email);
    if (!email) {
      throw new BadRequestException('Teacher email is required.');
    }

    const department = this.normalizeOptionalText(input.department);
    const classGroup = this.normalizeOptionalText(input.classGroup);
    const subjectFocus = this.normalizeOptionalText(input.subjectFocus);
    const isActive = input.isActive !== false;

    const roster = await this.ensureTeacherRoster(workspace.schoolUserId);
    const normalizedEmail = this.normalizeEmail(email);
    const existing = roster.teachers.find((teacher) => teacher.email === normalizedEmail);
    if (existing) {
      throw new BadRequestException('This teacher already exists in your roster.');
    }

    const nowIso = new Date().toISOString();
    const created: SchoolTeacherRosterItem = {
      id: this.createPublicId('SCT', workspace.schoolUserId),
      name,
      email: normalizedEmail,
      department,
      classGroup,
      subjectFocus,
      isActive,
      inviteStatus: isActive ? 'invited' : 'inactive',
      invitedAt: isActive ? nowIso : null,
      acceptedAt: null,
      lastInviteSentAt: isActive ? nowIso : null,
      lastInviteChannel: null,
      lastInviteDeliveryStatus: isActive ? 'simulated' : null,
      lastInviteDeliveryNote: isActive
        ? 'Invite prepared for delivery. Connect email provider to send automatically.'
        : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    roster.teachers.unshift(created);
    await this.persistTeacherRoster(workspace.schoolUserId, roster);

    const inviteDispatch = isActive
      ? await this.dispatchTeacherRosterInvite({
          schoolUserId: workspace.schoolUserId,
          schoolName: workspace.schoolName,
          schoolEmail: workspace.schoolEmail,
          teacher: created,
        })
      : null;

    if (inviteDispatch) {
      created.lastInviteChannel = inviteDispatch.channel;
      created.lastInviteDeliveryStatus = inviteDispatch.status;
      created.lastInviteDeliveryNote = inviteDispatch.note;
      await this.persistTeacherRoster(workspace.schoolUserId, roster);
    }

    return {
      message:
        inviteDispatch?.status === 'failed'
          ? 'Teacher added to roster, but invite delivery failed.'
          : 'Teacher added to roster and invite prepared.',
      teacher: created,
      teachers: roster.teachers,
      invite: inviteDispatch,
    };
  }

  async updateTeacherForAuthUser(
    authUser: AuthUserContext,
    teacherId: string,
    input: UpdateSchoolTeacherInput
  ) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    if (!this.isSchoolOrAdmin(authUser)) {
      throw new ForbiddenException('Only school or admin accounts can update teachers.');
    }

    const normalizedTeacherId = this.normalizeRequiredText(teacherId, 'Teacher ID');
    const roster = await this.ensureTeacherRoster(workspace.schoolUserId);
    const target = roster.teachers.find((teacher) => teacher.id === normalizedTeacherId);
    if (!target) {
      throw new NotFoundException('Teacher record was not found.');
    }

    const updatedName =
      typeof input.name === 'string'
        ? this.normalizeRequiredText(input.name, 'Teacher name')
        : target.name;
    const updatedEmail =
      typeof input.email === 'string'
        ? this.normalizeOptionalEmail(input.email)
        : target.email;
    if (!updatedEmail) {
      throw new BadRequestException('Teacher email is required.');
    }

    const normalizedUpdatedEmail = this.normalizeEmail(updatedEmail);
    const emailCollision = roster.teachers.some(
      (teacher) =>
        teacher.id !== target.id && teacher.email === normalizedUpdatedEmail
    );
    if (emailCollision) {
      throw new BadRequestException('Another teacher already uses that email.');
    }

    target.name = updatedName;
    target.email = normalizedUpdatedEmail;
    target.department =
      input.department === undefined ? target.department : this.normalizeOptionalText(input.department);
    target.classGroup =
      input.classGroup === undefined ? target.classGroup : this.normalizeOptionalText(input.classGroup);
    target.subjectFocus =
      input.subjectFocus === undefined ? target.subjectFocus : this.normalizeOptionalText(input.subjectFocus);
    const previousActiveState = target.isActive;
    target.isActive = typeof input.isActive === 'boolean' ? input.isActive : target.isActive;
    if (!target.isActive) {
      target.inviteStatus = 'inactive';
    } else if (!previousActiveState && target.inviteStatus === 'inactive') {
      target.inviteStatus = target.acceptedAt ? 'accepted' : 'invited';
    }
    target.updatedAt = new Date().toISOString();

    await this.persistTeacherRoster(workspace.schoolUserId, roster);

    return {
      message: 'Teacher roster updated.',
      teacher: target,
      teachers: roster.teachers,
    };
  }

  async deleteTeacherForAuthUser(
    authUser: AuthUserContext,
    teacherId: string,
    input?: { schoolEmail?: string }
  ) {
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    if (!this.isSchoolOrAdmin(authUser)) {
      throw new ForbiddenException('Only school or admin accounts can remove teachers.');
    }

    const normalizedTeacherId = this.normalizeRequiredText(teacherId, 'Teacher ID');
    const roster = await this.ensureTeacherRoster(workspace.schoolUserId);
    const nextTeachers = roster.teachers.filter((teacher) => teacher.id !== normalizedTeacherId);
    if (nextTeachers.length === roster.teachers.length) {
      throw new NotFoundException('Teacher record was not found.');
    }

    roster.teachers = nextTeachers;
    await this.persistTeacherRoster(workspace.schoolUserId, roster);

    return {
      message: 'Teacher removed from roster.',
      teachers: roster.teachers,
    };
  }

  async resendTeacherInviteForAuthUser(
    authUser: AuthUserContext,
    teacherId: string,
    input?: { schoolEmail?: string }
  ) {
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    if (!this.isSchoolOrAdmin(authUser)) {
      throw new ForbiddenException('Only school or admin accounts can resend teacher invites.');
    }

    const normalizedTeacherId = this.normalizeRequiredText(teacherId, 'Teacher ID');
    const roster = await this.ensureTeacherRoster(workspace.schoolUserId);
    const target = roster.teachers.find((teacher) => teacher.id === normalizedTeacherId);
    if (!target) {
      throw new NotFoundException('Teacher record was not found.');
    }
    if (!target.isActive) {
      throw new BadRequestException('Activate this teacher before resending invite.');
    }

    const dispatch = await this.dispatchTeacherRosterInvite({
      schoolUserId: workspace.schoolUserId,
      schoolName: workspace.schoolName,
      schoolEmail: workspace.schoolEmail,
      teacher: target,
    });

    target.inviteStatus = target.acceptedAt ? 'accepted' : 'invited';
    target.lastInviteSentAt = new Date().toISOString();
    target.lastInviteChannel = dispatch.channel;
    target.lastInviteDeliveryStatus = dispatch.status;
    target.lastInviteDeliveryNote = dispatch.note;
    target.updatedAt = new Date().toISOString();
    await this.persistTeacherRoster(workspace.schoolUserId, roster);

    return {
      message:
        dispatch.status === 'failed'
          ? 'Teacher invite re-send failed.'
          : 'Teacher invite re-sent successfully.',
      teacher: target,
      teachers: roster.teachers,
      invite: dispatch,
    };
  }

  async listNotificationsForAuthUser(
    authUser: AuthUserContext,
    input?: { schoolEmail?: string }
  ) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const scopeSchoolUserIds = await this.resolveFeedScopeSchoolUserIds(
      authUserRecord,
      input?.schoolEmail
    );
    const viewerRole = this.resolvePrimaryViewerRole(authUserRecord.activeRoles);
    const [allNotifications, readIds] = await Promise.all([
      this.listPersistedNotifications(),
      this.listReadNotificationIds(authUserRecord.email),
    ]);

    const scopedNotifications = allNotifications
      .filter(
        (notification) =>
          (!scopeSchoolUserIds || scopeSchoolUserIds.includes(notification.schoolUserId)) &&
          this.canAuthUserViewNotification({
            authUser,
            authUserRecord,
            viewerRole,
            notification,
          })
      )
      .slice(0, 300);

    const payload = scopedNotifications.map((notification) => {
      const isRead = readIds.has(notification.id);
      return {
        id: notification.id,
        kind: notification.kind,
        sessionId: notification.sessionId,
        title: this.buildNotificationTitle(notification),
        message: this.buildNotificationMessage(notification),
        priority: this.resolveNotificationPriority(notification.kind),
        createdAt: notification.createdAt.toISOString(),
        createdAtLabel: this.toRelativeLabel(notification.createdAt),
        isRead,
        action:
          notification.kind === 'class_assignment' &&
          notification.tutorJoinCode &&
          notification.tutorJoinToken
            ? {
                type: 'verify_teacher_access',
                sessionId: notification.sessionId,
                token: notification.tutorJoinToken,
                code: notification.tutorJoinCode,
                joinLink: notification.tutorJoinLink,
              }
            : null,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      unreadCount: payload.filter((item) => !item.isRead).length,
      notifications: payload,
    };
  }

  async markNotificationAsReadForAuthUser(authUser: AuthUserContext, notificationId: string) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const normalizedNotificationId = String(notificationId || '').trim();
    if (!normalizedNotificationId) {
      throw new BadRequestException('Notification id is required.');
    }

    const allNotifications = await this.listPersistedNotifications();
    const notificationExists = allNotifications.some(
      (notification) => notification.id === normalizedNotificationId
    );
    if (!notificationExists) {
      throw new NotFoundException('Notification could not be found.');
    }

    await this.persistNotificationRead(authUserRecord.email, normalizedNotificationId);
    const readIds = await this.listReadNotificationIds(authUserRecord.email);
    readIds.add(normalizedNotificationId);

    const unreadCount = allNotifications.filter(
      (notification) => !readIds.has(notification.id)
    ).length;

    return {
      notificationId: normalizedNotificationId,
      isRead: true,
      unreadCount,
    };
  }

  async markAllNotificationsAsReadForAuthUser(authUser: AuthUserContext) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const scoped = await this.listNotificationsForAuthUser(authUser);
    await this.persistAllNotificationReads(
      authUserRecord.email,
      scoped.notifications.map((notification) => notification.id)
    );

    return {
      updated: scoped.notifications.length,
      unreadCount: 0,
    };
  }

  async listActivityForAuthUser(
    authUser: AuthUserContext,
    input?: { schoolEmail?: string; limit?: string }
  ) {
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const limit = Math.min(this.normalizeFeedLimit(input?.limit), 30);
    const [notificationsPayload, sessionsPayload] = await Promise.all([
      this.listNotificationsForAuthUser(authUser, { schoolEmail: input?.schoolEmail }),
      this.listSessionsForAuthUser(authUser, {
        status: 'all',
        schoolEmail: input?.schoolEmail,
      }),
    ]);

    const notificationActivities = notificationsPayload.notifications.map((notification) =>
      this.mapNotificationToActivity(notification)
    );
    const sessionActivities = this.mapSessionsToActivities(sessionsPayload.sessions);
    const attendanceActivities = this.mapAttendanceToActivities(
      this.listAttendanceRecordsForSchool(workspace.schoolUserId)
    );

    const combined = [...notificationActivities, ...sessionActivities, ...attendanceActivities]
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, limit);

    return {
      generatedAt: new Date().toISOString(),
      activities: combined.map(({ timestampMs, ...rest }) => rest),
    };
  }

  async listSessionAttendanceForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input?: { schoolEmail?: string }
  ) {
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');
    const session = await this.findManagedSessionForSchool(workspace.schoolUserId, normalizedSessionId);

    if (!session) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    return this.buildSessionAttendanceResponse(session);
  }

  async getLiveAttendanceForAuthUser(authUser: AuthUserContext, sessionId: string) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const viewerRole = this.resolvePrimaryViewerRole(authUserRecord.activeRoles);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');
    const session = await this.findSessionByPublicId(normalizedSessionId);

    if (!session) {
      throw new NotFoundException('This class session does not exist or may have been removed.');
    }

    if (
      !this.canAuthUserViewFeedSession({
        authUser,
        authUserRecord,
        viewerRole,
        session,
      })
    ) {
      throw new ForbiddenException('You do not have access to this class session.');
    }

    return this.buildSessionAttendanceResponse(session);
  }

  async setAttendanceWindowForAuthUser(
    authUser: AuthUserContext,
    input: SetSessionAttendanceWindowInput
  ) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const viewerRole = this.resolvePrimaryViewerRole(authUserRecord.activeRoles);
    const normalizedSessionId = this.normalizeRequiredText(input.sessionId, 'Session ID');
    const normalizedAction = this.normalizeAttendanceWindowAction(input.action);
    const session = await this.findSessionByPublicId(normalizedSessionId);

    if (!session) {
      throw new NotFoundException('This class session does not exist or may have been removed.');
    }

    if (
      !this.canAuthUserManageSessionAttendance({
        authUserRecord,
        viewerRole,
        session,
      })
    ) {
      throw new ForbiddenException('Only the school or assigned teacher can manage attendance.');
    }

    const currentWindow = this.parseAttendanceWindowMetadata(session.metadata);
    const nextWindow =
      normalizedAction === 'open'
        ? {
            isOpen: true,
            openedAt: new Date().toISOString(),
            openedByName: authUserRecord.name || authUserRecord.email,
            closedAt: null,
            gracePeriodMinutes: ATTENDANCE_LATE_GRACE_PERIOD_MINUTES,
          }
        : {
            isOpen: false,
            openedAt: currentWindow.openedAt,
            openedByName: currentWindow.openedByName,
            closedAt: new Date().toISOString(),
            gracePeriodMinutes: currentWindow.gracePeriodMinutes,
          };

    const updatedSession = await this.persistAttendanceWindowForSession(session, nextWindow);

    return {
      message:
        normalizedAction === 'open'
          ? 'Attendance is now open for this class.'
          : 'Attendance has been closed for this class.',
      attendance: this.buildSessionAttendanceResponse(updatedSession),
      window: nextWindow,
    };
  }

  async upsertManualAttendanceForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input: UpsertManualSessionAttendanceInput
  ) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');
    const session = await this.findManagedSessionForSchool(workspace.schoolUserId, normalizedSessionId);

    if (!session) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    const participantName = this.normalizeRequiredText(input.participantName, 'Student name');
    const participantId = this.normalizeOptionalText(input.participantId);
    const status = this.normalizeAttendanceStatus(input.status);
    const note = this.normalizeOptionalText(input.note);
    const participantKey = participantId
      ? this.buildAttendanceParticipantKey(participantId)
      : `manual:${this.slugifyAttendanceLabel(participantName)}`;

    const nextRecord = this.upsertAttendanceRecord({
      schoolUserId: session.schoolUserId,
      sessionId: session.publicId,
      sessionTitle: session.title,
      sessionSubject: session.subject,
      participantKey,
      participantId,
      participantName,
      participantRole: 'student',
      status,
      source: 'manual',
      joinedAt: null,
      lastSeenAt: null,
      leftAt: null,
      checkedInAt: null,
      manualMarkedAt: new Date(),
      note,
    });

    return {
      message:
        status === 'absent'
          ? `${participantName} marked absent for this class.`
          : `${participantName} marked present for this class.`,
      record: this.mapAttendanceRecord(nextRecord),
      attendance: this.buildSessionAttendanceResponse(session),
    };
  }

  async updateAttendanceRecordForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    attendanceId: string,
    input: UpdateSessionAttendanceInput
  ) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');
    const normalizedAttendanceId = this.normalizeRequiredText(attendanceId, 'Attendance ID');
    const session = await this.findManagedSessionForSchool(workspace.schoolUserId, normalizedSessionId);

    if (!session) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    const existing = this.findAttendanceRecordById(
      workspace.schoolUserId,
      normalizedSessionId,
      normalizedAttendanceId
    );

    if (!existing) {
      throw new NotFoundException('Attendance record was not found for this class.');
    }

    existing.status = this.normalizeAttendanceStatus(input.status);
    existing.note = this.normalizeOptionalText(input.note);
    existing.checkedInAt =
      existing.source === 'check_in' &&
      (existing.status === 'present' || existing.status === 'late')
        ? existing.checkedInAt
        : null;
    existing.manualMarkedAt = new Date();
    existing.updatedAt = new Date();
    this.persistAttendanceRecordsToDisk();

    return {
      message:
        existing.status === 'absent'
          ? `${existing.participantName} marked absent.`
          : `${existing.participantName} marked present.`,
      record: this.mapAttendanceRecord(existing),
      attendance: this.buildSessionAttendanceResponse(session),
    };
  }

  async recordAttendanceForAuthUser(authUser: AuthUserContext, input: RecordSessionAttendanceInput) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const viewerRole = this.resolvePrimaryViewerRole(authUserRecord.activeRoles);
    const normalizedSessionId = this.normalizeRequiredText(input.sessionId, 'Session ID');
    const normalizedAction = this.normalizeAttendanceAction(input.action);
    const session = await this.findSessionByPublicId(normalizedSessionId);

    if (!session) {
      throw new NotFoundException('This class session does not exist or may have been removed.');
    }

    if (
      !this.canAuthUserViewFeedSession({
        authUser,
        authUserRecord,
        viewerRole,
        session,
      })
    ) {
      throw new ForbiddenException('You do not have access to this class session.');
    }

    if (viewerRole !== 'student') {
      return {
        recorded: false,
        ignored: true,
      };
    }

    const participantName =
      this.normalizeOptionalText(input.participantName) ||
      authUserRecord.name ||
      authUserRecord.email.split('@')[0] ||
      'Student';
    const participantId = this.normalizeOptionalText(input.participantId) || String(authUserRecord.id);
    const participantKey = this.buildAttendanceParticipantKey(`${authUserRecord.email}:${participantId}`);
    const now = new Date();
    const existing = this.findAttendanceRecordForParticipant(
      session.schoolUserId,
      session.publicId,
      participantKey,
      participantName
    );

    const attendanceWindow = this.parseAttendanceWindowMetadata(session.metadata);
    if (normalizedAction === 'check_in') {
      if (!attendanceWindow.isOpen) {
        throw new BadRequestException('Attendance is not open for this class right now.');
      }
    }
    const checkedInStatus =
      normalizedAction === 'check_in'
        ? this.resolveCheckedInAttendanceStatus(attendanceWindow, now)
        : null;

    const record = existing
      ? this.updateExistingAttendanceRecord(existing, {
          participantId,
          participantName,
          participantRole: 'student',
          status:
            checkedInStatus ||
            (existing.status === 'present' || existing.status === 'late'
              ? existing.status
                : existing.status === 'absent'
                  ? 'absent'
                  : 'pending'),
          source:
            normalizedAction === 'check_in'
              ? 'check_in'
              : existing.source === 'manual' || existing.source === 'check_in'
                ? existing.source
                : 'live',
          joinedAt: normalizedAction === 'join' ? existing.joinedAt || now : existing.joinedAt || now,
          lastSeenAt: now,
          leftAt: normalizedAction === 'leave' ? now : null,
          checkedInAt: normalizedAction === 'check_in' ? now : existing.checkedInAt,
          manualMarkedAt: existing.manualMarkedAt,
          note: this.normalizeOptionalText(input.note) || existing.note,
          sessionTitle: session.title,
          sessionSubject: session.subject,
        })
      : this.upsertAttendanceRecord({
          schoolUserId: session.schoolUserId,
          sessionId: session.publicId,
          sessionTitle: session.title,
          sessionSubject: session.subject,
          participantKey,
          participantId,
          participantName,
          participantRole: 'student',
          status: checkedInStatus || 'pending',
          source: normalizedAction === 'check_in' ? 'check_in' : 'live',
          joinedAt: now,
          lastSeenAt: now,
          leftAt: normalizedAction === 'leave' ? now : null,
          checkedInAt: normalizedAction === 'check_in' ? now : null,
          manualMarkedAt: null,
          note: this.normalizeOptionalText(input.note),
        });

    return {
      recorded: true,
      action: normalizedAction,
      record: this.mapAttendanceRecord(record),
      attendance: this.buildSessionAttendanceResponse(session),
    };
  }

  async listScheduleFeedForAuthUser(authUser: AuthUserContext, input: ListScheduleFeedInput) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const normalizedStatus = this.normalizeStatus(input.status);
    const normalizedSearch = this.normalizeOptionalText(input.search);
    const limit = this.normalizeFeedLimit(input.limit);
    const scopeSchoolUserIds = await this.resolveFeedScopeSchoolUserIds(authUserRecord, input.schoolEmail);

    const where: Prisma.SchoolScheduleSessionWhereInput = {
      ...(scopeSchoolUserIds ? { schoolUserId: { in: scopeSchoolUserIds } } : {}),
    };

    const dateFrom = this.parseOptionalDate(input.dateFrom);
    const dateTo = this.parseOptionalDate(input.dateTo);
    if (dateFrom || dateTo) {
      where.startAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    if (normalizedSearch) {
      where.OR = [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          subject: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          instructor: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          roomCode: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          schoolUser: {
            is: {
              name: {
                contains: normalizedSearch,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const sessions = await this.prisma.schoolScheduleSession
      .findMany({
        where,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
        include: {
          schoolUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        take: limit,
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          const fallbackSessions = this.listFallbackSessionsForScope(scopeSchoolUserIds);
          return fallbackSessions.map((session) => ({
            ...session,
            schoolUser: {
              id: session.schoolUserId,
              email: session.schoolEmail,
              name: session.schoolName,
            },
          }));
        }
        throw error;
      });

    const nowMs = Date.now();
    const viewerRole = this.resolvePrimaryViewerRole(authUserRecord.activeRoles);
    const mapped = sessions
      .filter((session) =>
        this.canAuthUserViewFeedSession({
          authUser,
          authUserRecord,
          viewerRole,
          session,
        })
      )
      .map((session) => ({
        ...this.mapSession(session, nowMs, { includeTeacherAccess: false }),
        school: {
          userId: String(session.schoolUser.id),
          email: session.schoolUser.email,
          name: session.schoolUser.name || session.schoolUser.email,
        },
      }))
      .filter((session) => normalizedStatus === 'all' || session.status === normalizedStatus);

    return {
      generatedAt: new Date().toISOString(),
      viewer: {
        userId: String(authUserRecord.id),
        email: authUserRecord.email,
        role: viewerRole,
      },
      sessions: mapped,
    };
  }

  async createSessionForAuthUser(authUser: AuthUserContext, input: CreateSchoolSessionInput) {
    this.assertSchoolOrAdminRole(authUser, 'Only school or admin accounts can schedule classes.');
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const title = this.normalizeRequiredText(input.title, 'Class title');
    const subject = this.normalizeRequiredText(input.subject, 'Subject');
    const instructor = this.normalizeRequiredText(input.instructor, 'Instructor');
    const startAt = this.parseRequiredDate(input.startAt, 'Start time');

    const durationMinutes = this.resolveDurationMinutes(input.durationMinutes);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const expectedStudents = this.resolveExpectedStudents(input.expectedStudents);
    const attendanceWindow: SessionAttendanceWindowState = {
      isOpen: false,
      openedAt: null,
      openedByName: null,
      closedAt: null,
      gracePeriodMinutes: this.resolveAttendanceGracePeriodMinutes(input.attendanceGracePeriodMinutes),
    };

    const roomCode =
      this.normalizeOptionalText(input.roomCode)?.toUpperCase() ||
      `ROOM-${subject.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const notes = this.normalizeOptionalText(input.notes);
    const teacherAccess = await this.hydrateTeacherAssignmentForSchedule(
      workspace.schoolUserId,
      this.createTeacherAccessPayload({
        assignedTutorEmail: input.assignedTutorEmail,
        assignedTutorName: input.assignedTutorName,
        department: input.department,
        classGroup: input.classGroup,
        audienceTag: input.audienceTag,
      })
    );

    await this.assertNoScheduleCollision({
      schoolUserId: workspace.schoolUserId,
      startAt,
      endAt,
      instructor,
      roomCode,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      audienceTag: teacherAccess.audienceTag,
    });

    const created = await this.prisma.schoolScheduleSession
      .create({
        data: {
          publicId: this.createPublicId('SCH', workspace.schoolUserId),
          schoolUserId: workspace.schoolUserId,
          title,
          subject,
          instructor,
          startAt,
          endAt,
          durationMinutes,
          expectedStudents,
          roomCode,
          notes,
          metadata: this.withAttendanceWindowMetadata(
            this.withTeacherAccessMetadata(null, teacherAccess),
            attendanceWindow
          ),
        },
      })
      .catch((error) => {
        if (!this.isPrismaUnavailableError(error)) {
          throw error;
        }
        const now = new Date();
        return this.saveFallbackSession({
          id: this.nextFallbackSessionId(),
          publicId: this.createPublicId('SCH', workspace.schoolUserId),
          schoolUserId: workspace.schoolUserId,
          schoolEmail: workspace.schoolEmail,
          schoolName: workspace.schoolName,
          title,
          subject,
          instructor,
          startAt,
          endAt,
          durationMinutes,
          expectedStudents,
          roomCode,
          notes,
          metadata: this.withAttendanceWindowMetadata(
            this.withTeacherAccessMetadata(null, teacherAccess),
            attendanceWindow
          ) as Prisma.JsonValue,
          createdAt: now,
          updatedAt: now,
        });
      });

    await this.pushScheduleNotification({
      kind: 'created',
      schoolUserId: workspace.schoolUserId,
      schoolName: workspace.schoolName,
      sessionId: created.publicId,
      sessionTitle: created.title,
      subject: created.subject,
      instructor: created.instructor,
      roomCode: created.roomCode,
      startAt: created.startAt,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      department: teacherAccess.department,
      classGroup: teacherAccess.classGroup,
      audienceTag: teacherAccess.audienceTag,
    });

    const classInviteDispatch =
      teacherAccess.assignedTutorEmail && teacherAccess.tutorJoinCode && teacherAccess.tutorJoinToken
        ? await this.dispatchClassAssignmentInvite({
            schoolUserId: workspace.schoolUserId,
            schoolName: workspace.schoolName,
            schoolEmail: workspace.schoolEmail,
            teacherEmail: teacherAccess.assignedTutorEmail,
            teacherName: teacherAccess.assignedTutorName,
            session: created,
            teacherAccess,
          })
        : null;

    return {
      session: this.mapSession(created, Date.now(), { includeTeacherAccess: true }),
      message: classInviteDispatch
        ? 'Class session scheduled successfully. Teacher class invite prepared.'
        : 'Class session scheduled successfully.',
      classInvite: classInviteDispatch,
    };
  }

  async getTeacherAccessForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input?: { schoolEmail?: string }
  ) {
    this.assertSchoolOrAdminRole(
      authUser,
      'Only school or admin accounts can manage teacher access links.'
    );
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');

    const existing = await this.prisma.schoolScheduleSession
      .findFirst({
        where: {
          publicId: normalizedSessionId,
          schoolUserId: workspace.schoolUserId,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.findFallbackSessionForSchool(workspace.schoolUserId, normalizedSessionId);
        }
        throw error;
      });

    if (!existing) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    const teacherAccess = this.parseTeacherAccessMetadata(existing.metadata);
    return {
      sessionId: existing.publicId,
      roomCode: existing.roomCode,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      assignedTutorName: teacherAccess.assignedTutorName,
      department: teacherAccess.department,
      classGroup: teacherAccess.classGroup,
      audienceTag: teacherAccess.audienceTag,
      tutorAccessCode: teacherAccess.tutorJoinCode,
      tutorJoinLink: this.buildTutorJoinLink(
        existing.publicId,
        teacherAccess.tutorJoinToken,
        teacherAccess.tutorJoinCode
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  async regenerateTeacherAccessForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input?: RegenerateTeacherAccessInput
  ) {
    this.assertSchoolOrAdminRole(
      authUser,
      'Only school or admin accounts can regenerate teacher access links.'
    );
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');

    const existing = await this.prisma.schoolScheduleSession
      .findFirst({
        where: {
          publicId: normalizedSessionId,
          schoolUserId: workspace.schoolUserId,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.findFallbackSessionForSchool(workspace.schoolUserId, normalizedSessionId);
        }
        throw error;
      });

    if (!existing) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    const currentAccess = this.parseTeacherAccessMetadata(existing.metadata);
    const regeneratedAccess = this.createTeacherAccessPayload({
      assignedTutorEmail: currentAccess.assignedTutorEmail || undefined,
      assignedTutorName: currentAccess.assignedTutorName || undefined,
      department: currentAccess.department || undefined,
      classGroup: currentAccess.classGroup || undefined,
      audienceTag: currentAccess.audienceTag || undefined,
    });

    await this.prisma.schoolScheduleSession
      .update({
        where: {
          id: existing.id,
        },
        data: {
          metadata: this.withTeacherAccessMetadata(existing.metadata, regeneratedAccess),
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          this.updateFallbackSession(existing.schoolUserId, existing.publicId, {
            metadata: this.withTeacherAccessMetadata(
              existing.metadata,
              regeneratedAccess
            ) as Prisma.JsonValue,
            updatedAt: new Date(),
          });
          return null;
        }
        throw error;
      });

    return {
      sessionId: existing.publicId,
      roomCode: existing.roomCode,
      assignedTutorEmail: regeneratedAccess.assignedTutorEmail,
      assignedTutorName: regeneratedAccess.assignedTutorName,
      department: regeneratedAccess.department,
      classGroup: regeneratedAccess.classGroup,
      audienceTag: regeneratedAccess.audienceTag,
      tutorAccessCode: regeneratedAccess.tutorJoinCode,
      tutorJoinLink: this.buildTutorJoinLink(
        existing.publicId,
        regeneratedAccess.tutorJoinToken,
        regeneratedAccess.tutorJoinCode
      ),
      message: 'Tutor access link and code regenerated successfully.',
      generatedAt: new Date().toISOString(),
    };
  }

  async verifyTeacherAccessForAuthUser(authUser: AuthUserContext, input: VerifyTeacherAccessInput) {
    const hasAuthIdentity = Boolean(authUser?.id || authUser?.email);
    const authUserRecord = hasAuthIdentity ? await this.resolveAuthUserRecord(authUser) : null;
    const normalizedSessionId = this.normalizeRequiredText(input.sessionId, 'Session ID');
    const normalizedToken = this.normalizeRequiredText(input.token, 'Teacher access token');
    const normalizedCode = this.normalizeRequiredText(input.code, 'Teacher access code');
    const normalizedCodeDigits = normalizedCode.replace(/\D+/g, '').slice(0, 6);

    const existing = await this.prisma.schoolScheduleSession
      .findUnique({
        where: {
          publicId: normalizedSessionId,
        },
        include: {
          schoolUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });

    const fallback = this.findFallbackSessionByPublicId(normalizedSessionId);
    const fallbackResolved = fallback
      ? {
          ...fallback,
          schoolUser: {
            id: fallback.schoolUserId,
            email: fallback.schoolEmail,
            name: fallback.schoolName,
          },
        }
      : null;

    let resolvedExisting = existing || fallbackResolved;

    if (!resolvedExisting) {
      throw new NotFoundException('This class session does not exist or may have been removed.');
    }

    let teacherAccess = this.parseTeacherAccessMetadata(resolvedExisting.metadata);
    if (!teacherAccess.tutorJoinCode || !teacherAccess.tutorJoinToken) {
      throw new ForbiddenException('Teacher access has not been configured for this class yet.');
    }

    const isSchoolOwner = authUserRecord ? authUserRecord.id === resolvedExisting.schoolUserId : false;
    const isAssignedTutor =
      authUserRecord &&
      Boolean(teacherAccess.assignedTutorEmail) &&
      teacherAccess.assignedTutorEmail === authUserRecord.email;
    if (authUserRecord && !authUserRecord.isAdmin && !isSchoolOwner && !isAssignedTutor) {
      throw new ForbiddenException('You are not assigned to teach this class.');
    }

    const storedCodeDigits = String(teacherAccess.tutorJoinCode || '').replace(/\D+/g, '').slice(0, 6);
    if (
      teacherAccess.tutorJoinToken !== normalizedToken ||
      storedCodeDigits !== normalizedCodeDigits
    ) {
      if (fallbackResolved && fallbackResolved !== resolvedExisting) {
        const fallbackAccess = this.parseTeacherAccessMetadata(fallbackResolved.metadata);
        const fallbackCodeDigits = String(fallbackAccess.tutorJoinCode || '')
          .replace(/\D+/g, '')
          .slice(0, 6);
        if (fallbackAccess.tutorJoinToken === normalizedToken && fallbackCodeDigits === normalizedCodeDigits) {
          resolvedExisting = fallbackResolved;
          teacherAccess = fallbackAccess;
        } else {
          throw new ForbiddenException('Teacher access token or code is invalid for this class.');
        }
      } else {
      throw new ForbiddenException('Teacher access token or code is invalid for this class.');
      }
    }

    const ensuredExisting = resolvedExisting as NonNullable<typeof resolvedExisting>;

    if (isAssignedTutor && authUserRecord) {
      await this.markTeacherInviteAcceptedForSchool(ensuredExisting.schoolUserId, authUserRecord.email);
      if (
        !this.notifications.some(
          (notification) =>
            notification.kind === 'teacher_access_accepted' &&
            notification.sessionId === ensuredExisting.publicId &&
            notification.targetEmail === authUserRecord.email
        )
      ) {
        await this.pushScheduleNotification({
          kind: 'teacher_access_accepted',
          schoolUserId: ensuredExisting.schoolUserId,
          schoolName: ensuredExisting.schoolUser.name || ensuredExisting.schoolUser.email,
          sessionId: ensuredExisting.publicId,
          sessionTitle: ensuredExisting.title,
          subject: ensuredExisting.subject,
          instructor: ensuredExisting.instructor,
          roomCode: ensuredExisting.roomCode,
          startAt: ensuredExisting.startAt,
          assignedTutorEmail: authUserRecord.email,
          department: teacherAccess.department,
          classGroup: teacherAccess.classGroup,
          audienceTag: teacherAccess.audienceTag,
          targetEmail: authUserRecord.email,
        });
      }
    }

    return {
      verified: true,
      session: {
        ...this.mapSession(ensuredExisting, Date.now(), { includeTeacherAccess: false }),
        school: {
          userId: String(ensuredExisting.schoolUser.id),
          email: ensuredExisting.schoolUser.email,
          name: ensuredExisting.schoolUser.name || ensuredExisting.schoolUser.email,
        },
      },
      launch: {
        liveClassPath: `/live-class/${encodeURIComponent(ensuredExisting.publicId)}?role=teacher&actor=school`,
        roomCode: ensuredExisting.roomCode,
      },
    };
  }

  async updateSessionForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input: UpdateSchoolSessionInput
  ) {
    this.assertSchoolOrAdminRole(authUser, 'Only school or admin accounts can update classes.');
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');

    const existing = await this.prisma.schoolScheduleSession.findFirst({
      where: {
        publicId: normalizedSessionId,
        schoolUserId: workspace.schoolUserId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Class session was not found in this schedule workspace.');
    }

    const title =
      typeof input.title === 'string'
        ? this.normalizeRequiredText(input.title, 'Class title')
        : existing.title;
    const subject =
      typeof input.subject === 'string'
        ? this.normalizeRequiredText(input.subject, 'Subject')
        : existing.subject;
    const instructor =
      typeof input.instructor === 'string'
        ? this.normalizeRequiredText(input.instructor, 'Instructor')
        : existing.instructor;

    const startAt = typeof input.startAt === 'string'
      ? this.parseRequiredDate(input.startAt, 'Start time')
      : existing.startAt;

    const durationMinutes = this.resolveDurationMinutes(
      typeof input.durationMinutes === 'number' ? input.durationMinutes : existing.durationMinutes
    );

    const expectedStudents = this.resolveExpectedStudents(
      typeof input.expectedStudents === 'number' ? input.expectedStudents : existing.expectedStudents
    );
    const existingAttendanceWindow = this.parseAttendanceWindowMetadata(existing.metadata);
    const attendanceWindow: SessionAttendanceWindowState = {
      ...existingAttendanceWindow,
      gracePeriodMinutes:
        typeof input.attendanceGracePeriodMinutes === 'number'
          ? this.resolveAttendanceGracePeriodMinutes(input.attendanceGracePeriodMinutes)
          : existingAttendanceWindow.gracePeriodMinutes,
    };

    const roomCode =
      typeof input.roomCode === 'string'
        ? this.normalizeRequiredText(input.roomCode, 'Room code').toUpperCase()
        : existing.roomCode;

    const notes =
      typeof input.notes === 'string'
        ? this.normalizeOptionalText(input.notes)
        : input.notes === null
          ? null
          : existing.notes;
    const existingTeacherAccess = this.parseTeacherAccessMetadata(existing.metadata);
    const teacherAccess = await this.hydrateTeacherAssignmentForSchedule(
      workspace.schoolUserId,
      this.mergeTeacherAccessPayload(existingTeacherAccess, {
        assignedTutorEmail: input.assignedTutorEmail,
        assignedTutorName: input.assignedTutorName,
        department: input.department,
        classGroup: input.classGroup,
        audienceTag: input.audienceTag,
      })
    );

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    await this.assertNoScheduleCollision({
      schoolUserId: workspace.schoolUserId,
      startAt,
      endAt,
      instructor,
      roomCode,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      audienceTag: teacherAccess.audienceTag,
      excludeSessionRecordId: existing.id,
    });

    const updated = await this.prisma.schoolScheduleSession.update({
      where: {
        id: existing.id,
      },
      data: {
        title,
        subject,
        instructor,
        startAt,
        endAt,
        durationMinutes,
        expectedStudents,
        roomCode,
        notes,
        metadata: this.withAttendanceWindowMetadata(
          this.withTeacherAccessMetadata(existing.metadata, teacherAccess),
          attendanceWindow
        ),
      },
    });

    await this.pushScheduleNotification({
      kind: 'updated',
      schoolUserId: workspace.schoolUserId,
      schoolName: workspace.schoolName,
      sessionId: updated.publicId,
      sessionTitle: updated.title,
      subject: updated.subject,
      instructor: updated.instructor,
      roomCode: updated.roomCode,
      startAt: updated.startAt,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      department: teacherAccess.department,
      classGroup: teacherAccess.classGroup,
      audienceTag: teacherAccess.audienceTag,
    });

    return {
      session: this.mapSession(updated, Date.now(), { includeTeacherAccess: true }),
      message: 'Class session updated successfully.',
    };
  }

  async deleteSessionForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input?: { schoolEmail?: string }
  ) {
    this.assertSchoolOrAdminRole(authUser, 'Only school or admin accounts can cancel classes.');
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');

    const existing = await this.prisma.schoolScheduleSession.findFirst({
      where: {
        publicId: normalizedSessionId,
        schoolUserId: workspace.schoolUserId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Class session was not found in this school schedule.');
    }

    await this.prisma.schoolScheduleSession.delete({
      where: {
        id: existing.id,
      },
    });

    const existingTeacherAccess = this.parseTeacherAccessMetadata(existing.metadata);

    await this.pushScheduleNotification({
      kind: 'canceled',
      schoolUserId: workspace.schoolUserId,
      schoolName: workspace.schoolName,
      sessionId: existing.publicId,
      sessionTitle: existing.title,
      subject: existing.subject,
      instructor: existing.instructor,
      roomCode: existing.roomCode,
      startAt: existing.startAt,
      assignedTutorEmail: existingTeacherAccess.assignedTutorEmail,
      department: existingTeacherAccess.department,
      classGroup: existingTeacherAccess.classGroup,
      audienceTag: existingTeacherAccess.audienceTag,
    });

    return {
      sessionId: normalizedSessionId,
      message: 'Class session removed from schedule.',
    };
  }

  private async resolveWorkspace(authUser: AuthUserContext, schoolEmail?: string) {
    const authUserRecord = await this.resolveAuthUserRecord(authUser);
    const isTutor = authUserRecord.activeRoles.has('tutor');
    if (!authUserRecord.isSchool && !authUserRecord.isAdmin && !isTutor) {
      throw new ForbiddenException(
        'Only school, tutor, and admin accounts can access class schedule workspace.'
      );
    }

    const normalizedTargetSchoolEmail = this.normalizeEmail(schoolEmail);
    if (
      isTutor &&
      normalizedTargetSchoolEmail &&
      normalizedTargetSchoolEmail !== authUserRecord.email
    ) {
      throw new ForbiddenException('Tutor accounts can only manage their own class schedule.');
    }
    if (
      authUserRecord.isAdmin &&
      normalizedTargetSchoolEmail &&
      normalizedTargetSchoolEmail !== authUserRecord.email
    ) {
      const targetSchoolUser = await this.resolveSchoolAccountByEmail(normalizedTargetSchoolEmail);
      return {
        schoolUserId: targetSchoolUser.id,
        schoolEmail: targetSchoolUser.email,
        schoolName: targetSchoolUser.name || targetSchoolUser.email,
      } satisfies ResolveWorkspaceResult;
    }

    return {
      schoolUserId: authUserRecord.id,
      schoolEmail: authUserRecord.email,
      schoolName: authUserRecord.name || authUserRecord.email,
    } satisfies ResolveWorkspaceResult;
  }

  private isSchoolOrAdmin(authUser: AuthUserContext) {
    const role = this.normalizeApiRole(authUser.role);
    return role === 'school' || role === 'admin';
  }

  private assertSchoolOrAdminRole(authUser: AuthUserContext, message: string) {
    if (!this.isSchoolOrAdmin(authUser)) {
      throw new ForbiddenException(message);
    }
  }

  private async resolveFeedScopeSchoolUserIds(
    authUserRecord: AuthUserRecord,
    schoolEmail?: string
  ): Promise<number[] | null> {
    const normalizedTargetSchoolEmail = this.normalizeEmail(schoolEmail);

    if (authUserRecord.isAdmin) {
      if (!normalizedTargetSchoolEmail) {
        return null;
      }
      const targetSchoolUser = await this.resolveSchoolAccountByEmail(normalizedTargetSchoolEmail);
      return [targetSchoolUser.id];
    }

    if (authUserRecord.isSchool) {
      if (
        normalizedTargetSchoolEmail &&
        normalizedTargetSchoolEmail !== authUserRecord.email
      ) {
        throw new ForbiddenException('School accounts can only read their own class feed.');
      }
      return [authUserRecord.id];
    }

    if (!normalizedTargetSchoolEmail) {
      return null;
    }

    const targetSchoolUser = await this.resolveSchoolAccountByEmail(normalizedTargetSchoolEmail);
    return [targetSchoolUser.id];
  }

  private async resolveAuthUserRecord(authUser: AuthUserContext): Promise<AuthUserRecord> {
    const normalizedAuthEmail = this.normalizeEmail(authUser.email);
    if (!normalizedAuthEmail) {
      throw new ForbiddenException('You must be signed in to access school schedule workspace.');
    }

    const record = await this.prisma.user
      .findUnique({
        where: {
          email: normalizedAuthEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          accountRoles: {
            where: {
              status: AccountRoleStatus.ACTIVE,
            },
            select: {
              role: true,
            },
          },
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });

    if (!record) {
      if (this.isPrismaConnectivityBypassed()) {
        return this.resolveFallbackAuthUserRecord(authUser, normalizedAuthEmail);
      }
      throw new ForbiddenException('Authenticated account was not found in the user directory.');
    }

    const activeRoles = new Set<string>([this.normalizeApiRole(record.role)]);
    record.accountRoles.forEach((role) => {
      activeRoles.add(this.mapAccountRoleToApiRole(role.role));
    });

    const roleFromAuthMetadata = this.normalizeApiRole(authUser.role);
    if (roleFromAuthMetadata) {
      activeRoles.add(roleFromAuthMetadata);
    }

    return {
      id: record.id,
      email: record.email,
      name: record.name,
      activeRoles,
      isSchool: activeRoles.has('school'),
      isAdmin: activeRoles.has('admin'),
    };
  }

  private async resolveSchoolAccountByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('School email is required.');
    }

    const targetSchoolUser = await this.prisma.user
      .findUnique({
        where: {
          email: normalizedEmail,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          accountRoles: {
            where: {
              status: AccountRoleStatus.ACTIVE,
            },
            select: {
              role: true,
            },
          },
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });

    if (!targetSchoolUser) {
      if (this.isPrismaConnectivityBypassed()) {
        return {
          id: this.resolveFallbackUserId(normalizedEmail),
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0] || normalizedEmail,
          role: 'school',
          accountRoles: [{ role: AccountRole.SCHOOL }],
        };
      }
      throw new NotFoundException('Target school account was not found.');
    }

    const targetRoles = new Set<string>([this.normalizeApiRole(targetSchoolUser.role)]);
    targetSchoolUser.accountRoles.forEach((role) => {
      targetRoles.add(this.mapAccountRoleToApiRole(role.role));
    });

    if (!targetRoles.has('school')) {
      throw new BadRequestException('The selected account is not a school workspace.');
    }

    return targetSchoolUser;
  }

  private resolvePrimaryViewerRole(activeRoles: Set<string>) {
    if (activeRoles.has('admin')) {
      return 'admin';
    }
    if (activeRoles.has('school')) {
      return 'school';
    }
    if (activeRoles.has('tutor')) {
      return 'tutor';
    }
    return 'student';
  }

  private isPrismaConnectivityBypassed() {
    return String(process.env.SKIP_PRISMA_CONNECT || '').trim() === '1';
  }

  private isPrismaUnavailableError(error: unknown) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return true;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return ['P1014', 'P2021', 'P2022'].includes(error.code);
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("can't reach database server") ||
        message.includes('connection refused') ||
        message.includes('failed to connect')
      );
    }
    return false;
  }

  private resolveFallbackAuthUserRecord(
    authUser: AuthUserContext,
    normalizedAuthEmail: string
  ): AuthUserRecord {
    const activeRoles = new Set<string>();
    const roleFromAuthMetadata = this.normalizeApiRole(authUser.role);
    if (roleFromAuthMetadata) {
      activeRoles.add(roleFromAuthMetadata);
    }
    if (activeRoles.size === 0) {
      activeRoles.add('school');
    }

    return {
      id: this.resolveFallbackUserId(normalizedAuthEmail),
      email: normalizedAuthEmail,
      name: this.normalizeOptionalText(authUser.name),
      activeRoles,
      isSchool: activeRoles.has('school'),
      isAdmin: activeRoles.has('admin'),
    };
  }

  private resolveFallbackUserId(email: string) {
    let hash = 0;
    for (let index = 0; index < email.length; index += 1) {
      hash = (hash * 31 + email.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) || 1;
  }

  private nextFallbackSessionId() {
    const next = this.fallbackSessionAutoId;
    this.fallbackSessionAutoId += 1;
    return next;
  }

  private listFallbackSessionsForSchool(schoolUserId: number) {
    return [...(this.fallbackSessionsBySchoolId.get(schoolUserId) || [])].sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime()
    );
  }

  private listFallbackSessionsForScope(scopeSchoolUserIds: number[] | null) {
    const collected: FallbackSchoolScheduleSessionRecord[] = [];
    this.fallbackSessionsBySchoolId.forEach((sessions, schoolUserId) => {
      if (scopeSchoolUserIds && !scopeSchoolUserIds.includes(schoolUserId)) {
        return;
      }
      collected.push(...sessions);
    });
    return collected.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  private findFallbackSessionForSchool(schoolUserId: number, publicId: string) {
    return this.listFallbackSessionsForSchool(schoolUserId).find(
      (session) => session.publicId === publicId
    ) || null;
  }

  private findFallbackSessionByPublicId(publicId: string) {
    for (const sessions of this.fallbackSessionsBySchoolId.values()) {
      const match = sessions.find((session) => session.publicId === publicId);
      if (match) {
        return match;
      }
    }
    return null;
  }

  private saveFallbackSession(session: FallbackSchoolScheduleSessionRecord) {
    const existing = this.fallbackSessionsBySchoolId.get(session.schoolUserId) || [];
    this.fallbackSessionsBySchoolId.set(session.schoolUserId, [session, ...existing]);
    this.persistFallbackSessionsToDisk();
    return session;
  }

  private updateFallbackSession(
    schoolUserId: number,
    publicId: string,
    patch: Partial<FallbackSchoolScheduleSessionRecord>
  ) {
    const sessions = this.fallbackSessionsBySchoolId.get(schoolUserId) || [];
    const target = sessions.find((session) => session.publicId === publicId);
    if (!target) {
      return null;
    }
    Object.assign(target, patch);
    this.persistFallbackSessionsToDisk();
    return target;
  }

  private listAttendanceRecordsForSchool(schoolUserId: number) {
    return [...(this.attendanceRecordsBySchoolId.get(schoolUserId) || [])].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  private listAttendanceRecordsForSession(schoolUserId: number, sessionId: string) {
    return this.listAttendanceRecordsForSchool(schoolUserId).filter(
      (record) => record.sessionId === sessionId
    );
  }

  private findAttendanceRecordById(schoolUserId: number, sessionId: string, attendanceId: string) {
    return (
      this.listAttendanceRecordsForSession(schoolUserId, sessionId).find(
        (record) => record.id === attendanceId
      ) || null
    );
  }

  private findAttendanceRecordForParticipant(
    schoolUserId: number,
    sessionId: string,
    participantKey: string,
    participantName?: string | null
  ) {
    const normalizedParticipantName = this.slugifyAttendanceLabel(participantName || '');
    return (
      this.listAttendanceRecordsForSession(schoolUserId, sessionId).find((record) => {
        if (record.participantKey === participantKey) {
          return true;
        }
        if (!normalizedParticipantName) {
          return false;
        }
        return this.slugifyAttendanceLabel(record.participantName) === normalizedParticipantName;
      }) || null
    );
  }

  private upsertAttendanceRecord(input: {
    schoolUserId: number;
    sessionId: string;
    sessionTitle: string;
    sessionSubject: string;
    participantKey: string;
    participantId: string | null;
    participantName: string;
    participantRole: 'student' | 'tutor' | 'school';
    status: SessionAttendanceStatus;
    source: SessionAttendanceSource;
    joinedAt: Date | null;
    lastSeenAt: Date | null;
    leftAt: Date | null;
    checkedInAt: Date | null;
    manualMarkedAt: Date | null;
    note: string | null;
  }) {
    const existing = this.findAttendanceRecordForParticipant(
      input.schoolUserId,
      input.sessionId,
      input.participantKey,
      input.participantName
    );

    if (existing) {
      return this.updateExistingAttendanceRecord(existing, input);
    }

    const now = new Date();
    const nextRecord: SessionAttendanceRecord = {
      id: this.createPublicId('SCH-ATT', input.schoolUserId),
      schoolUserId: input.schoolUserId,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      sessionSubject: input.sessionSubject,
      participantKey: input.participantKey,
      participantId: input.participantId,
      participantName: input.participantName,
      participantRole: input.participantRole,
      status: input.status,
      source: input.source,
      joinedAt: input.joinedAt,
      lastSeenAt: input.lastSeenAt,
      leftAt: input.leftAt,
      checkedInAt: input.checkedInAt,
      manualMarkedAt: input.manualMarkedAt,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    };

    const existingRecords = this.attendanceRecordsBySchoolId.get(input.schoolUserId) || [];
    this.attendanceRecordsBySchoolId.set(input.schoolUserId, [nextRecord, ...existingRecords]);
    this.persistAttendanceRecordsToDisk();
    return nextRecord;
  }

  private updateExistingAttendanceRecord(
    existing: SessionAttendanceRecord,
    patch: {
      participantId?: string | null;
      participantName?: string;
      participantRole?: 'student' | 'tutor' | 'school';
      status?: SessionAttendanceStatus;
      source?: SessionAttendanceSource;
      joinedAt?: Date | null;
      lastSeenAt?: Date | null;
      leftAt?: Date | null;
      checkedInAt?: Date | null;
      manualMarkedAt?: Date | null;
      note?: string | null;
      sessionTitle?: string;
      sessionSubject?: string;
    }
  ) {
    existing.participantId = patch.participantId ?? existing.participantId;
    existing.participantName = patch.participantName || existing.participantName;
    existing.participantRole = patch.participantRole || existing.participantRole;
    existing.status = patch.status || existing.status;
    existing.source = patch.source || existing.source;
    existing.joinedAt = patch.joinedAt === undefined ? existing.joinedAt : patch.joinedAt;
    existing.lastSeenAt = patch.lastSeenAt === undefined ? existing.lastSeenAt : patch.lastSeenAt;
    existing.leftAt = patch.leftAt === undefined ? existing.leftAt : patch.leftAt;
    existing.checkedInAt = patch.checkedInAt === undefined ? existing.checkedInAt : patch.checkedInAt;
    existing.manualMarkedAt =
      patch.manualMarkedAt === undefined ? existing.manualMarkedAt : patch.manualMarkedAt;
    existing.note = patch.note === undefined ? existing.note : patch.note;
    existing.sessionTitle = patch.sessionTitle || existing.sessionTitle;
    existing.sessionSubject = patch.sessionSubject || existing.sessionSubject;
    existing.updatedAt = new Date();
    this.persistAttendanceRecordsToDisk();
    return existing;
  }

  private buildSessionAttendanceResponse(session: SessionLookupRecord) {
    const records = this.listAttendanceRecordsForSession(session.schoolUserId, session.publicId);
    const mappedRecords = records
      .map((record) => this.mapAttendanceRecord(record))
      .sort((left, right) => {
        const liveDelta = Number(right.isLive) - Number(left.isLive);
        if (liveDelta !== 0) {
          return liveDelta;
        }
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      });

    const presentCount = records.filter((record) => record.status === 'present').length;
    const lateCount = records.filter((record) => record.status === 'late').length;
    const absentCount = records.filter((record) => record.status === 'absent').length;
    const pendingCount = records.filter((record) => record.status === 'pending').length;
    const liveCount = records.filter((record) => Boolean(record.joinedAt) && !record.leftAt).length;
    const checkedInCount = records.filter((record) => Boolean(record.checkedInAt)).length;
    const attendedCount = presentCount + lateCount;
    const attendanceRate =
      session.expectedStudents > 0
        ? Math.round((attendedCount / session.expectedStudents) * 100)
        : attendedCount > 0
          ? 100
          : 0;

    return {
      generatedAt: new Date().toISOString(),
      session: this.mapSession(session, Date.now(), { includeTeacherAccess: true }),
      window: this.parseAttendanceWindowMetadata(session.metadata),
      summary: {
        expectedStudents: session.expectedStudents,
        presentCount,
        lateCount,
        absentCount,
        pendingCount,
        checkedInCount,
        liveCount,
        completedCount: records.filter(
          (record) =>
            (record.status === 'present' || record.status === 'late') && Boolean(record.leftAt)
        ).length,
        missingCount: Math.max(session.expectedStudents - attendedCount - absentCount, 0),
        attendanceRate,
      },
      records: mappedRecords,
    };
  }

  private mapAttendanceRecord(record: SessionAttendanceRecord) {
    const nowMs = Date.now();
    const joinedAtMs = record.joinedAt ? record.joinedAt.getTime() : NaN;
    const endMs = record.leftAt
      ? record.leftAt.getTime()
      : record.lastSeenAt
        ? record.lastSeenAt.getTime()
        : nowMs;
    const durationMinutes =
      Number.isFinite(joinedAtMs) && endMs >= joinedAtMs
        ? Math.max(0, Math.round((endMs - joinedAtMs) / 60000))
        : null;

    return {
      id: record.id,
      participantId: record.participantId,
      participantName: record.participantName,
      participantRole: record.participantRole,
      status: record.status,
      source: record.source,
      joinedAt: record.joinedAt ? record.joinedAt.toISOString() : null,
      lastSeenAt: record.lastSeenAt ? record.lastSeenAt.toISOString() : null,
      leftAt: record.leftAt ? record.leftAt.toISOString() : null,
      checkedInAt: record.checkedInAt ? record.checkedInAt.toISOString() : null,
      manualMarkedAt: record.manualMarkedAt ? record.manualMarkedAt.toISOString() : null,
      note: record.note,
      durationMinutes,
      isLive: Boolean(record.joinedAt) && !record.leftAt,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async findManagedSessionForSchool(schoolUserId: number, sessionId: string) {
    const existing = await this.prisma.schoolScheduleSession
      .findFirst({
        where: {
          publicId: sessionId,
          schoolUserId,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.findFallbackSessionForSchool(schoolUserId, sessionId);
        }
        throw error;
      });

    return (existing || null) as SessionLookupRecord | null;
  }

  private async findSessionByPublicId(sessionId: string) {
    const existing = await this.prisma.schoolScheduleSession
      .findUnique({
        where: {
          publicId: sessionId,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });

    const fallback = this.findFallbackSessionByPublicId(sessionId);
    return ((existing || fallback || null) as SessionLookupRecord | null);
  }

  private async persistAttendanceWindowForSession(
    session: SessionLookupRecord,
    attendanceWindow: SessionAttendanceWindowState
  ) {
    const nextMetadata = this.withAttendanceWindowMetadata(session.metadata, attendanceWindow);

    const updated = await this.prisma.schoolScheduleSession
      .update({
        where: {
          publicId: session.publicId,
        },
        data: {
          metadata: nextMetadata,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.updateFallbackSession(session.schoolUserId, session.publicId, {
            metadata: nextMetadata,
          });
        }
        throw error;
      });

    return (updated || session) as SessionLookupRecord;
  }

  private loadAttendanceRecordsFromDisk() {
    try {
      if (!existsSync(this.fallbackAttendancePath)) {
        return;
      }
      const raw = readFileSync(this.fallbackAttendancePath, 'utf8');
      if (!raw.trim()) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, SessionAttendanceRecord[]>;
      Object.entries(parsed).forEach(([key, records]) => {
        const schoolId = Number.parseInt(key, 10);
        if (!Number.isFinite(schoolId) || !Array.isArray(records)) {
          return;
        }
        const normalized = records.map((record) => ({
          ...record,
          joinedAt: record.joinedAt ? new Date(record.joinedAt) : null,
          lastSeenAt: record.lastSeenAt ? new Date(record.lastSeenAt) : null,
          leftAt: record.leftAt ? new Date(record.leftAt) : null,
          checkedInAt: record.checkedInAt ? new Date(record.checkedInAt) : null,
          manualMarkedAt: record.manualMarkedAt ? new Date(record.manualMarkedAt) : null,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        }));
        this.attendanceRecordsBySchoolId.set(schoolId, normalized);
      });
    } catch {
      // Ignore disk cache failures in local dev.
    }
  }

  private persistAttendanceRecordsToDisk() {
    try {
      const payload: Record<string, SessionAttendanceRecord[]> = {};
      this.attendanceRecordsBySchoolId.forEach((records, schoolId) => {
        payload[String(schoolId)] = records;
      });
      writeFileSync(this.fallbackAttendancePath, JSON.stringify(payload, null, 2));
    } catch {
      // Ignore disk cache failures in local dev.
    }
  }

  private parseBooleanFlag(value?: string | null) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  private loadFallbackSessionsFromDisk() {
    try {
      if (!existsSync(this.fallbackSessionsPath)) {
        return;
      }
      const raw = readFileSync(this.fallbackSessionsPath, 'utf8');
      if (!raw.trim()) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, FallbackSchoolScheduleSessionRecord[]>;
      Object.entries(parsed).forEach(([key, sessions]) => {
        const schoolId = Number.parseInt(key, 10);
        if (!Number.isFinite(schoolId) || !Array.isArray(sessions)) {
          return;
        }
        const normalized = sessions.map((session) => ({
          ...session,
          startAt: new Date(session.startAt),
          endAt: new Date(session.endAt),
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
        }));
        this.fallbackSessionsBySchoolId.set(schoolId, normalized);
      });
    } catch {
      // Ignore disk cache failures in local dev.
    }
  }

  private persistFallbackSessionsToDisk() {
    try {
      const payload: Record<string, FallbackSchoolScheduleSessionRecord[]> = {};
      this.fallbackSessionsBySchoolId.forEach((sessions, schoolId) => {
        payload[String(schoolId)] = sessions;
      });
      writeFileSync(this.fallbackSessionsPath, JSON.stringify(payload, null, 2));
    } catch {
      // Ignore disk cache failures in local dev.
    }
  }

  private normalizeFeedLimit(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 200;
    }
    const integer = Math.trunc(parsed);
    if (integer <= 0) {
      return 1;
    }
    return Math.min(integer, 500);
  }

  private canAuthUserViewFeedSession(input: {
    authUser: AuthUserContext;
    authUserRecord: AuthUserRecord;
    viewerRole: 'student' | 'tutor' | 'school' | 'admin';
    session: {
      schoolUserId: number;
      metadata?: Prisma.JsonValue | null;
    };
  }) {
    if (input.viewerRole === 'admin' || input.viewerRole === 'school') {
      return true;
    }

    const teacherAccess = this.parseTeacherAccessMetadata(input.session.metadata);
    if (input.viewerRole === 'tutor') {
      if (input.authUserRecord.id === input.session.schoolUserId) {
        return true;
      }
      return Boolean(
        teacherAccess.assignedTutorEmail &&
          teacherAccess.assignedTutorEmail === input.authUserRecord.email
      );
    }

    return this.isStudentAudienceMatch(input.authUser, teacherAccess);
  }

  private canAuthUserManageSessionAttendance(input: {
    authUserRecord: AuthUserRecord;
    viewerRole: 'student' | 'tutor' | 'school' | 'admin';
    session: {
      schoolUserId: number;
      metadata?: Prisma.JsonValue | null;
    };
  }) {
    if (input.viewerRole === 'admin' || input.viewerRole === 'school') {
      return true;
    }

    if (input.viewerRole !== 'tutor') {
      return false;
    }

    const teacherAccess = this.parseTeacherAccessMetadata(input.session.metadata);
    return Boolean(
      teacherAccess.assignedTutorEmail &&
        teacherAccess.assignedTutorEmail === input.authUserRecord.email
    );
  }

  private canAuthUserViewNotification(input: {
    authUser: AuthUserContext;
    authUserRecord: AuthUserRecord;
    viewerRole: 'student' | 'tutor' | 'school' | 'admin';
    notification: SchoolScheduleNotificationRecord;
  }) {
    if (
      input.notification.kind === 'teacher_invite' ||
      input.notification.kind === 'class_assignment' ||
      input.notification.kind === 'teacher_access_accepted'
    ) {
      if (input.viewerRole === 'admin' || input.viewerRole === 'school') {
        return true;
      }
      return Boolean(
        input.notification.targetEmail &&
          input.notification.targetEmail === input.authUserRecord.email
      );
    }

    if (input.viewerRole === 'admin' || input.viewerRole === 'school') {
      return true;
    }

    const teacherAccess: SessionTeacherAccess = {
      assignedTutorEmail: input.notification.assignedTutorEmail,
      assignedTutorName: null,
      department: input.notification.department,
      classGroup: input.notification.classGroup,
      audienceTag: input.notification.audienceTag,
      tutorJoinCode: null,
      tutorJoinToken: null,
    };

    if (input.viewerRole === 'tutor') {
      if (input.authUserRecord.id === input.notification.schoolUserId) {
        return true;
      }
      return Boolean(
        teacherAccess.assignedTutorEmail &&
          teacherAccess.assignedTutorEmail === input.authUserRecord.email
      );
    }

    return this.isStudentAudienceMatch(input.authUser, teacherAccess);
  }

  private isStudentAudienceMatch(authUser: AuthUserContext, teacherAccess: SessionTeacherAccess) {
    const hasAudienceRules = Boolean(
      teacherAccess.department || teacherAccess.classGroup || teacherAccess.audienceTag
    );

    if (!hasAudienceRules) {
      return true;
    }

    const audienceValues = [
      teacherAccess.department,
      teacherAccess.classGroup,
      teacherAccess.audienceTag,
    ].filter((item): item is string => Boolean(item && item.trim()));

    const viewerTags = this.extractAudienceTagsFromAuthUser(authUser);
    if (viewerTags.size === 0) {
      return false;
    }

    return audienceValues.some((value) => this.matchesAudienceValue(viewerTags, value));
  }

  private extractAudienceTagsFromAuthUser(authUser: AuthUserContext) {
    const tags = new Set<string>();
    const candidateSources = [authUser.userMetadata, authUser.appMetadata].filter(
      (value): value is Record<string, unknown> => Boolean(value && typeof value === 'object')
    );

    candidateSources.forEach((source) => {
      const directKeys = [
        'department',
        'classGroup',
        'class_group',
        'class',
        'classLevel',
        'class_level',
        'level',
        'stream',
        'track',
        'faculty',
        'program',
        'programme',
        'audienceTag',
        'audience_tag',
      ];

      directKeys.forEach((key) => {
        this.collectAudienceTagValue(tags, source[key]);
      });

      const arrayKeys = ['audienceTags', 'audience_tags', 'departments', 'streams', 'tracks'];
      arrayKeys.forEach((key) => {
        this.collectAudienceTagValue(tags, source[key]);
      });
    });

    return tags;
  }

  private collectAudienceTagValue(tags: Set<string>, rawValue: unknown) {
    if (Array.isArray(rawValue)) {
      rawValue.forEach((entry) => this.collectAudienceTagValue(tags, entry));
      return;
    }

    const normalized = this.normalizeAudienceTag(rawValue);
    if (normalized) {
      tags.add(normalized);
    }
  }

  private matchesAudienceValue(viewerTags: Set<string>, audienceValue: string) {
    const normalizedAudience = this.normalizeAudienceTag(audienceValue);
    if (!normalizedAudience) {
      return false;
    }

    for (const tag of viewerTags) {
      if (tag === normalizedAudience) {
        return true;
      }
      if (tag.includes(normalizedAudience) || normalizedAudience.includes(tag)) {
        return true;
      }
    }

    return false;
  }

  private createTeacherAccessPayload(input: {
    assignedTutorEmail?: string;
    assignedTutorName?: string;
    department?: string;
    classGroup?: string;
    audienceTag?: string;
  }): SessionTeacherAccess {
    const assignedTutorEmail = this.normalizeOptionalEmail(input.assignedTutorEmail);
    const assignedTutorName = this.normalizeOptionalText(input.assignedTutorName);
    const department = this.normalizeOptionalText(input.department);
    const classGroup = this.normalizeOptionalText(input.classGroup);
    const explicitAudienceTag = this.normalizeOptionalText(input.audienceTag);

    return {
      assignedTutorEmail,
      assignedTutorName,
      department,
      classGroup,
      audienceTag: this.resolveAudienceTag({
        explicitAudienceTag,
        department,
        classGroup,
      }),
      tutorJoinCode: this.generateTutorJoinCode(),
      tutorJoinToken: this.generateTutorJoinToken(),
    };
  }

  private mergeTeacherAccessPayload(
    existing: SessionTeacherAccess,
    input: {
      assignedTutorEmail?: string | null;
      assignedTutorName?: string | null;
      department?: string | null;
      classGroup?: string | null;
      audienceTag?: string | null;
    }
  ): SessionTeacherAccess {
    const assignedTutorEmail =
      input.assignedTutorEmail === undefined
        ? existing.assignedTutorEmail
        : this.normalizeOptionalEmail(input.assignedTutorEmail);
    const assignedTutorName =
      input.assignedTutorName === undefined
        ? existing.assignedTutorName
        : this.normalizeOptionalText(input.assignedTutorName);
    const department =
      input.department === undefined
        ? existing.department
        : this.normalizeOptionalText(input.department);
    const classGroup =
      input.classGroup === undefined
        ? existing.classGroup
        : this.normalizeOptionalText(input.classGroup);

    const explicitAudienceTag =
      input.audienceTag === undefined
        ? existing.audienceTag
        : this.normalizeOptionalText(input.audienceTag);

    return {
      assignedTutorEmail,
      assignedTutorName,
      department,
      classGroup,
      audienceTag: this.resolveAudienceTag({
        explicitAudienceTag,
        department,
        classGroup,
      }),
      tutorJoinCode: existing.tutorJoinCode || this.generateTutorJoinCode(),
      tutorJoinToken: existing.tutorJoinToken || this.generateTutorJoinToken(),
    };
  }

  private async hydrateTeacherAssignmentForSchedule(
    schoolUserId: number,
    teacherAccess: SessionTeacherAccess
  ): Promise<SessionTeacherAccess> {
    if (!teacherAccess.assignedTutorEmail) {
      return teacherAccess;
    }

    const roster = await this.ensureTeacherRoster(schoolUserId);
    const matchedTeacher = roster.teachers.find(
      (teacher) => teacher.email === teacherAccess.assignedTutorEmail
    );

    if (!matchedTeacher) {
      return teacherAccess;
    }

    if (!matchedTeacher.isActive) {
      throw new BadRequestException(
        'Selected teacher is inactive. Activate the teacher before assigning a class.'
      );
    }

    const assignedTutorName = teacherAccess.assignedTutorName || matchedTeacher.name;
    const department = teacherAccess.department || matchedTeacher.department;
    const classGroup = teacherAccess.classGroup || matchedTeacher.classGroup;
    const explicitAudienceTag =
      teacherAccess.audienceTag ||
      this.resolveAudienceTag({
        explicitAudienceTag: null,
        department,
        classGroup,
      });

    return {
      ...teacherAccess,
      assignedTutorName,
      department,
      classGroup,
      audienceTag: this.resolveAudienceTag({
        explicitAudienceTag,
        department,
        classGroup,
      }),
    };
  }

  private parseTeacherAccessMetadata(metadata: Prisma.JsonValue | null | undefined): SessionTeacherAccess {
    const metadataObject = this.readJsonObject(metadata);
    const teacherAccessRaw = this.readJsonObject(metadataObject?.teacherAccess);

    return {
      assignedTutorEmail: this.normalizeOptionalEmail(teacherAccessRaw?.assignedTutorEmail),
      assignedTutorName: this.normalizeOptionalText(teacherAccessRaw?.assignedTutorName),
      department: this.normalizeOptionalText(teacherAccessRaw?.department),
      classGroup: this.normalizeOptionalText(teacherAccessRaw?.classGroup),
      audienceTag: this.normalizeOptionalText(teacherAccessRaw?.audienceTag),
      tutorJoinCode: this.parseTutorJoinCode(teacherAccessRaw?.tutorJoinCode),
      tutorJoinToken: this.parseTutorJoinToken(teacherAccessRaw?.tutorJoinToken),
    };
  }

  private parseAttendanceWindowMetadata(
    metadata: Prisma.JsonValue | null | undefined
  ): SessionAttendanceWindowState {
    const metadataObject = this.readJsonObject(metadata);
    const attendanceWindowRaw = this.readJsonObject(metadataObject?.attendanceWindow);
    const openedAt = this.parseOptionalDate(attendanceWindowRaw?.openedAt);
    const closedAt = this.parseOptionalDate(attendanceWindowRaw?.closedAt);
    const gracePeriodRaw = Number(attendanceWindowRaw?.gracePeriodMinutes);
    const gracePeriodMinutes =
      Number.isFinite(gracePeriodRaw) && gracePeriodRaw > 0
        ? Math.round(gracePeriodRaw)
        : ATTENDANCE_LATE_GRACE_PERIOD_MINUTES;

    return {
      isOpen: attendanceWindowRaw?.isOpen === true,
      openedAt: openedAt ? openedAt.toISOString() : null,
      openedByName: this.normalizeOptionalText(attendanceWindowRaw?.openedByName),
      closedAt: closedAt ? closedAt.toISOString() : null,
      gracePeriodMinutes,
    };
  }

  private withTeacherAccessMetadata(
    metadata: Prisma.JsonValue | null | undefined,
    teacherAccess: SessionTeacherAccess
  ): Prisma.InputJsonValue {
    const metadataObject = this.readJsonObject(metadata) || {};
    return {
      ...metadataObject,
      teacherAccess,
    } as Prisma.InputJsonValue;
  }

  private withAttendanceWindowMetadata(
    metadata: Prisma.JsonValue | null | undefined,
    attendanceWindow: SessionAttendanceWindowState
  ): Prisma.InputJsonValue {
    const metadataObject = this.readJsonObject(metadata) || {};
    return {
      ...metadataObject,
      attendanceWindow,
    } as Prisma.InputJsonValue;
  }

  private resolveAudienceTag(input: {
    explicitAudienceTag: string | null;
    department: string | null;
    classGroup: string | null;
  }) {
    if (input.explicitAudienceTag) {
      return input.explicitAudienceTag;
    }
    const combined = [input.department, input.classGroup].filter(Boolean).join(' • ').trim();
    return combined || null;
  }

  private normalizeOptionalEmail(value: unknown) {
    const normalized = this.normalizeEmail(value);
    return normalized || null;
  }

  private parseTutorJoinCode(value: unknown) {
    const normalized = String(value || '').trim();
    if (!/^\d{4,8}$/.test(normalized)) {
      return null;
    }
    return normalized;
  }

  private parseTutorJoinToken(value: unknown) {
    const normalized = String(value || '').trim();
    if (normalized.length < 12) {
      return null;
    }
    return normalized;
  }

  private async ensureTeacherRoster(schoolUserId: number): Promise<SchoolTeacherRosterStore> {
    const roleRow = await this.prisma.userRole
      .findFirst({
        where: {
          userId: schoolUserId,
          role: AccountRole.SCHOOL,
        },
        select: {
          id: true,
          metadata: true,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });

    if (!roleRow) {
      if (this.isPrismaConnectivityBypassed()) {
        const teachers = this.fallbackTeacherRosterBySchoolId.get(schoolUserId) || [];
        return {
          roleRowId: -schoolUserId,
          roleRowMetadata: null,
          teachers: [...teachers],
        };
      }
      throw new NotFoundException('School role metadata is missing.');
    }

    const metadata = this.readJsonObject(roleRow.metadata) || {};
    const rosterRaw = this.readJsonObject(metadata.teacherRoster);
    const rosterTeachersRaw = rosterRaw?.teachers;
    const teachersRaw = Array.isArray(rosterTeachersRaw) ? rosterTeachersRaw : [];

    const teachers = teachersRaw
      .map((raw: any) => this.mapTeacherRosterItem(raw))
      .filter((item): item is SchoolTeacherRosterItem => Boolean(item));

    return {
      roleRowId: roleRow.id,
      roleRowMetadata: roleRow.metadata,
      teachers,
    };
  }

  private async persistTeacherRoster(
    schoolUserId: number,
    roster: SchoolTeacherRosterStore
  ) {
    if (this.isPrismaConnectivityBypassed() || roster.roleRowId <= 0) {
      this.fallbackTeacherRosterBySchoolId.set(schoolUserId, [...roster.teachers]);
      return;
    }

    const metadata = this.readJsonObject(roster.roleRowMetadata) || {};
    const payload = {
      ...metadata,
      teacherRoster: {
        teachers: roster.teachers,
        updatedAt: new Date().toISOString(),
      },
    };

    await this.prisma.userRole
      .update({
        where: {
          id: roster.roleRowId,
        },
        data: {
          metadata: payload as Prisma.InputJsonValue,
        },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          this.fallbackTeacherRosterBySchoolId.set(schoolUserId, [...roster.teachers]);
          return null;
        }
        throw error;
      });
  }

  private mapTeacherRosterItem(raw: Record<string, unknown> | null): SchoolTeacherRosterItem | null {
    if (!raw) {
      return null;
    }
    const email = this.normalizeOptionalEmail(raw.email);
    const name = this.normalizeOptionalText(raw.name);
    const id = this.normalizeOptionalText(raw.id);
    if (!email || !name || !id) {
      return null;
    }

    return {
      id,
      name,
      email,
      department: this.normalizeOptionalText(raw.department),
      classGroup: this.normalizeOptionalText(raw.classGroup),
      subjectFocus: this.normalizeOptionalText(raw.subjectFocus),
      isActive: raw.isActive !== false,
      inviteStatus: this.parseTeacherInviteStatus(raw.inviteStatus, raw.isActive !== false),
      invitedAt:
        typeof raw.invitedAt === 'string' && raw.invitedAt.trim() ? raw.invitedAt.trim() : null,
      acceptedAt:
        typeof raw.acceptedAt === 'string' && raw.acceptedAt.trim() ? raw.acceptedAt.trim() : null,
      lastInviteSentAt:
        typeof raw.lastInviteSentAt === 'string' && raw.lastInviteSentAt.trim()
          ? raw.lastInviteSentAt.trim()
          : null,
      lastInviteChannel: this.parseTeacherInviteChannel(raw.lastInviteChannel),
      lastInviteDeliveryStatus: this.parseTeacherInviteDeliveryStatus(raw.lastInviteDeliveryStatus),
      lastInviteDeliveryNote:
        typeof raw.lastInviteDeliveryNote === 'string' && raw.lastInviteDeliveryNote.trim()
          ? raw.lastInviteDeliveryNote.trim()
          : null,
      createdAt:
        typeof raw.createdAt === 'string' && raw.createdAt.trim()
          ? raw.createdAt.trim()
          : new Date().toISOString(),
      updatedAt:
        typeof raw.updatedAt === 'string' && raw.updatedAt.trim()
          ? raw.updatedAt.trim()
          : new Date().toISOString(),
    };
  }

  private parseTeacherInviteStatus(value: unknown, isActive: boolean): SchoolTeacherRosterItem['inviteStatus'] {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'accepted') {
      return 'accepted';
    }
    if (normalized === 'invited') {
      return 'invited';
    }
    if (normalized === 'inactive') {
      return 'inactive';
    }
    return isActive ? 'invited' : 'inactive';
  }

  private parseTeacherInviteDeliveryStatus(
    value: unknown
  ): SchoolTeacherRosterItem['lastInviteDeliveryStatus'] {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'queued' || normalized === 'sent' || normalized === 'simulated' || normalized === 'failed') {
      return normalized;
    }
    return null;
  }

  private parseTeacherInviteChannel(value: unknown): SchoolTeacherRosterItem['lastInviteChannel'] {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'in_app' || normalized === 'email' || normalized === 'both') {
      return normalized;
    }
    return null;
  }

  private async dispatchTeacherRosterInvite(input: {
    schoolUserId: number;
    schoolName: string;
    schoolEmail: string;
    teacher: SchoolTeacherRosterItem;
  }): Promise<{
    channel: 'in_app' | 'email' | 'both';
    status: 'queued' | 'sent' | 'simulated' | 'failed';
    note: string;
    payload: {
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
  }> {
    const inviteLinkBase = String(process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || '').trim() || 'http://127.0.0.1:5173';
    const normalizedBase = inviteLinkBase.replace(/\/+$/, '');
    const inviteLink = `${normalizedBase}/signin`;
    const provider = String(process.env.TEACHER_INVITE_PROVIDER || '').trim().toLowerCase();
    const emailFallbackEnabled = String(process.env.TEACHER_INVITE_EMAIL_FALLBACK || '').trim() === '1';
    const existingUser = await this.prisma.user
      .findUnique({
        where: { email: input.teacher.email },
        select: { id: true, email: true, name: true },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });
    const resolvedExistingUser =
      existingUser ||
      (this.isPrismaConnectivityBypassed()
        ? {
            id: this.resolveFallbackUserId(input.teacher.email),
            email: input.teacher.email,
            name: input.teacher.name,
          }
        : null);

    // MVP: keep invite payload deterministic and return delivery status.
    const templatePayload = {
      template: 'school_teacher_roster_invite_v1',
      to: input.teacher.email,
      subject: `You were invited to ${input.schoolName} on Edamaa`,
      body: `Hello ${input.teacher.name}, ${input.schoolName} invited you as a school teacher. Sign in with ${input.teacher.email} at ${inviteLink}.`,
      metadata: {
        schoolName: input.schoolName,
        schoolEmail: input.schoolEmail,
        teacherName: input.teacher.name,
        teacherEmail: input.teacher.email,
        inviteLink,
      },
    };

    if (resolvedExistingUser) {
      await this.pushScheduleNotification({
        kind: 'teacher_invite',
        schoolUserId: input.schoolUserId,
        schoolName: input.schoolName,
        sessionId: input.teacher.id,
        sessionTitle: `Teacher roster invite`,
        subject: input.teacher.subjectFocus || 'School invite',
        instructor: input.schoolName,
        roomCode: 'N/A',
        startAt: new Date(),
        assignedTutorEmail: input.teacher.email,
        department: input.teacher.department,
        classGroup: input.teacher.classGroup,
        audienceTag: null,
        targetEmail: input.teacher.email,
      });

      if (!emailFallbackEnabled) {
        return {
          channel: 'in_app',
          status: 'sent',
          note: 'In-app invite delivered to existing Edamaa teacher account.',
          payload: templatePayload,
        };
      }
    }

    if (!provider) {
      return {
        channel:
          resolvedExistingUser && emailFallbackEnabled
            ? 'both'
            : resolvedExistingUser
              ? 'in_app'
              : 'email',
        status: 'simulated' as const,
        note:
          resolvedExistingUser && emailFallbackEnabled
            ? 'In-app invite delivered and email fallback prepared in simulated mode.'
            : resolvedExistingUser
              ? 'In-app invite delivered to existing Edamaa teacher account.'
              : 'Email invite prepared in simulated mode. Set TEACHER_INVITE_PROVIDER to enable delivery.',
        payload: templatePayload,
      };
    }

    return {
      channel:
        resolvedExistingUser && emailFallbackEnabled
          ? 'both'
          : resolvedExistingUser
            ? 'in_app'
            : 'email',
      status: 'queued' as const,
      note:
        resolvedExistingUser && emailFallbackEnabled
          ? `In-app invite delivered and email fallback queued for provider "${provider}".`
          : resolvedExistingUser
            ? 'In-app invite delivered to existing Edamaa teacher account.'
            : `Email invite queued for provider "${provider}".`,
      payload: templatePayload,
    };
  }

  private async dispatchClassAssignmentInvite(input: {
    schoolUserId: number;
    schoolName: string;
    schoolEmail: string;
    teacherEmail: string;
    teacherName: string | null;
    session: {
      publicId: string;
      title: string;
      subject: string;
      roomCode: string;
      startAt: Date;
      durationMinutes: number;
    };
    teacherAccess: SessionTeacherAccess;
  }): Promise<{
    channel: 'in_app' | 'email' | 'both';
    status: 'queued' | 'sent' | 'simulated' | 'failed';
    note: string;
    payload: {
      template: string;
      to: string;
      subject: string;
      body: string;
      metadata: Record<string, string>;
    };
  }> {
    const joinLink = this.buildTutorJoinLink(
      input.session.publicId,
      input.teacherAccess.tutorJoinToken,
      input.teacherAccess.tutorJoinCode
    );
    const accessCode = input.teacherAccess.tutorJoinCode || '';
    const provider = String(process.env.TEACHER_INVITE_PROVIDER || '').trim().toLowerCase();
    const emailFallbackEnabled = String(process.env.TEACHER_INVITE_EMAIL_FALLBACK || '').trim() === '1';
    const timeLabel = this.formatDateTimeLabel(input.session.startAt);
    const existingUser = await this.prisma.user
      .findUnique({
        where: { email: input.teacherEmail },
        select: { id: true, email: true },
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return null;
        }
        throw error;
      });
    const resolvedExistingUser =
      existingUser ||
      (this.isPrismaConnectivityBypassed()
        ? {
            id: this.resolveFallbackUserId(input.teacherEmail),
            email: input.teacherEmail,
          }
        : null);

    const payload = {
      template: 'school_teacher_class_invite_v1',
      to: input.teacherEmail,
      subject: `Class assignment: ${input.session.title}`,
      body:
        `Hello ${input.teacherName || 'Teacher'}, you were assigned a class by ${input.schoolName}. ` +
        `Class: ${input.session.title} (${input.session.subject}) at ${timeLabel}. ` +
        `Use link ${joinLink || ''} and code ${accessCode} to start.`,
      metadata: {
        schoolName: input.schoolName,
        schoolEmail: input.schoolEmail,
        teacherEmail: input.teacherEmail,
        classId: input.session.publicId,
        classTitle: input.session.title,
        classSubject: input.session.subject,
        classRoomCode: input.session.roomCode,
        classStartAt: input.session.startAt.toISOString(),
        classDurationMinutes: String(input.session.durationMinutes),
        teacherJoinLink: joinLink || '',
        teacherAccessCode: accessCode,
      },
    };

    if (resolvedExistingUser) {
      await this.pushScheduleNotification({
        kind: 'class_assignment',
        schoolUserId: input.schoolUserId,
        schoolName: input.schoolName,
        sessionId: input.session.publicId,
        sessionTitle: input.session.title,
        subject: input.session.subject,
        instructor: input.schoolName,
        roomCode: input.session.roomCode,
        startAt: input.session.startAt,
        assignedTutorEmail: input.teacherEmail,
        department: input.teacherAccess.department,
        classGroup: input.teacherAccess.classGroup,
        audienceTag: input.teacherAccess.audienceTag,
        targetEmail: input.teacherEmail,
        tutorJoinLink: joinLink,
        tutorJoinCode: input.teacherAccess.tutorJoinCode,
        tutorJoinToken: input.teacherAccess.tutorJoinToken,
      });

      if (!emailFallbackEnabled) {
        return {
          channel: 'in_app',
          status: 'sent',
          note: 'In-app class assignment delivered to existing Edamaa teacher account.',
          payload,
        };
      }
    }

    if (!provider) {
      return {
        channel:
          resolvedExistingUser && emailFallbackEnabled
            ? 'both'
            : resolvedExistingUser
              ? 'in_app'
              : 'email',
        status: 'simulated',
        note:
          resolvedExistingUser && emailFallbackEnabled
            ? 'In-app class assignment delivered and email fallback prepared in simulated mode.'
            : resolvedExistingUser
              ? 'In-app class assignment delivered to existing Edamaa teacher account.'
              : 'Class invite prepared in simulated mode. Connect provider to deliver email.',
        payload,
      };
    }

    return {
      channel:
        resolvedExistingUser && emailFallbackEnabled
          ? 'both'
          : resolvedExistingUser
            ? 'in_app'
            : 'email',
      status: 'queued',
      note:
        resolvedExistingUser && emailFallbackEnabled
          ? `In-app class assignment delivered and email fallback queued for provider "${provider}".`
          : resolvedExistingUser
            ? 'In-app class assignment delivered to existing Edamaa teacher account.'
            : `Class invite queued for provider "${provider}".`,
      payload,
    };
  }

  private async markTeacherInviteAcceptedForSchool(schoolUserId: number, teacherEmail: string) {
    const roster = await this.ensureTeacherRoster(schoolUserId);
    const normalizedEmail = this.normalizeEmail(teacherEmail);
    const target = roster.teachers.find((teacher) => teacher.email === normalizedEmail);
    if (!target) {
      return;
    }

    target.isActive = true;
    target.inviteStatus = 'accepted';
    if (!target.acceptedAt) {
      target.acceptedAt = new Date().toISOString();
    }
    target.updatedAt = new Date().toISOString();
    await this.persistTeacherRoster(schoolUserId, roster);
  }

  private buildTutorJoinLink(sessionId: string, token: string | null, code?: string | null) {
    if (!token) {
      return null;
    }
    const configuredBaseUrl =
      String(process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || '').trim() ||
      'http://127.0.0.1:5173';
    const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({ token });
    if (code) {
      params.set('code', code);
    }
    return `${normalizedBaseUrl}/school-teacher/live/${encodeURIComponent(sessionId)}?${params.toString()}`;
  }

  private generateTutorJoinCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateTutorJoinToken() {
    return randomBytes(16).toString('hex');
  }

  private normalizeAudienceTag(value: unknown) {
    const normalized = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
    return normalized || null;
  }

  private readJsonObject(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private async pushScheduleNotification(input: {
    kind: ScheduleNotificationKind;
    schoolUserId: number;
    schoolName: string;
    sessionId: string;
    sessionTitle: string;
    subject: string;
    instructor: string;
    roomCode: string;
    startAt: Date;
    assignedTutorEmail: string | null;
    department: string | null;
    classGroup: string | null;
    audienceTag: string | null;
    targetEmail?: string | null;
    tutorJoinLink?: string | null;
    tutorJoinCode?: string | null;
    tutorJoinToken?: string | null;
  }) {
    const createdAt = new Date();
    const notification: SchoolScheduleNotificationRecord = {
      id: this.createPublicId('SCHN', input.schoolUserId),
      kind: input.kind,
      schoolUserId: input.schoolUserId,
      schoolName: input.schoolName,
      sessionId: input.sessionId,
      sessionTitle: input.sessionTitle,
      subject: input.subject,
      instructor: input.instructor,
      roomCode: input.roomCode,
      startAt: input.startAt,
      assignedTutorEmail: input.assignedTutorEmail,
      department: input.department,
      classGroup: input.classGroup,
      audienceTag: input.audienceTag,
      targetEmail: input.targetEmail || null,
      tutorJoinLink: input.tutorJoinLink || null,
      tutorJoinCode: input.tutorJoinCode || null,
      tutorJoinToken: input.tutorJoinToken || null,
      createdAt,
    };

    this.notifications.unshift(notification);

    if (this.notifications.length > 500) {
      this.notifications.length = 500;
    }

    await this.persistNotificationRecord(notification);

    return notification;
  }

  private buildNotificationTitle(notification: SchoolScheduleNotificationRecord) {
    if (notification.kind === 'teacher_invite') {
      return 'You were invited as a school teacher';
    }
    if (notification.kind === 'class_assignment') {
      return 'New class assigned to you';
    }
    if (notification.kind === 'teacher_access_accepted') {
      return 'Teacher accepted class access';
    }
    if (notification.kind === 'created') {
      return 'New class scheduled';
    }
    if (notification.kind === 'updated') {
      return 'Class schedule updated';
    }
    return 'Class canceled';
  }

  private buildNotificationMessage(notification: SchoolScheduleNotificationRecord) {
    const classTime = this.formatDateTimeLabel(notification.startAt);
    if (notification.kind === 'teacher_invite') {
      return `${notification.schoolName} invited you to teach on Edamaa. Sign in with your invited email to access classes.`;
    }
    if (notification.kind === 'class_assignment') {
      return `${notification.schoolName} assigned "${notification.sessionTitle}" to you for ${classTime}. Room code: ${notification.roomCode}.`;
    }
    if (notification.kind === 'teacher_access_accepted') {
      return `${notification.assignedTutorEmail || 'A teacher'} accepted access for "${notification.sessionTitle}" scheduled ${classTime}.`;
    }
    if (notification.kind === 'created') {
      return `${notification.instructor} scheduled "${notification.sessionTitle}" for ${classTime}. Room code: ${notification.roomCode}.`;
    }
    if (notification.kind === 'updated') {
      return `"${notification.sessionTitle}" was updated by ${notification.instructor}. New time: ${classTime}. Room code: ${notification.roomCode}.`;
    }
    return `"${notification.sessionTitle}" was canceled by ${notification.instructor}. Watch for the next class update.`;
  }

  private resolveNotificationPriority(kind: ScheduleNotificationKind): ScheduleNotificationPriority {
    if (
      kind === 'teacher_invite' ||
      kind === 'class_assignment' ||
      kind === 'teacher_access_accepted'
    ) {
      return 'high';
    }
    if (kind === 'canceled') {
      return 'high';
    }
    if (kind === 'updated') {
      return 'medium';
    }
    return 'low';
  }

  private getReadNotificationIds(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = this.readNotificationIdsByEmail.get(normalizedEmail);
    if (existing) {
      return existing;
    }

    const created = new Set<string>();
    this.readNotificationIdsByEmail.set(normalizedEmail, created);
    return created;
  }

  private parseScheduleNotificationKind(value: string): ScheduleNotificationKind {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'teacher_invite') {
      return 'teacher_invite';
    }
    if (normalized === 'class_assignment') {
      return 'class_assignment';
    }
    if (normalized === 'teacher_access_accepted') {
      return 'teacher_access_accepted';
    }
    if (normalized === 'updated') {
      return 'updated';
    }
    if (normalized === 'canceled') {
      return 'canceled';
    }
    return 'created';
  }

  private async persistNotificationRecord(notification: SchoolScheduleNotificationRecord) {
    if (this.isPrismaConnectivityBypassed()) {
      return;
    }

    try {
      await this.prisma.schoolScheduleNotification.upsert({
        where: {
          publicId: notification.id,
        },
        create: {
          publicId: notification.id,
          schoolUserId: notification.schoolUserId,
          kind: notification.kind,
          sessionPublicId: notification.sessionId,
          sessionTitle: notification.sessionTitle,
          subject: notification.subject,
          instructor: notification.instructor,
          roomCode: notification.roomCode,
          startAt: notification.startAt,
          assignedTutorEmail: notification.assignedTutorEmail,
          department: notification.department,
          classGroup: notification.classGroup,
          audienceTag: notification.audienceTag,
          targetEmail: notification.targetEmail,
          tutorJoinLink: notification.tutorJoinLink,
          tutorJoinCode: notification.tutorJoinCode,
          tutorJoinToken: notification.tutorJoinToken,
          createdAt: notification.createdAt,
        },
        update: {
          kind: notification.kind,
          sessionPublicId: notification.sessionId,
          sessionTitle: notification.sessionTitle,
          subject: notification.subject,
          instructor: notification.instructor,
          roomCode: notification.roomCode,
          startAt: notification.startAt,
          assignedTutorEmail: notification.assignedTutorEmail,
          department: notification.department,
          classGroup: notification.classGroup,
          audienceTag: notification.audienceTag,
          targetEmail: notification.targetEmail,
          tutorJoinLink: notification.tutorJoinLink,
          tutorJoinCode: notification.tutorJoinCode,
          tutorJoinToken: notification.tutorJoinToken,
        },
      });
    } catch (error) {
      if (this.isPrismaUnavailableError(error)) {
        return;
      }
      throw error;
    }
  }

  private async listPersistedNotifications() {
    if (this.isPrismaConnectivityBypassed()) {
      return this.notifications;
    }

    try {
      const records = await this.prisma.schoolScheduleNotification.findMany({
        orderBy: [{ createdAt: 'desc' }],
        include: {
          schoolUser: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        take: 500,
      });

      return records.map((record) => ({
        id: record.publicId,
        kind: this.parseScheduleNotificationKind(record.kind),
        schoolUserId: record.schoolUserId,
        schoolName: record.schoolUser.name || record.schoolUser.email,
        sessionId: record.sessionPublicId,
        sessionTitle: record.sessionTitle,
        subject: record.subject,
        instructor: record.instructor,
        roomCode: record.roomCode,
        startAt: record.startAt,
        assignedTutorEmail: record.assignedTutorEmail,
        department: record.department,
        classGroup: record.classGroup,
        audienceTag: record.audienceTag,
        targetEmail: record.targetEmail,
        tutorJoinLink: record.tutorJoinLink,
        tutorJoinCode: record.tutorJoinCode,
        tutorJoinToken: record.tutorJoinToken,
        createdAt: record.createdAt,
      } satisfies SchoolScheduleNotificationRecord));
    } catch (error) {
      if (this.isPrismaUnavailableError(error)) {
        return this.notifications;
      }
      throw error;
    }
  }

  private async listReadNotificationIds(userEmail: string) {
    const normalizedEmail = this.normalizeEmail(userEmail);
    if (!normalizedEmail) {
      return new Set<string>();
    }

    if (this.isPrismaConnectivityBypassed()) {
      return this.getReadNotificationIds(normalizedEmail);
    }

    try {
      const rows = await this.prisma.schoolScheduleNotificationRead.findMany({
        where: {
          userEmail: normalizedEmail,
        },
        include: {
          notification: {
            select: {
              publicId: true,
            },
          },
        },
      });
      return new Set<string>(rows.map((row) => row.notification.publicId));
    } catch (error) {
      if (this.isPrismaUnavailableError(error)) {
        return this.getReadNotificationIds(normalizedEmail);
      }
      throw error;
    }
  }

  private async persistNotificationRead(userEmail: string, notificationPublicId: string) {
    const normalizedEmail = this.normalizeEmail(userEmail);
    if (!normalizedEmail) {
      return;
    }

    if (this.isPrismaConnectivityBypassed()) {
      this.getReadNotificationIds(normalizedEmail).add(notificationPublicId);
      return;
    }

    try {
      const notification = await this.prisma.schoolScheduleNotification.findUnique({
        where: {
          publicId: notificationPublicId,
        },
        select: {
          id: true,
        },
      });

      if (!notification) {
        return;
      }

      await this.prisma.schoolScheduleNotificationRead.upsert({
        where: {
          userEmail_notificationId: {
            userEmail: normalizedEmail,
            notificationId: notification.id,
          },
        },
        create: {
          publicId: this.createPublicId('SCHNR', notification.id),
          userEmail: normalizedEmail,
          notificationId: notification.id,
        },
        update: {
          readAt: new Date(),
        },
      });
    } catch (error) {
      if (this.isPrismaUnavailableError(error)) {
        this.getReadNotificationIds(normalizedEmail).add(notificationPublicId);
        return;
      }
      throw error;
    }
  }

  private async persistAllNotificationReads(userEmail: string, notificationPublicIds: string[]) {
    const normalizedEmail = this.normalizeEmail(userEmail);
    if (!normalizedEmail || notificationPublicIds.length === 0) {
      return;
    }

    if (this.isPrismaConnectivityBypassed()) {
      const readIds = this.getReadNotificationIds(normalizedEmail);
      notificationPublicIds.forEach((id) => readIds.add(id));
      return;
    }

    try {
      const notifications = await this.prisma.schoolScheduleNotification.findMany({
        where: {
          publicId: {
            in: notificationPublicIds,
          },
        },
        select: {
          id: true,
        },
      });

      if (notifications.length === 0) {
        return;
      }

      await this.prisma.schoolScheduleNotificationRead.createMany({
        data: notifications.map((notification) => ({
          publicId: this.createPublicId('SCHNR', notification.id),
          userEmail: normalizedEmail,
          notificationId: notification.id,
          readAt: new Date(),
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      if (this.isPrismaUnavailableError(error)) {
        const readIds = this.getReadNotificationIds(normalizedEmail);
        notificationPublicIds.forEach((id) => readIds.add(id));
        return;
      }
      throw error;
    }
  }

  private formatDateTimeLabel(value: Date) {
    return value.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private toRelativeLabel(date: Date) {
    const deltaMs = Date.now() - date.getTime();
    const deltaMinutes = Math.floor(deltaMs / 60_000);

    if (deltaMinutes < 1) {
      return 'just now';
    }
    if (deltaMinutes < 60) {
      return `${deltaMinutes} minute${deltaMinutes === 1 ? '' : 's'} ago`;
    }

    const deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) {
      return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`;
    }

    const deltaDays = Math.floor(deltaHours / 24);
    if (deltaDays < 7) {
      return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private resolveDurationMinutes(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Class duration should be a valid number of minutes.');
    }
    const rounded = Math.round(parsed);
    if (rounded > 720) {
      throw new BadRequestException('Class duration is too long. Use 720 minutes or less.');
    }
    return rounded;
  }

  private resolveExpectedStudents(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed);
  }

  private resolveAttendanceGracePeriodMinutes(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return ATTENDANCE_LATE_GRACE_PERIOD_MINUTES;
    }
    const rounded = Math.round(parsed);
    if (rounded > 60) {
      throw new BadRequestException('Attendance grace period should be 60 minutes or less.');
    }
    return rounded;
  }

  private async assertNoScheduleCollision(input: {
    schoolUserId: number;
    startAt: Date;
    endAt: Date;
    instructor: string;
    roomCode: string;
    assignedTutorEmail?: string | null;
    audienceTag?: string | null;
    excludeSessionRecordId?: number;
  }) {
    const normalizedInstructor = input.instructor.trim().toLowerCase();
    const normalizedRoomCode = input.roomCode.trim().toLowerCase();
    const normalizedAssignedTutorEmail = this.normalizeOptionalEmail(input.assignedTutorEmail);
    const normalizedAudienceTag = this.normalizeAudienceTag(input.audienceTag);

    const overlappingSessions = await this.prisma.schoolScheduleSession
      .findMany({
        where: {
          schoolUserId: input.schoolUserId,
          ...(typeof input.excludeSessionRecordId === 'number'
            ? {
                id: {
                  not: input.excludeSessionRecordId,
                },
              }
            : {}),
          startAt: {
            lt: input.endAt,
          },
          endAt: {
            gt: input.startAt,
          },
        },
        select: {
          title: true,
          instructor: true,
          roomCode: true,
          startAt: true,
          endAt: true,
          metadata: true,
        },
        take: 50,
      })
      .catch((error) => {
        if (this.isPrismaUnavailableError(error)) {
          return this.listFallbackSessionsForSchool(input.schoolUserId)
            .filter((session) => {
              if (
                typeof input.excludeSessionRecordId === 'number' &&
                session.id === input.excludeSessionRecordId
              ) {
                return false;
              }
              if (session.startAt >= input.endAt || session.endAt <= input.startAt) {
                return false;
              }
              return true;
            })
            .slice(0, 50)
            .map((session) => ({
              title: session.title,
              instructor: session.instructor,
              roomCode: session.roomCode,
              startAt: session.startAt,
              endAt: session.endAt,
              metadata: session.metadata,
            }));
        }
        throw error;
      });

    const collisions = overlappingSessions.reduce<
      Array<{
        title: string;
        instructor: string;
        roomCode: string;
        startAt: Date;
        endAt: Date;
        metadata: Prisma.JsonValue | null;
        reasons: Array<'instructor' | 'room' | 'teacher' | 'audience'>;
      }>
    >((items, session) => {
        const teacherAccess = this.parseTeacherAccessMetadata(session.metadata);
        const reasons: Array<'instructor' | 'room' | 'teacher' | 'audience'> = [];

        if (session.instructor.trim().toLowerCase() === normalizedInstructor) {
          reasons.push('instructor');
        }
        if (session.roomCode.trim().toLowerCase() === normalizedRoomCode) {
          reasons.push('room');
        }
        if (
          normalizedAssignedTutorEmail &&
          teacherAccess.assignedTutorEmail === normalizedAssignedTutorEmail
        ) {
          reasons.push('teacher');
        }
        if (
          normalizedAudienceTag &&
          this.normalizeAudienceTag(teacherAccess.audienceTag) === normalizedAudienceTag
        ) {
          reasons.push('audience');
        }

        if (reasons.length === 0) {
          return items;
        }

        items.push({
          ...session,
          reasons,
        });

        return items;
      }, [])
      .slice(0, 5);

    if (collisions.length === 0) {
      return;
    }

    const instructorCollision = collisions.some((session) => session.reasons.includes('instructor'));
    const roomCollision = collisions.some((session) => session.reasons.includes('room'));
    const assignedTeacherCollision = collisions.some((session) => session.reasons.includes('teacher'));
    const audienceCollision = collisions.some((session) => session.reasons.includes('audience'));

    const conflictHintParts: string[] = [];
    if (instructorCollision) {
      conflictHintParts.push('the same instructor is already booked');
    }
    if (roomCollision) {
      conflictHintParts.push('the room code is already booked');
    }
    if (assignedTeacherCollision) {
      conflictHintParts.push('the assigned teacher already has another class');
    }
    if (audienceCollision) {
      conflictHintParts.push('the same class audience already has another class');
    }

    const conflictHint =
      conflictHintParts.length > 0
        ? conflictHintParts.join(' and ')
        : 'another overlapping class already exists';

    const conflictingTitles = collisions
      .map((session) => `"${session.title}"`)
      .filter((title, index, array) => array.indexOf(title) === index)
      .slice(0, 2)
      .join(', ');

    throw new BadRequestException(
      `Schedule conflict detected: ${conflictHint} for this time range.${
        conflictingTitles ? ` Conflict with ${conflictingTitles}.` : ''
      }`
    );
  }

  private mapSession(
    session: {
      publicId: string;
      title: string;
      subject: string;
      instructor: string;
      startAt: Date;
      endAt: Date;
      durationMinutes: number;
      expectedStudents: number;
      roomCode: string;
      notes: string | null;
      metadata?: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    },
    nowMs = Date.now(),
    options?: { includeTeacherAccess?: boolean }
  ) {
    const teacherAccess = this.parseTeacherAccessMetadata(session.metadata);
    const attendanceWindow = this.parseAttendanceWindowMetadata(session.metadata);
    const includeTeacherAccess = options?.includeTeacherAccess === true;

    return {
      id: session.publicId,
      title: session.title,
      subject: session.subject,
      instructor: session.instructor,
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      durationMinutes: session.durationMinutes,
      expectedStudents: session.expectedStudents,
      roomCode: session.roomCode,
      notes: session.notes,
      assignedTutorEmail: teacherAccess.assignedTutorEmail,
      assignedTutorName: teacherAccess.assignedTutorName,
      department: teacherAccess.department,
      classGroup: teacherAccess.classGroup,
      audienceTag: teacherAccess.audienceTag,
      tutorJoinLink: includeTeacherAccess
        ? this.buildTutorJoinLink(
            session.publicId,
            teacherAccess.tutorJoinToken,
            teacherAccess.tutorJoinCode
          )
        : null,
      tutorAccessCode: includeTeacherAccess ? teacherAccess.tutorJoinCode : null,
      attendanceWindow,
      status: this.resolveSessionStatus(session.startAt, session.endAt, nowMs),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private resolveSessionStatus(startAt: Date, endAt: Date, nowMs: number): ScheduleStatus {
    if (startAt.getTime() <= nowMs && endAt.getTime() > nowMs) {
      return 'live';
    }
    if (endAt.getTime() <= nowMs) {
      return 'completed';
    }
    return 'upcoming';
  }

  private normalizeStatus(value?: string | null) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized === 'live') {
      return 'live' as const;
    }
    if (normalized === 'completed') {
      return 'completed' as const;
    }
    if (normalized === 'upcoming') {
      return 'upcoming' as const;
    }
    return 'all' as const;
  }

  private normalizeAttendanceStatus(value: unknown): SessionAttendanceStatus {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized === 'late') {
      return 'late';
    }
    if (normalized === 'absent') {
      return 'absent';
    }
    if (normalized === 'pending') {
      return 'pending';
    }
    return 'present';
  }

  private normalizeAttendanceAction(value: unknown) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized === 'leave') {
      return 'leave' as const;
    }
    if (normalized === 'check_in') {
      return 'check_in' as const;
    }
    return 'join' as const;
  }

  private resolveCheckedInAttendanceStatus(
    attendanceWindow: SessionAttendanceWindowState,
    checkedInAt: Date
  ): SessionAttendanceStatus {
    if (!attendanceWindow.openedAt) {
      return 'present';
    }

    const openedAtMs = new Date(attendanceWindow.openedAt).getTime();
    if (!Number.isFinite(openedAtMs)) {
      return 'present';
    }

    return checkedInAt.getTime() >
      openedAtMs + attendanceWindow.gracePeriodMinutes * 60 * 1000
      ? 'late'
      : 'present';
  }

  private normalizeAttendanceWindowAction(value: unknown) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    if (normalized === 'close') {
      return 'close' as const;
    }
    return 'open' as const;
  }

  private normalizeRequiredText(value: unknown, label: string) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required.`);
    }
    return normalized;
  }

  private mapNotificationToActivity(notification: {
    id: string;
    kind: ScheduleNotificationKind;
    sessionId: string;
    title: string;
    message: string;
    createdAt: string;
    createdAtLabel: string;
  }): ActivityItem {
    const createdAtMs = new Date(notification.createdAt).getTime() || Date.now();
    if (notification.kind === 'teacher_invite' || notification.kind === 'class_assignment') {
      return {
        id: notification.id,
        type: 'invite_sent',
        title: notification.title,
        detail: notification.message,
        sessionId: notification.sessionId,
        createdAt: notification.createdAt,
        createdAtLabel: notification.createdAtLabel,
        timestampMs: createdAtMs,
      };
    }
    if (notification.kind === 'teacher_access_accepted') {
      return {
        id: notification.id,
        type: 'invite_accepted',
        title: notification.title,
        detail: notification.message,
        sessionId: notification.sessionId,
        createdAt: notification.createdAt,
        createdAtLabel: notification.createdAtLabel,
        timestampMs: createdAtMs,
      };
    }
    return {
      id: notification.id,
      type: 'system',
      title: notification.title,
      detail: notification.message,
      sessionId: notification.sessionId,
      createdAt: notification.createdAt,
      createdAtLabel: notification.createdAtLabel,
      timestampMs: createdAtMs,
    };
  }

  private mapSessionsToActivities(sessions: Array<{
    id: string;
    title: string;
    subject: string;
    instructor: string;
    startAt: string;
    durationMinutes: number;
    createdAt: string;
    updatedAt: string;
  }>): ActivityItem[] {
    const now = Date.now();
    const activities: ActivityItem[] = [];

    sessions.forEach((session) => {
      const startMs = new Date(session.startAt).getTime();
      const endMs = startMs + session.durationMinutes * 60 * 1000;
      const createdMs = new Date(session.createdAt).getTime() || startMs;
      const updatedMs = new Date(session.updatedAt).getTime() || createdMs;

      if (Number.isFinite(startMs)) {
        if (now >= startMs && now < endMs) {
          activities.push({
            id: `live-${session.id}`,
            type: 'class_live',
            title: `Live now: ${session.title}`,
            detail: `${session.subject} • ${session.instructor}`,
            sessionId: session.id,
            createdAt: new Date(startMs).toISOString(),
            createdAtLabel: this.toRelativeLabel(new Date(startMs)),
            timestampMs: startMs,
          });
          return;
        }

        if (startMs > now && startMs - now <= 1000 * 60 * 60 * 48) {
          activities.push({
            id: `upcoming-${session.id}`,
            type: 'class_upcoming',
            title: `Upcoming: ${session.title}`,
            detail: `${session.subject} • ${session.instructor}`,
            sessionId: session.id,
            createdAt: new Date(startMs).toISOString(),
            createdAtLabel: this.toRelativeLabel(new Date(startMs)),
            timestampMs: startMs,
          });
        }
      }

      if (now - updatedMs <= 1000 * 60 * 60 * 24 * 7 && updatedMs !== createdMs) {
        activities.push({
          id: `updated-${session.id}`,
          type: 'class_updated',
          title: `Class updated: ${session.title}`,
          detail: `${session.subject} • ${session.instructor}`,
          sessionId: session.id,
          createdAt: new Date(updatedMs).toISOString(),
          createdAtLabel: this.toRelativeLabel(new Date(updatedMs)),
          timestampMs: updatedMs,
        });
        return;
      }

      if (now - createdMs <= 1000 * 60 * 60 * 24 * 7) {
        activities.push({
          id: `created-${session.id}`,
          type: 'class_created',
          title: `Class scheduled: ${session.title}`,
          detail: `${session.subject} • ${session.instructor}`,
          sessionId: session.id,
          createdAt: new Date(createdMs).toISOString(),
          createdAtLabel: this.toRelativeLabel(new Date(createdMs)),
          timestampMs: createdMs,
        });
      }
    });

    return activities;
  }

  private mapAttendanceToActivities(records: SessionAttendanceRecord[]): ActivityItem[] {
    const now = Date.now();
    return records.reduce<ActivityItem[]>((activities, record) => {
      const eventDate =
        record.source === 'live'
          ? record.joinedAt || record.updatedAt
          : record.source === 'check_in'
            ? record.checkedInAt || record.updatedAt
            : record.manualMarkedAt || record.updatedAt;
      const timestampMs = eventDate.getTime();
      if (!Number.isFinite(timestampMs) || now - timestampMs > 1000 * 60 * 60 * 24 * 7) {
        return activities;
      }

      activities.push({
        id: `attendance-${record.id}`,
        type: 'attendance_recorded',
        title:
          record.source === 'live'
            ? `Student entered class: ${record.participantName}`
            : record.source === 'check_in'
              ? record.status === 'late'
                ? `Attendance confirmed late: ${record.participantName}`
                : `Attendance confirmed: ${record.participantName}`
            : record.status === 'absent'
              ? `Attendance marked absent: ${record.participantName}`
              : `Attendance marked present: ${record.participantName}`,
        detail: `${record.sessionTitle} • ${record.sessionSubject}`,
        sessionId: record.sessionId,
        createdAt: eventDate.toISOString(),
        createdAtLabel: this.toRelativeLabel(eventDate),
        timestampMs,
      });

      return activities;
    }, []);
  }

  private normalizeOptionalText(value: unknown) {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private normalizeEmail(value: unknown) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private parseOptionalDate(value: unknown) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Date filter is invalid. Use a valid ISO date string.');
    }
    return parsed;
  }

  private parseRequiredDate(value: unknown, label: string) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required.`);
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is invalid. Use a valid date and time.`);
    }
    return parsed;
  }

  private normalizeApiRole(value: unknown) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
      return 'school';
    }
    if (normalized === 'admin') {
      return 'admin';
    }
    if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
      return 'tutor';
    }
    return 'student';
  }

  private mapAccountRoleToApiRole(role: AccountRole) {
    if (role === AccountRole.SCHOOL) {
      return 'school';
    }
    if (role === AccountRole.ADMIN) {
      return 'admin';
    }
    if (role === AccountRole.TUTOR) {
      return 'tutor';
    }
    return 'student';
  }

  private createPublicId(prefix: string, userId: number) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `${prefix}-${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }

  private buildAttendanceParticipantKey(value: unknown) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private slugifyAttendanceLabel(value: string) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
