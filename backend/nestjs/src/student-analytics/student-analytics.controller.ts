import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { InternalTokenGuard } from '../internal-admin/internal-token.guard';
import { StudentAnalyticsService } from './student-analytics.service';

@Controller('student-analytics')
export class StudentAnalyticsController {
  constructor(private readonly studentAnalyticsService: StudentAnalyticsService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('me/performance')
  getMyPerformance(@Req() request: Request, @Query('learnerKey') learnerKey?: string) {
    const authUser = ((request as any).user || null) as
      | { id?: string | null; email?: string | null }
      | null;

    return this.studentAnalyticsService.getPerformanceSnapshotForAuthUser(
      {
        id: authUser?.id ?? null,
        email: authUser?.email ?? null,
      },
      { learnerKey }
    );
  }

  @UseGuards(InternalTokenGuard)
  @Get('performance')
  getPerformance(
    @Query('learnerKey') learnerKey?: string,
    @Query('studentId') studentId?: string
  ) {
    const parsedStudentId = Number(studentId);

    return this.studentAnalyticsService.getPerformanceSnapshot({
      learnerKey,
      studentId: Number.isFinite(parsedStudentId) ? parsedStudentId : null,
    });
  }
}
