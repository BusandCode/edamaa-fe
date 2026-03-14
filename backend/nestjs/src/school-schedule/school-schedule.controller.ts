import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
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
  assignedTutorEmail?: string;
  assignedTutorName?: string;
  department?: string;
  classGroup?: string;
  audienceTag?: string;
};

type UpdateSchoolSessionBody = {
  title?: string;
  subject?: string;
  instructor?: string;
  startAt?: string;
  durationMinutes?: number;
  expectedStudents?: number;
  roomCode?: string;
  notes?: string | null;
  schoolEmail?: string;
  assignedTutorEmail?: string | null;
  assignedTutorName?: string | null;
  department?: string | null;
  classGroup?: string | null;
  audienceTag?: string | null;
};

type CreateSchoolTeacherBody = {
  name?: string;
  email?: string;
  department?: string;
  classGroup?: string;
  subjectFocus?: string;
  isActive?: boolean;
  schoolEmail?: string;
};

type UpdateSchoolTeacherBody = {
  name?: string;
  email?: string;
  department?: string | null;
  classGroup?: string | null;
  subjectFocus?: string | null;
  isActive?: boolean;
  schoolEmail?: string;
};

type ResendSchoolTeacherInviteBody = {
  schoolEmail?: string;
};

type VerifyTeacherAccessBody = {
  sessionId?: string;
  token?: string;
  code?: string;
};

type UpsertSessionAttendanceBody = {
  schoolEmail?: string;
  participantId?: string | number;
  participantName?: string;
  status?: string;
  note?: string;
};

type UpdateSessionAttendanceBody = {
  schoolEmail?: string;
  status?: string;
  note?: string;
};

