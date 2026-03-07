import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SchoolScheduleService } from './school-schedule.service';

type CreateSchoolSessionBody = {
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

@UseGuards(SupabaseAuthGuard)
@Controller('school-schedule')
export class SchoolScheduleController {
  constructor(private readonly schoolScheduleService: SchoolScheduleService) {}

  @Get('me/sessions')
  listMySchoolSessions(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.listSessionsForAuthUser(this.getAuthUser(request), {
      search,
      status,
      dateFrom,
      dateTo,
      schoolEmail,
    });
  }

  @Post('me/sessions')
  createSchoolSession(@Req() request: Request, @Body() body: CreateSchoolSessionBody) {
    return this.schoolScheduleService.createSessionForAuthUser(this.getAuthUser(request), {
      title: body.title,
      subject: body.subject,
      instructor: body.instructor,
      startAt: body.startAt,
      durationMinutes: body.durationMinutes,
      expectedStudents: body.expectedStudents,
      roomCode: body.roomCode,
      notes: body.notes,
      schoolEmail: body.schoolEmail,
    });
  }

  @Delete('me/sessions/:sessionId')
  deleteSchoolSession(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.deleteSessionForAuthUser(
      this.getAuthUser(request),
      sessionId,
      {
        schoolEmail,
      }
    );
  }

  private getAuthUser(request: Request) {
    const authUser = ((request as any).user || null) as
      | {
          id?: string | null;
          email?: string | null;
          role?: string | null;
          app_metadata?: Record<string, unknown> | null;
          user_metadata?: Record<string, unknown> | null;
        }
      | null;

    const metadataRoleCandidates = [
      authUser?.role,
      this.readString(authUser?.app_metadata?.role),
      this.readString(authUser?.user_metadata?.role),
      this.readString(authUser?.user_metadata?.account_role),
      this.readString(authUser?.user_metadata?.user_type),
      this.readString(authUser?.app_metadata?.user_type),
      this.readArrayFirstString(authUser?.app_metadata?.roles),
      this.readArrayFirstString(authUser?.user_metadata?.roles),
    ];

    const resolvedRole =
      metadataRoleCandidates.find(
        (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
      ) || null;

    return {
      id: authUser?.id ?? null,
      email: authUser?.email ?? null,
      name:
        (typeof authUser?.user_metadata?.full_name === 'string' &&
          (authUser?.user_metadata?.full_name as string).trim()) ||
        null,
      role: resolvedRole,
    };
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
}
