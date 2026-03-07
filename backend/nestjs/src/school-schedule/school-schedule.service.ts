import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountRole, AccountRoleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
};

type ScheduleStatus = 'upcoming' | 'live' | 'completed';

type ListSchoolSessionsInput = {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  schoolEmail?: string;
};

type CreateSchoolSessionInput = {
  title?: string;
  subject?: string;
  instructor?: string;
  startAt?: string;
  durationMinutes?: number;
  expectedStudents?: number;
  roomCode?: string;
  notes?: string;
  schoolEmail?: string;
};

type ResolveWorkspaceResult = {
  schoolUserId: number;
  schoolEmail: string;
  schoolName: string;
};

@Injectable()
export class SchoolScheduleService {
  constructor(private readonly prisma: PrismaService) {}

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

    const sessions = await this.prisma.schoolScheduleSession.findMany({
      where,
      orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
      take: 500,
    });

    const nowMs = Date.now();
    const mapped = sessions
      .map((session) => this.mapSession(session, nowMs))
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

  async createSessionForAuthUser(authUser: AuthUserContext, input: CreateSchoolSessionInput) {
    const workspace = await this.resolveWorkspace(authUser, input.schoolEmail);
    const title = this.normalizeRequiredText(input.title, 'Class title');
    const subject = this.normalizeRequiredText(input.subject, 'Subject');
    const instructor = this.normalizeRequiredText(input.instructor, 'Instructor');
    const startAt = this.parseRequiredDate(input.startAt, 'Start time');

    const rawDuration = Number(input.durationMinutes);
    if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
      throw new BadRequestException('Class duration should be a valid number of minutes.');
    }
    const durationMinutes = Math.round(rawDuration);
    if (durationMinutes > 720) {
      throw new BadRequestException('Class duration is too long. Use 720 minutes or less.');
    }

    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const expectedStudentsRaw = Number(input.expectedStudents);
    const expectedStudents =
      Number.isFinite(expectedStudentsRaw) && expectedStudentsRaw >= 0
        ? Math.round(expectedStudentsRaw)
        : 0;

    const roomCode =
      this.normalizeOptionalText(input.roomCode)?.toUpperCase() ||
      `ROOM-${subject.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const notes = this.normalizeOptionalText(input.notes);

    await this.assertNoScheduleCollision({
      schoolUserId: workspace.schoolUserId,
      startAt,
      endAt,
      instructor,
      roomCode,
    });

    const created = await this.prisma.schoolScheduleSession.create({
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
      },
    });

    return {
      session: this.mapSession(created),
      message: 'Class session scheduled successfully.',
    };
  }

  async deleteSessionForAuthUser(
    authUser: AuthUserContext,
    sessionId: string,
    input?: { schoolEmail?: string }
  ) {
    const workspace = await this.resolveWorkspace(authUser, input?.schoolEmail);
    const normalizedSessionId = this.normalizeRequiredText(sessionId, 'Session ID');

    const existing = await this.prisma.schoolScheduleSession.findFirst({
      where: {
        publicId: normalizedSessionId,
        schoolUserId: workspace.schoolUserId,
      },
      select: {
        id: true,
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

    return {
      sessionId: normalizedSessionId,
      message: 'Class session removed from schedule.',
    };
  }

  private async resolveWorkspace(authUser: AuthUserContext, schoolEmail?: string) {
    const normalizedAuthEmail = this.normalizeEmail(authUser.email);
    if (!normalizedAuthEmail) {
      throw new ForbiddenException('You must be signed in to access school schedule workspace.');
    }

    const authUserRecord = await this.prisma.user.findUnique({
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
    });

    if (!authUserRecord) {
      throw new ForbiddenException('Authenticated account was not found in the user directory.');
    }

    const activeRoles = new Set<string>([this.normalizeApiRole(authUserRecord.role)]);
    authUserRecord.accountRoles.forEach((role) => {
      activeRoles.add(this.mapAccountRoleToApiRole(role.role));
    });

    const roleFromAuthMetadata = this.normalizeApiRole(authUser.role);
    if (roleFromAuthMetadata) {
      activeRoles.add(roleFromAuthMetadata);
    }

    const isSchool = activeRoles.has('school');
    const isAdmin = activeRoles.has('admin');

    if (!isSchool && !isAdmin) {
      throw new ForbiddenException('Only school and admin accounts can access school schedule workspace.');
    }

    const normalizedTargetSchoolEmail = this.normalizeEmail(schoolEmail);
    if (isAdmin && normalizedTargetSchoolEmail && normalizedTargetSchoolEmail !== normalizedAuthEmail) {
      const targetSchoolUser = await this.prisma.user.findUnique({
        where: {
          email: normalizedTargetSchoolEmail,
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
      });

      if (!targetSchoolUser) {
        throw new NotFoundException('Target school account was not found.');
      }

      const targetRoles = new Set<string>([this.normalizeApiRole(targetSchoolUser.role)]);
      targetSchoolUser.accountRoles.forEach((role) => {
        targetRoles.add(this.mapAccountRoleToApiRole(role.role));
      });

      if (!targetRoles.has('school')) {
        throw new BadRequestException('The selected account is not a school workspace.');
      }

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

  private async assertNoScheduleCollision(input: {
    schoolUserId: number;
    startAt: Date;
    endAt: Date;
    instructor: string;
    roomCode: string;
  }) {
    const collisions = await this.prisma.schoolScheduleSession.findMany({
      where: {
        schoolUserId: input.schoolUserId,
        startAt: {
          lt: input.endAt,
        },
        endAt: {
          gt: input.startAt,
        },
        OR: [
          {
            instructor: {
              equals: input.instructor,
              mode: 'insensitive',
            },
          },
          {
            roomCode: {
              equals: input.roomCode,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        title: true,
        instructor: true,
        roomCode: true,
        startAt: true,
        endAt: true,
      },
      take: 5,
    });

    if (collisions.length === 0) {
      return;
    }

    const instructorCollision = collisions.some(
      (session) => session.instructor.trim().toLowerCase() === input.instructor.trim().toLowerCase()
    );
    const roomCollision = collisions.some(
      (session) => session.roomCode.trim().toLowerCase() === input.roomCode.trim().toLowerCase()
    );

    const conflictHintParts: string[] = [];
    if (instructorCollision) {
      conflictHintParts.push('the same instructor is already booked');
    }
    if (roomCollision) {
      conflictHintParts.push('the room code is already booked');
    }

    const conflictHint =
      conflictHintParts.length > 0
        ? conflictHintParts.join(' and ')
        : 'another overlapping class already exists';

    throw new BadRequestException(
      `Schedule conflict detected: ${conflictHint} for this time range.`
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
      createdAt: Date;
      updatedAt: Date;
    },
    nowMs = Date.now()
  ) {
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

  private normalizeRequiredText(value: unknown, label: string) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException(`${label} is required.`);
    }
    return normalized;
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
}