type RecordSessionAttendanceBody = {
  sessionId?: string;
  action?: string;
  participantId?: string | number;
  participantName?: string;
  note?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('school-schedule')
export class SchoolScheduleController {
  constructor(private readonly schoolScheduleService: SchoolScheduleService) {}

  @Get('feed')
  listScheduleFeed(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('schoolEmail') schoolEmail?: string,
    @Query('limit') limit?: string
  ) {
    return this.schoolScheduleService.listScheduleFeedForAuthUser(this.getAuthUser(request), {
      search,
      status,
      dateFrom,
      dateTo,
      schoolEmail,
      limit,
    });
  }

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

  @Get('me/teachers')
  listMySchoolTeachers(
    @Req() request: Request,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.listTeachersForAuthUser(this.getAuthUser(request), {
      search,
      includeInactive,
      schoolEmail,
    });
  }

  @Post('me/teachers')
  createSchoolTeacher(@Req() request: Request, @Body() body: CreateSchoolTeacherBody) {
    return this.schoolScheduleService.createTeacherForAuthUser(this.getAuthUser(request), {
      name: body.name,
      email: body.email,
      department: body.department,
      classGroup: body.classGroup,
      subjectFocus: body.subjectFocus,
      isActive: body.isActive,
      schoolEmail: body.schoolEmail,
    });
  }

  @Patch('me/teachers/:teacherId')
  updateSchoolTeacher(
    @Req() request: Request,
    @Param('teacherId') teacherId: string,
    @Body() body: UpdateSchoolTeacherBody
  ) {
    return this.schoolScheduleService.updateTeacherForAuthUser(
      this.getAuthUser(request),
      teacherId,
      {
        name: body.name,
        email: body.email,
        department: body.department,
        classGroup: body.classGroup,
        subjectFocus: body.subjectFocus,
        isActive: body.isActive,
        schoolEmail: body.schoolEmail,
      }
    );
  }

  @Delete('me/teachers/:teacherId')
  deleteSchoolTeacher(
    @Req() request: Request,
    @Param('teacherId') teacherId: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.deleteTeacherForAuthUser(
      this.getAuthUser(request),
      teacherId,
      { schoolEmail }
    );
  }

  @Post('me/teachers/:teacherId/invite')
  resendSchoolTeacherInvite(
    @Req() request: Request,
    @Param('teacherId') teacherId: string,
    @Body() body: ResendSchoolTeacherInviteBody
  ) {
    return this.schoolScheduleService.resendTeacherInviteForAuthUser(
      this.getAuthUser(request),
      teacherId,
      {
        schoolEmail: body.schoolEmail,
      }
    );
  }

  @Get('me/notifications')
  listMyScheduleNotifications(
    @Req() request: Request,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.listNotificationsForAuthUser(this.getAuthUser(request), {
      schoolEmail,
    });
  }

  @Get('me/activity')
  listMySchoolActivity(
    @Req() request: Request,
    @Query('schoolEmail') schoolEmail?: string,
    @Query('limit') limit?: string
  ) {
    return this.schoolScheduleService.listActivityForAuthUser(this.getAuthUser(request), {
      schoolEmail,
      limit,
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
      assignedTutorEmail: body.assignedTutorEmail,
      assignedTutorName: body.assignedTutorName,
      department: body.department,
      classGroup: body.classGroup,
      audienceTag: body.audienceTag,
    });
  }

  @Get('me/sessions/:sessionId/teacher-access')
  getTeacherAccess(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.getTeacherAccessForAuthUser(
      this.getAuthUser(request),
      sessionId,
      { schoolEmail }
    );
  }

  @Post('me/sessions/:sessionId/teacher-access/regenerate')
  regenerateTeacherAccess(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.regenerateTeacherAccessForAuthUser(
      this.getAuthUser(request),
      sessionId,
      { schoolEmail }
    );
  }

  @Get('me/sessions/:sessionId/attendance')
  getSessionAttendance(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Query('schoolEmail') schoolEmail?: string
  ) {
    return this.schoolScheduleService.listSessionAttendanceForAuthUser(
      this.getAuthUser(request),
      sessionId,
      { schoolEmail }
    );
  }

  @Post('me/sessions/:sessionId/attendance/manual')
  upsertManualAttendance(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Body() body: UpsertSessionAttendanceBody
  ) {
    return this.schoolScheduleService.upsertManualAttendanceForAuthUser(
      this.getAuthUser(request),
      sessionId,
      {
        schoolEmail: body.schoolEmail,
        participantId: body.participantId,
        participantName: body.participantName,
        status: body.status,
        note: body.note,
      }
    );
  }

  @Patch('me/sessions/:sessionId/attendance/:attendanceId')
  updateSessionAttendance(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Param('attendanceId') attendanceId: string,
    @Body() body: UpdateSessionAttendanceBody
  ) {
    return this.schoolScheduleService.updateAttendanceRecordForAuthUser(
      this.getAuthUser(request),
      sessionId,
      attendanceId,
      {
        schoolEmail: body.schoolEmail,
        status: body.status,
        note: body.note,
      }
    );
  }

  @Post('attendance/record')
  recordSessionAttendance(@Req() request: Request, @Body() body: RecordSessionAttendanceBody) {
    return this.schoolScheduleService.recordAttendanceForAuthUser(this.getAuthUser(request), {
      sessionId: body.sessionId,
      action: body.action,
      participantId: body.participantId,
      participantName: body.participantName,
      note: body.note,
    });
  }

  @Post('teacher-access/verify')
  verifyTeacherAccess(@Req() request: Request, @Body() body: VerifyTeacherAccessBody) {
    return this.schoolScheduleService.verifyTeacherAccessForAuthUser(this.getAuthUser(request), {
      sessionId: body.sessionId,
      token: body.token,
      code: body.code,
    });
  }

  @Patch('me/sessions/:sessionId')
  updateSchoolSession(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateSchoolSessionBody
  ) {
    return this.schoolScheduleService.updateSessionForAuthUser(
      this.getAuthUser(request),
      sessionId,
      {
        title: body.title,
        subject: body.subject,
        instructor: body.instructor,
        startAt: body.startAt,
        durationMinutes: body.durationMinutes,
        expectedStudents: body.expectedStudents,
        roomCode: body.roomCode,
        notes: body.notes,
        schoolEmail: body.schoolEmail,
        assignedTutorEmail: body.assignedTutorEmail,
        assignedTutorName: body.assignedTutorName,
        department: body.department,
        classGroup: body.classGroup,
        audienceTag: body.audienceTag,
      }
    );
  }

  @Post('me/notifications/:notificationId/read')
  markScheduleNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.schoolScheduleService.markNotificationAsReadForAuthUser(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Post('me/notifications/read-all')
  markAllScheduleNotificationsAsRead(@Req() request: Request) {
    return this.schoolScheduleService.markAllNotificationsAsReadForAuthUser(
      this.getAuthUser(request)
    );
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
      appMetadata: authUser?.app_metadata ?? null,
      userMetadata: authUser?.user_metadata ?? null,
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
