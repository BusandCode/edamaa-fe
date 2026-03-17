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

  @Post('school-assignments')
  createSchoolAssignment(@Req() request: Request, @Body() body: Record<string, unknown>) {
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

  @Delete('school-assignments/:assignmentId')
  deleteSchoolAssignment(@Req() request: Request, @Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteSchoolAssignment(this.getAuthUser(request), assignmentId);
  }

  @Get('school-assignments/submissions')
  listSchoolAssignmentSubmissions(@Req() request: Request, @Query('assignmentId') assignmentId?: string) {
    return this.assignmentsService.listSchoolAssignmentSubmissions(this.getAuthUser(request), assignmentId || '');
  }

  @Post('school-assignments/grade')
  gradeSchoolAssignmentSubmission(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.gradeSchoolAssignmentSubmission(this.getAuthUser(request), body);
  }

  @Get('student-assignments')
  listStudentAssignments(@Req() request: Request, @Query() query: Record<string, string>) {
    return this.assignmentsService.listStudentAssignments(this.getAuthUser(request), query);
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
