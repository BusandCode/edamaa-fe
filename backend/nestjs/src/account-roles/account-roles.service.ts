import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountRole,
  AccountRoleStatus,
  Prisma,
  RoleChangeRequestStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type RequestRoleChangeInput = {
  targetRole?: string;
  note?: string;
  payload?: unknown;
};

type SwitchRoleInput = {
  role?: string;
};

type DeactivateRoleInput = {
  role?: string;
};

type ApproveRequestInput = {
  makeDefault?: boolean;
  note?: string;
};

type RejectRequestInput = {
  reason?: string;
};

const REQUESTABLE_ROLES: AccountRole[] = [AccountRole.TUTOR, AccountRole.SCHOOL];

@Injectable()
export class AccountRolesService {
  private readonly adminEmailAllowlist: Set<string>;

  constructor(private readonly prisma: PrismaService) {
    this.adminEmailAllowlist = this.parseAdminEmailAllowlist(
      process.env.ADMIN_EMAIL_ALLOWLIST || ''
    );
  }

  async getMyRoles(authUser: AuthUser) {
    const user = await this.resolveOrCreateUser(authUser);
    await this.ensureRoleStateConsistency(user.id, this.toAccountRole(user.role));
    return this.buildRoleStatePayload(user.id);
  }

  async requestRoleChange(authUser: AuthUser, input: RequestRoleChangeInput) {
    const user = await this.resolveOrCreateUser(authUser);
    await this.ensureRoleStateConsistency(user.id, this.toAccountRole(user.role));

    const targetRole = this.parseRequestableRole(input.targetRole);

    const existingRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId: user.id,
          role: targetRole,
        },
      },
    });

    if (existingRole?.status === AccountRoleStatus.ACTIVE) {
      throw new BadRequestException(`Your ${this.toApiRole(targetRole)} role is already active.`);
    }

    const existingPending = await this.prisma.roleChangeRequest.findFirst({
      where: {
        userId: user.id,
        targetRole,
        status: RoleChangeRequestStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingPending) {
      return {
        message: `A ${this.toApiRole(targetRole)} upgrade request is already pending review.`,
        request: this.toRoleRequestItem(existingPending),
        roleState: await this.buildRoleStatePayload(user.id),
      };
    }

    const note = this.normalizeOptionalText(input.note);
    if (note && note.length > 1200) {
      throw new BadRequestException('Please keep your request note within 1200 characters.');
    }

    const requestPayload = this.toSafeJson(input.payload);

    const created = await this.prisma.roleChangeRequest.create({
      data: {
        publicId: this.createPublicId('RCR', user.id),
        userId: user.id,
        targetRole,
        status: RoleChangeRequestStatus.PENDING,
        note,
        requestPayload,
      },
    });

    return {
      message: 'Role upgrade request submitted. We will notify you after review.',
      request: this.toRoleRequestItem(created),
      roleState: await this.buildRoleStatePayload(user.id),
    };
  }

  async switchDefaultRole(authUser: AuthUser, input: SwitchRoleInput) {
    const user = await this.resolveOrCreateUser(authUser);
    await this.ensureRoleStateConsistency(user.id, this.toAccountRole(user.role));

    const targetRole = this.parseAnyRole(input.role);

    const roleRow = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId: user.id,
          role: targetRole,
        },
      },
    });

    if (!roleRow || roleRow.status !== AccountRoleStatus.ACTIVE) {
      throw new ForbiddenException(
        `You do not have an active ${this.toApiRole(targetRole)} role to switch into.`
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });

      await tx.userRole.update({
        where: { id: roleRow.id },
        data: { isDefault: true },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { role: this.toApiRole(targetRole) },
      });
    });

    return {
      message: `Default account switched to ${this.toApiRole(targetRole)}.`,
      roleState: await this.buildRoleStatePayload(user.id),
    };
  }

  async deactivateRole(authUser: AuthUser, input: DeactivateRoleInput) {
    const user = await this.resolveOrCreateUser(authUser);
    await this.ensureRoleStateConsistency(user.id, this.toAccountRole(user.role));

    const targetRole = this.parseAnyRole(input.role);

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });

    const target = roles.find((role) => role.role === targetRole);
    if (!target || target.status !== AccountRoleStatus.ACTIVE) {
      throw new BadRequestException(`The ${this.toApiRole(targetRole)} role is not active.`);
    }

    const activeRoles = roles.filter((role) => role.status === AccountRoleStatus.ACTIVE);
    if (activeRoles.length <= 1) {
      throw new BadRequestException('You need at least one active role on your account.');
    }

    const now = new Date();
    const fallbackRole = activeRoles.find((role) => role.id !== target.id);
    if (!fallbackRole) {
      throw new BadRequestException('No fallback role is available.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.update({
        where: { id: target.id },
        data: {
          status: AccountRoleStatus.INACTIVE,
          isDefault: false,
          deactivatedAt: now,
        },
      });

      if (target.isDefault) {
        await tx.userRole.update({
          where: { id: fallbackRole.id },
          data: {
            isDefault: true,
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: { role: this.toApiRole(fallbackRole.role) },
        });
      }
    });

    return {
      message: `${this.toApiRole(targetRole)} role deactivated.`,
      roleState: await this.buildRoleStatePayload(user.id),
    };
  }

  async listRoleRequestsForAdmin(authUser: AuthUser, statusRaw?: string) {
    await this.assertAdmin(authUser);

    const normalizedStatus = String(statusRaw || '')
      .trim()
      .toUpperCase();

    const status = this.parseRequestStatus(normalizedStatus);

    const requests = await this.prisma.roleChangeRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return {
      generatedAt: new Date().toISOString(),
      requests: requests.map((request) => ({
        id: request.publicId,
        targetRole: this.toApiRole(request.targetRole),
        status: request.status.toLowerCase(),
        note: request.note,
        rejectionReason: request.rejectionReason,
        reviewedByEmail: request.reviewedByEmail,
        reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
        createdAt: request.createdAt.toISOString(),
        user: {
          id: request.user.id,
          email: request.user.email,
          name: request.user.name,
          defaultRole: this.toApiRole(this.toAccountRole(request.user.role)),
        },
      })),
    };
  }

  async approveRoleRequest(authUser: AuthUser, requestPublicId: string, input: ApproveRequestInput) {
    const admin = await this.assertAdmin(authUser);

    const request = await this.prisma.roleChangeRequest.findUnique({
      where: {
        publicId: this.normalizeRequiredText(requestPublicId, 'Request id is required.'),
      },
    });

    if (!request) {
      throw new NotFoundException('Role request not found.');
    }

    if (request.status !== RoleChangeRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved.');
    }

    const makeDefault = input.makeDefault !== false;
    const reviewerNote = this.normalizeOptionalText(input.note);

    await this.prisma.$transaction(async (tx) => {
      const upsertedRole = await tx.userRole.upsert({
        where: {
          userId_role: {
            userId: request.userId,
            role: request.targetRole,
          },
        },
        update: {
          status: AccountRoleStatus.ACTIVE,
          activatedAt: new Date(),
          deactivatedAt: null,
        },
        create: {
          publicId: this.createPublicId('ROL', request.userId),
          userId: request.userId,
          role: request.targetRole,
          status: AccountRoleStatus.ACTIVE,
          isDefault: false,
          activatedAt: new Date(),
        },
      });

      const userRoles = await tx.userRole.findMany({
        where: {
          userId: request.userId,
          status: AccountRoleStatus.ACTIVE,
        },
        orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
      });

      if (makeDefault) {
        await tx.userRole.updateMany({
          where: { userId: request.userId },
          data: { isDefault: false },
        });

        await tx.userRole.update({
          where: { id: upsertedRole.id },
          data: { isDefault: true },
        });

        await tx.user.update({
          where: { id: request.userId },
          data: { role: this.toApiRole(request.targetRole) },
        });
      } else {
        const hasDefaultActiveRole = userRoles.some((role) => role.isDefault);
        if (!hasDefaultActiveRole) {
          await tx.userRole.update({
            where: { id: upsertedRole.id },
            data: { isDefault: true },
          });

          await tx.user.update({
            where: { id: request.userId },
            data: { role: this.toApiRole(upsertedRole.role) },
          });
        }
      }

      await tx.roleChangeRequest.update({
        where: { id: request.id },
        data: {
          status: RoleChangeRequestStatus.APPROVED,
          reviewedByEmail: admin.email,
          reviewedAt: new Date(),
          metadata: this.toSafeJson({
            reviewerNote,
            makeDefault,
          }),
        },
      });
    });

    return {
      message: `${this.toApiRole(request.targetRole)} role request approved.`,
      roleState: await this.buildRoleStatePayload(request.userId),
    };
  }

  async rejectRoleRequest(authUser: AuthUser, requestPublicId: string, input: RejectRequestInput) {
    const admin = await this.assertAdmin(authUser);

    const request = await this.prisma.roleChangeRequest.findUnique({
      where: {
        publicId: this.normalizeRequiredText(requestPublicId, 'Request id is required.'),
      },
    });

    if (!request) {
      throw new NotFoundException('Role request not found.');
    }

    if (request.status !== RoleChangeRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected.');
    }

    const reason = this.normalizeOptionalText(input.reason);

    await this.prisma.roleChangeRequest.update({
      where: { id: request.id },
      data: {
        status: RoleChangeRequestStatus.REJECTED,
        rejectionReason: reason || 'Request did not pass review.',
        reviewedByEmail: admin.email,
        reviewedAt: new Date(),
      },
    });

    return {
      message: `${this.toApiRole(request.targetRole)} role request rejected.`,
      roleState: await this.buildRoleStatePayload(request.userId),
    };
  }

  private async buildRoleStatePayload(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accountRoles: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
        roleChangeRequests: {
          where: {
            status: {
              in: [RoleChangeRequestStatus.PENDING, RoleChangeRequestStatus.REJECTED],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User account could not be loaded.');
    }

    const activeRoles = user.accountRoles
      .filter((role) => role.status === AccountRoleStatus.ACTIVE)
      .map((role) => this.toApiRole(role.role));

    const defaultRoleRow =
      user.accountRoles.find((role) => role.isDefault && role.status === AccountRoleStatus.ACTIVE) ||
      user.accountRoles.find((role) => role.isDefault) ||
      user.accountRoles.find((role) => role.status === AccountRoleStatus.ACTIVE) ||
      user.accountRoles[0] ||
      null;

    const defaultRole = this.toApiRole(defaultRoleRow?.role || this.toAccountRole(user.role));

    const pendingTargetRoles = new Set(
      user.roleChangeRequests
        .filter((request) => request.status === RoleChangeRequestStatus.PENDING)
        .map((request) => request.targetRole)
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        defaultRole,
      },
      roles: user.accountRoles.map((role) => this.toRoleItem(role)),
      activeRoles,
      pendingRequests: user.roleChangeRequests.map((request) => this.toRoleRequestItem(request)),
      canRequestRoles: REQUESTABLE_ROLES.filter(
        (role) =>
          !activeRoles.includes(this.toApiRole(role)) &&
          !pendingTargetRoles.has(role)
      ).map((role) => this.toApiRole(role)),
    };
  }

  private toRoleItem(role: UserRole) {
    return {
      id: role.publicId,
      role: this.toApiRole(role.role),
      status: role.status.toLowerCase(),
      isDefault: role.isDefault,
      requestedAt: role.requestedAt.toISOString(),
      activatedAt: role.activatedAt ? role.activatedAt.toISOString() : null,
      deactivatedAt: role.deactivatedAt ? role.deactivatedAt.toISOString() : null,
    };
  }

  private toRoleRequestItem(request: {
    publicId: string;
    targetRole: AccountRole;
    status: RoleChangeRequestStatus;
    note: string | null;
    rejectionReason: string | null;
    reviewedByEmail: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: request.publicId,
      targetRole: this.toApiRole(request.targetRole),
      status: request.status.toLowerCase(),
      note: request.note,
      rejectionReason: request.rejectionReason,
      reviewedByEmail: request.reviewedByEmail,
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
      createdAt: request.createdAt.toISOString(),
    };
  }

  private async assertAdmin(authUser: AuthUser) {
    const user = await this.resolveOrCreateUser(authUser);
    const authRole = this.resolveAuthRoleCandidate(authUser);
    const dbRole = this.toAccountRole(user.role);

    if (authRole === AccountRole.ADMIN || dbRole === AccountRole.ADMIN) {
      return { id: user.id, email: user.email };
    }

    const adminRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId: user.id,
          role: AccountRole.ADMIN,
        },
      },
    });

    if (adminRole?.status === AccountRoleStatus.ACTIVE) {
      return { id: user.id, email: user.email };
    }

    throw new ForbiddenException('Admin role is required for this action.');
  }

  private parseRequestStatus(value: string) {
    if (!value) {
      return null;
    }

    if (value === 'PENDING') {
      return RoleChangeRequestStatus.PENDING;
    }
    if (value === 'APPROVED') {
      return RoleChangeRequestStatus.APPROVED;
    }
    if (value === 'REJECTED') {
      return RoleChangeRequestStatus.REJECTED;
    }
    if (value === 'CANCELED' || value === 'CANCELLED') {
      return RoleChangeRequestStatus.CANCELED;
    }

    throw new BadRequestException('Invalid request status filter.');
  }

  private parseAnyRole(value: string | undefined) {
    const role = this.toAccountRole(value);
    if (!role) {
      throw new BadRequestException('A valid role is required.');
    }
    return role;
  }

  private parseRequestableRole(value: string | undefined) {
    const role = this.parseAnyRole(value);

    if (!REQUESTABLE_ROLES.includes(role)) {
      throw new BadRequestException('Only tutor or school role requests are allowed.');
    }

    return role;
  }

  private async ensureRoleStateConsistency(userId: number, fallbackRole: AccountRole | null) {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });

    if (fallbackRole === AccountRole.ADMIN) {
      const now = new Date();
      const adminRole = roles.find((role) => role.role === AccountRole.ADMIN) || null;

      if (!adminRole) {
        await this.prisma.$transaction(async (tx) => {
          await tx.userRole.updateMany({
            where: { userId },
            data: { isDefault: false },
          });

          await tx.userRole.create({
            data: {
              publicId: this.createPublicId('ROL', userId),
              userId,
              role: AccountRole.ADMIN,
              status: AccountRoleStatus.ACTIVE,
              isDefault: true,
              activatedAt: now,
              deactivatedAt: null,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { role: this.toApiRole(AccountRole.ADMIN) },
          });
        });
        return;
      }

      const needsActivation = adminRole.status !== AccountRoleStatus.ACTIVE;
      const needsDefault = !adminRole.isDefault;

      if (needsActivation || needsDefault) {
        await this.prisma.$transaction(async (tx) => {
          if (needsDefault) {
            await tx.userRole.updateMany({
              where: { userId },
              data: { isDefault: false },
            });
          }

          await tx.userRole.update({
            where: { id: adminRole.id },
            data: {
              status: AccountRoleStatus.ACTIVE,
              isDefault: true,
              activatedAt: adminRole.activatedAt || now,
              deactivatedAt: null,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { role: this.toApiRole(AccountRole.ADMIN) },
          });
        });
      }

      await this.prisma.user.updateMany({
        where: {
          id: userId,
          NOT: {
            role: this.toApiRole(AccountRole.ADMIN),
          },
        },
        data: {
          role: this.toApiRole(AccountRole.ADMIN),
        },
      });

      return;
    }

    if (roles.length === 0) {
      const bootstrapRole = fallbackRole || AccountRole.STUDENT;
      await this.prisma.userRole.create({
        data: {
          publicId: this.createPublicId('ROL', userId),
          userId,
          role: bootstrapRole,
          status: AccountRoleStatus.ACTIVE,
          isDefault: true,
          activatedAt: new Date(),
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { role: this.toApiRole(bootstrapRole) },
      });
      return;
    }

    const activeRoles = roles.filter((role) => role.status === AccountRoleStatus.ACTIVE);
    const defaultActive = activeRoles.find((role) => role.isDefault);
    if (defaultActive) {
      return;
    }

    const fallbackDefault =
      activeRoles.find((role) => this.toApiRole(role.role) === this.toApiRole(fallbackRole || '')) ||
      activeRoles[0] ||
      roles[0];

    if (!fallbackDefault) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      await tx.userRole.update({
        where: { id: fallbackDefault.id },
        data: { isDefault: true },
      });

      if (fallbackDefault.status === AccountRoleStatus.ACTIVE) {
        await tx.user.update({
          where: { id: userId },
          data: { role: this.toApiRole(fallbackDefault.role) },
        });
      }
    });
  }

  private async resolveOrCreateUser(authUser: AuthUser) {
    const email = this.normalizeEmail(authUser.email);
    if (!email) {
      throw new UnauthorizedException('Authenticated email is required.');
    }

    const fullName = this.resolveFullName(authUser);
    const authRoleCandidate = this.resolveAuthRoleCandidate(authUser);
    const authRole = this.isAdminEmailAllowlisted(email)
      ? AccountRole.ADMIN
      : authRoleCandidate;
    const roleToApply = this.toApiRole(authRole || AccountRole.STUDENT);

    const existing = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      const existingApiRole = this.toApiRole(this.toAccountRole(existing.role));
      const shouldPromoteLegacyRole =
        roleToApply !== 'student' &&
        existingApiRole === 'student';
      const shouldElevateAllowlistedAdmin =
        authRole === AccountRole.ADMIN && existingApiRole !== 'admin';

      if (!existing.name && fullName && (shouldPromoteLegacyRole || shouldElevateAllowlistedAdmin)) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { name: fullName, role: roleToApply },
        });
      }

      if (!existing.name && fullName) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { name: fullName },
        });
      }

      if (shouldPromoteLegacyRole || shouldElevateAllowlistedAdmin) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { role: roleToApply },
        });
      }
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email,
        name: fullName,
        role: roleToApply,
      },
    });
  }

  private resolveAuthRoleCandidate(authUser: AuthUser) {
    const candidates: Array<string | null | undefined> = [
      authUser.role,
      this.readString(authUser.app_metadata?.role),
      this.readString(authUser.user_metadata?.role),
      this.readString(authUser.user_metadata?.account_role),
      this.readString(authUser.user_metadata?.user_type),
      this.readString(authUser.app_metadata?.user_type),
      this.readArrayFirstString(authUser.user_metadata?.roles),
      this.readArrayFirstString(authUser.app_metadata?.roles),
    ];

    for (const candidate of candidates) {
      const parsed = this.toAccountRole(candidate);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  private resolveFullName(authUser: AuthUser) {
    const metadataName = this.normalizeOptionalText(this.readString(authUser.user_metadata?.full_name));
    if (metadataName) {
      return metadataName;
    }

    const fallbackFromEmail = (this.normalizeEmail(authUser.email).split('@')[0] || '').trim();
    if (!fallbackFromEmail) {
      return null;
    }

    return fallbackFromEmail
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }

  private normalizeEmail(value: string | null | undefined) {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.includes('@') ? normalized : '';
  }

  private normalizeOptionalText(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private normalizeRequiredText(value: string | null | undefined, message: string) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized;
  }

  private toAccountRole(value: unknown): AccountRole | null {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (!normalized) {
      return null;
    }

    if (normalized === 'student') {
      return AccountRole.STUDENT;
    }
    if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
      return AccountRole.TUTOR;
    }
    if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
      return AccountRole.SCHOOL;
    }
    if (normalized === 'admin') {
      return AccountRole.ADMIN;
    }

    return null;
  }

  private toApiRole(value: AccountRole | string | null) {
    const role = typeof value === 'string' ? this.toAccountRole(value) : value;
    if (role === AccountRole.TUTOR) {
      return 'tutor';
    }
    if (role === AccountRole.SCHOOL) {
      return 'school';
    }
    if (role === AccountRole.ADMIN) {
      return 'admin';
    }
    return 'student';
  }

  private toSafeJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return undefined;
    }

    try {
      return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
    } catch {
      return undefined;
    }
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private readArrayFirstString(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      return '';
    }

    const first = value[0];
    return typeof first === 'string' ? first : '';
  }

  private createPublicId(prefix: string, userId: number) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `${prefix}-${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }

  private parseAdminEmailAllowlist(rawValue: string) {
    return new Set(
      String(rawValue || '')
        .split(',')
        .map((email) => this.normalizeEmail(email))
        .filter(Boolean)
    );
  }

  private isAdminEmailAllowlisted(email: string) {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      return false;
    }
    return this.adminEmailAllowlist.has(normalized);
  }
}
