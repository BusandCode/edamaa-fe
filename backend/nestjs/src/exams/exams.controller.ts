import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ExamsService } from './exams.service';

@UseGuards(SupabaseAuthGuard)
@Controller()
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('school-exams')
  listSchoolExams(@Req() request: Request) {
    return this.examsService.listSchoolExams(this.getAuthUser(request));
  }

  @Get('school-exams/grading-scheme')
  getSchoolGradingScheme(@Req() request: Request) {
    return this.examsService.getSchoolGradingSchemeForAuthUser(this.getAuthUser(request));
  }

  @Get('school-exams/question-banks')
  listSchoolQuestionBanks(@Req() request: Request) {
    return this.examsService.listSchoolQuestionBanks(this.getAuthUser(request));
  }

  @Get('school-exams/notifications')
  listSchoolExamNotifications(@Req() request: Request) {
    return this.examsService.listSchoolExamNotifications(this.getAuthUser(request));
  }

  @Post('school-exams/notifications/:notificationId/read')
  markSchoolExamNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.examsService.markSchoolExamNotificationAsRead(this.getAuthUser(request), notificationId);
  }

  @Post('school-exams/notifications/read-all')
  markAllSchoolExamNotificationsAsRead(@Req() request: Request) {
    return this.examsService.markAllSchoolExamNotificationsAsRead(this.getAuthUser(request));
  }

  @Delete('school-exams/notifications/:notificationId')
  archiveSchoolExamNotification(@Req() request: Request, @Param('notificationId') notificationId: string) {
    return this.examsService.archiveSchoolExamNotification(this.getAuthUser(request), notificationId);
  }

  @Post('school-exams')
  createSchoolExam(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.createSchoolExam(this.getAuthUser(request), body);
  }

  @Post('school-exams/question-banks')
  createSchoolQuestionBank(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.createSchoolQuestionBank(this.getAuthUser(request), body);
  }

  @Patch('school-exams/question-banks/:questionBankId')
  updateSchoolQuestionBank(
    @Req() request: Request,
    @Param('questionBankId') questionBankId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.examsService.updateSchoolQuestionBank(this.getAuthUser(request), questionBankId, body);
  }

  @Delete('school-exams/question-banks/:questionBankId')
  deleteSchoolQuestionBank(@Req() request: Request, @Param('questionBankId') questionBankId: string) {
    return this.examsService.deleteSchoolQuestionBank(this.getAuthUser(request), questionBankId);
  }

  @Post('school-exams/grading-scheme')
  updateSchoolGradingScheme(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.updateSchoolGradingSchemeForAuthUser(this.getAuthUser(request), body);
  }

  @Get('school-exams/submissions')
  listExamSubmissions(@Req() request: Request, @Query('examId') examId?: string) {
    return this.examsService.listExamSubmissions(this.getAuthUser(request), examId || '');
  }

  @Get('school-exams/trends')
  getSchoolExamTrends(
    @Req() request: Request,
    @Query('examId') examId?: string,
    @Query('limit') limit?: string
  ) {
    return this.examsService.getSchoolExamTrends(this.getAuthUser(request), examId || '', limit);
  }

  @Post('school-exams/grade')
  gradeExamSubmission(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.gradeExamSubmission(this.getAuthUser(request), body);
  }

  @Post('school-exams/publish')
  publishExamResults(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.publishExamResults(this.getAuthUser(request), body);
  }

  @Get('student-exams')
  listStudentExams(@Req() request: Request, @Query() query: Record<string, string>) {
    return this.examsService.listStudentExams(this.getAuthUser(request), query);
  }

  @Get('student-exams/notifications')
  listStudentExamNotifications(@Req() request: Request) {
    return this.examsService.listStudentExamNotifications(this.getAuthUser(request));
  }

  @Post('student-exams/notifications/:notificationId/read')
  markStudentExamNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.examsService.markStudentExamNotificationAsRead(this.getAuthUser(request), notificationId);
  }

  @Post('student-exams/notifications/read-all')
  markAllStudentExamNotificationsAsRead(@Req() request: Request) {
    return this.examsService.markAllStudentExamNotificationsAsRead(this.getAuthUser(request));
  }

  @Delete('student-exams/notifications/:notificationId')
  archiveStudentExamNotification(@Req() request: Request, @Param('notificationId') notificationId: string) {
    return this.examsService.archiveStudentExamNotification(this.getAuthUser(request), notificationId);
  }

  @Post('student-exams/attempt/start')
  startStudentExamAttempt(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.startStudentExamAttempt(this.getAuthUser(request), body);
  }

  @Post('student-exams/attempt/save')
  saveStudentExamAttempt(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.saveStudentExamAttempt(this.getAuthUser(request), body);
  }

  @Post('student-exams/submit')
  submitStudentExam(@Req() request: Request, @Body() body: Record<string, unknown>) {
    return this.examsService.submitStudentExam(this.getAuthUser(request), body);
  }

  @Get('student-exams/result')
  getStudentExamResult(@Req() request: Request, @Query() query: Record<string, string>) {
    return this.examsService.getStudentExamResult(this.getAuthUser(request), query);
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
