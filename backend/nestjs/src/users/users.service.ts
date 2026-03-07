/**
 * UsersService
 *
 * Encapsulates user-related database access. Services should be small and
 * focused; controllers delegate work to services and remain thin.
 */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccountRole, AccountRoleStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Return all users. In production, add pagination, filtering and RBAC.
   */
  async findAllForAuthUser(authUser: AuthUserContext) {
    await this.assertAdminAccess(authUser);
    return this.prisma.user.findMany();
  }

  async listTutorDirectoryForAuthUser(authUser: AuthUserContext, input?: { search?: string }) {
    await this.assertSchoolOrAdminAccess(authUser);
    const normalizedSearch = String(input?.search || '').trim();

    const searchFilter = normalizedSearch
      ? {
          OR: [
            {
              name: {
                contains: normalizedSearch,
                mode: 'insensitive' as const,
              },
            },
            {
              email: {
                contains: normalizedSearch,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;

    const tutors = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                role: {
                  in: ['tutor', 'teacher', 'instructor'],
                },
              },
              {
                accountRoles: {
                  some: {
                    role: AccountRole.TUTOR,
                    status: AccountRoleStatus.ACTIVE,
                  },
                },
              },
            ],
          },
          ...(searchFilter ? [searchFilter] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accountRoles: {
          where: {
            status: AccountRoleStatus.ACTIVE,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 400,
    });

    return {
      tutors: tutors.map((tutor) => ({
        id: String(tutor.id),
        email: tutor.email,
        name: tutor.name || null,
        role: 'tutor' as const,
        joinedAt: tutor.createdAt.toISOString(),
        activeRoles: tutor.accountRoles.map((item) => this.toApiRole(item.role)),
      })),
    };
  }

  /**
   * Create a user with minimal fields. Validation should be added at the
   * controller level or via DTOs; this is a simple example for the scaffold.
   */
  async create(data: { email: string; name?: string; role?: string }) {
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    const normalizedRole = this.normalizeRole(data.role);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.name,
          role: this.toApiRole(normalizedRole),
        },
      });

      await tx.userRole.create({
        data: {
          publicId: this.createRolePublicId(user.id),
          userId: user.id,
          role: normalizedRole,
          status: AccountRoleStatus.ACTIVE,
          isDefault: true,
          activatedAt: new Date(),
        },
      });

      return user;
    });
  }

  private async assertAdminAccess(authUser: AuthUserContext) {
    const hasAdminRole = await this.hasRole(authUser, ['admin']);
    if (!hasAdminRole) {
      throw new ForbiddenException('Only admin accounts can access this users route.');
    }
  }

  private async assertSchoolOrAdminAccess(authUser: AuthUserContext) {
    const hasSchoolOrAdminRole = await this.hasRole(authUser, ['school', 'admin']);
    if (!hasSchoolOrAdminRole) {
      throw new ForbiddenException('Only school or admin accounts can access tutor directory.');
    }
  }

  private async hasRole(authUser: AuthUserContext, allowedRoles: Array<'school' | 'admin' | 'tutor' | 'student'>) {
    const directRole = this.normalizeApiRole(authUser.role);
    if (allowedRoles.includes(directRole)) {
      return true;
    }

    const normalizedEmail = String(authUser.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
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

    if (!user) {
      return false;
    }

    const primaryRole = this.normalizeApiRole(user.role);
    if (allowedRoles.includes(primaryRole)) {
      return true;
    }

    return user.accountRoles.some((role) => allowedRoles.includes(this.toApiRole(role.role)));
  }

  private normalizeApiRole(roleValue?: string | null) {
    const normalized = String(roleValue || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
      return 'school' as const;
    }
    if (normalized === 'admin') {
      return 'admin' as const;
    }
    if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
      return 'tutor' as const;
    }
    return 'student' as const;
  }

  private normalizeRole(roleValue?: string) {
    const normalized = String(roleValue || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (normalized === 'tutor' || normalized === 'teacher' || normalized === 'instructor') {
      return AccountRole.TUTOR;
    }
    if (normalized === 'school' || normalized === 'school-admin' || normalized === 'school-owner') {
      return AccountRole.SCHOOL;
    }
    if (normalized === 'admin') {
      return AccountRole.ADMIN;
    }
    return AccountRole.STUDENT;
  }

  private toApiRole(role: AccountRole) {
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

  private createRolePublicId(userId: number) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `ROL-${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }
}
