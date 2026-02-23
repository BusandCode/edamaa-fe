/**
 * UsersService
 *
 * Encapsulates user-related database access. Services should be small and
 * focused; controllers delegate work to services and remain thin.
 */
import { Injectable } from '@nestjs/common';
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
    return this.prisma.user.create({ data });
  }
}
