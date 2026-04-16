import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AssignmentsService } from './assignments.service';

@UseGuards(SupabaseAuthGuard)
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('school-assignments')
  listSchoolAssignments(@Req() request: Request) {
    return this.assignmentsService.listSchoolAssignments(this.getAuthUser(request));
  }

  @Get('tutor-assignments')
  listTutorAssignments(@Req() request: Request) {
    return this.assignmentsService.listSchoolAssignments(this.getAuthUser(request));
  }

  @Post('school-assignments')
  createSchoolAssignment(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.createSchoolAssignment(this.getAuthUser(request), body);
  }

  @Post('tutor-assignments')
  createTutorAssignment(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.createSchoolAssignment(this.getAuthUser(request), body);
  }

  @Patch('school-assignments/:assignmentId')
  updateSchoolAssignment(
    @Req() request: Request,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.assignmentsService.updateSchoolAssignment(this.getAuthUser(request), assignmentId, body);
  }

  @Patch('tutor-assignments/:assignmentId')
  updateTutorAssignment(
    @Req() request: Request,
    @Param('assignmentId') assignmentId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.assignmentsService.updateSchoolAssignment(this.getAuthUser(request), assignmentId, body);
  }

  @Delete('school-assignments/:assignmentId')
  deleteSchoolAssignment(@Req() request: Request, @Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteSchoolAssignment(this.getAuthUser(request), assignmentId);
  }

  @Delete('tutor-assignments/:assignmentId')
  deleteTutorAssignment(@Req() request: Request, @Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteSchoolAssignment(this.getAuthUser(request), assignmentId);
  }

  @Get('school-assignments/submissions')
  listSchoolAssignmentSubmissions(@Req() request: Request, @Query('assignmentId') assignmentId?: string) {
    return this.assignmentsService.listSchoolAssignmentSubmissions(this.getAuthUser(request), assignmentId || '');
  }

  @Get('tutor-assignments/submissions')
  listTutorAssignmentSubmissions(@Req() request: Request, @Query('assignmentId') assignmentId?: string) {
    return this.assignmentsService.listSchoolAssignmentSubmissions(this.getAuthUser(request), assignmentId || '');
  }

  @Post('school-assignments/grade')
  gradeSchoolAssignmentSubmission(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.gradeSchoolAssignmentSubmission(this.getAuthUser(request), body);
  }

  @Post('tutor-assignments/grade')
  gradeTutorAssignmentSubmission(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.gradeSchoolAssignmentSubmission(this.getAuthUser(request), body);
  }

  @Get('school-assignments/notifications')
  listSchoolAssignmentNotifications(@Req() request: Request) {
    return this.assignmentsService.listSchoolAssignmentNotifications(this.getAuthUser(request));
  }

  @Get('tutor-assignments/notifications')
  listTutorAssignmentNotifications(@Req() request: Request) {
    return this.assignmentsService.listSchoolAssignmentNotifications(this.getAuthUser(request));
  }

  @Post('school-assignments/notifications/:notificationId/read')
  markSchoolAssignmentNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.assignmentsService.markSchoolAssignmentNotificationAsRead(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Post('tutor-assignments/notifications/:notificationId/read')
  markTutorAssignmentNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.assignmentsService.markSchoolAssignmentNotificationAsRead(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Post('school-assignments/notifications/read-all')
  markAllSchoolAssignmentNotificationsAsRead(@Req() request: Request) {
    return this.assignmentsService.markAllSchoolAssignmentNotificationsAsRead(this.getAuthUser(request));
  }

  @Post('tutor-assignments/notifications/read-all')
  markAllTutorAssignmentNotificationsAsRead(@Req() request: Request) {
    return this.assignmentsService.markAllSchoolAssignmentNotificationsAsRead(this.getAuthUser(request));
  }

  @Delete('school-assignments/notifications/:notificationId')
  archiveSchoolAssignmentNotification(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.assignmentsService.archiveSchoolAssignmentNotification(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Delete('tutor-assignments/notifications/:notificationId')
  archiveTutorAssignmentNotification(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.assignmentsService.archiveSchoolAssignmentNotification(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Get('student-assignments')
  listStudentAssignments(@Req() request: Request, @Query() query: Record<string, string>) {
    return this.assignmentsService.listStudentAssignments(this.getAuthUser(request), query);
  }

  @Get('student-assignments/notifications')
  listStudentAssignmentNotifications(@Req() request: Request, @Query() query: Record<string, string>) {
    return this.assignmentsService.listStudentAssignmentNotifications(this.getAuthUser(request), query);
  }

  @Post('student-assignments/notifications/:notificationId/read')
  markStudentAssignmentNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.assignmentsService.markStudentAssignmentNotificationAsRead(
      this.getAuthUser(request),
      notificationId,
      body
    );
  }

  @Post('student-assignments/notifications/read-all')
  markAllStudentAssignmentNotificationsAsRead(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.markAllStudentAssignmentNotificationsAsRead(
      this.getAuthUser(request),
      body
    );
  }

  @Delete('student-assignments/notifications/:notificationId')
  archiveStudentAssignmentNotification(
    @Req() request: Request,
    @Param('notificationId') notificationId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.assignmentsService.archiveStudentAssignmentNotification(
      this.getAuthUser(request),
      notificationId,
      body
    );
  }

  @Post('student-assignments/submit')
  submitStudentAssignment(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.submitStudentAssignment(this.getAuthUser(request), body);
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
