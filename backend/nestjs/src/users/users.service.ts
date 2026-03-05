/**
 * UsersService
 *
 * Encapsulates user-related database access. Services should be small and
 * focused; controllers delegate work to services and remain thin.
 */
import { Injectable } from '@nestjs/common';
import { AccountRole, AccountRoleStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Return all users. In production, add pagination, filtering and RBAC.
   */
  async findAll() {
    return this.prisma.user.findMany();
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
