import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  appMetadata?: Record<string, unknown> | null;
  userMetadata?: Record<string, unknown> | null;
};

type AssignmentType = 'assignment' | 'classwork';
type DeliveryMode = 'virtual' | 'offline';
type ReleaseMode = 'immediate' | 'scheduled' | 'on_class_end';

type AssignmentQuestion = {
  id: string;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  correctOptionId: string;
};

type AssignmentRecord = {
  id: string;
  schoolUserId: string;
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  description: string;
  content: string;
  checklist: string[];
  type: AssignmentType;
  deliveryMode: DeliveryMode;
  releaseMode: ReleaseMode;
  releaseAt: string | null;
  dueAt: string;
  points: number;
  attachments: number;
  questions: AssignmentQuestion[];
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubmissionFile = {
  name: string;
  sizeBytes: number;
  mimeType: string;
};

type QuestionResult = {
  questionId: string;
  prompt: string;
  selectedOptionId?: string | null;
  selectedOptionLabel?: string;
  correctOptionId: string;
  correctOptionLabel: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
};

type AssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
  submissionNote?: string | null;
  submissionFiles?: SubmissionFile[];
  answers?: { questionId: string; optionId: string }[];
  score?: number | null;
  maxScore: number;
  feedback?: string | null;
  gradedAt?: string | null;
  lateSubmission: boolean;
  questionResults?: QuestionResult[];
};

type SchoolAssignmentNotificationRead = {
  schoolUserId: string;
  notificationId: string;
  readAt: string;
};

type SchoolAssignmentNotificationArchive = {
  schoolUserId: string;
  notificationId: string;
  archivedAt: string;
};

type StudentAssignmentNotificationRead = {
  studentId: string;
  notificationId: string;
  readAt: string;
};

type StudentAssignmentNotificationArchive = {
  studentId: string;
  notificationId: string;
  archivedAt: string;
};

type AssignmentsState = {
  assignments: AssignmentRecord[];
  submissions: AssignmentSubmission[];
  schoolNotificationReads: SchoolAssignmentNotificationRead[];
  schoolNotificationArchives: SchoolAssignmentNotificationArchive[];
  studentNotificationReads: StudentAssignmentNotificationRead[];
  studentNotificationArchives: StudentAssignmentNotificationArchive[];
};

type FallbackScheduleSessionRecord = {
  publicId: string;
  startAt: string | Date;
  endAt: string | Date;
};

@Injectable()
export class AssignmentsService {
  private readonly storagePath = '/tmp/edamaa-assignments.json';
  private readonly fallbackSchedulePath = '/tmp/edamaa-fallback-schedule.json';

  constructor(private readonly prisma: PrismaService) {}

  async listSchoolAssignments(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const assignments = await Promise.all(
      state.assignments
        .filter((assignment) => assignment.schoolUserId === schoolUserId)
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .map((assignment) => this.buildSchoolAssignmentResponse(assignment, state.submissions))
    );

    return {
      assignments,
      summary: {
        total: assignments.length,
        active: assignments.filter((assignment) => assignment.isReleased).length,
        awaitingReview: assignments.reduce(
          (count, assignment) => count + Math.max(0, assignment.submissionsCount - assignment.gradedCount),
          0
        ),
      },
    };
  }

  async createSchoolAssignment(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const assignment = this.normalizeAssignmentInput(input);
    const now = new Date().toISOString();

    const created: AssignmentRecord = {
      id: `ASG-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId,
      ...assignment,
      createdAt: now,
      updatedAt: now,
    };

    state.assignments.unshift(created);
    this.saveState(state);

    return {
      message: 'Assignment created.',
      assignment: await this.buildSchoolAssignmentResponse(created, state.submissions),
      assignments: (await this.listSchoolAssignments(authUser)).assignments,
    };
  }

  async updateSchoolAssignment(authUser: AuthUserContext, assignmentId: string, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedAssignmentId = this.normalizeRequiredText(assignmentId, 'Assignment ID');
    const state = this.loadState();
    const index = state.assignments.findIndex(
      (assignment) => assignment.id === normalizedAssignmentId && assignment.schoolUserId === schoolUserId
    );

    if (index === -1) {
      throw new NotFoundException('Assignment was not found for this school.');
    }

    const existing = state.assignments[index];
    const updated: AssignmentRecord = {
      ...existing,
      ...this.normalizeAssignmentInput(input),
      updatedAt: new Date().toISOString(),
    };

    state.assignments[index] = updated;
    this.saveState(state);

    return {
      message: 'Assignment updated.',
      assignment: await this.buildSchoolAssignmentResponse(updated, state.submissions),
      assignments: (await this.listSchoolAssignments(authUser)).assignments,
    };
  }

  async deleteSchoolAssignment(authUser: AuthUserContext, assignmentId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedAssignmentId = this.normalizeRequiredText(assignmentId, 'Assignment ID');
    const state = this.loadState();
    const target = state.assignments.find(
      (assignment) => assignment.id === normalizedAssignmentId && assignment.schoolUserId === schoolUserId
    );

    if (!target) {
      throw new NotFoundException('Assignment was not found for this school.');
    }

    state.assignments = state.assignments.filter((assignment) => assignment.id !== normalizedAssignmentId);
    state.submissions = state.submissions.filter((submission) => submission.assignmentId !== normalizedAssignmentId);
    this.saveState(state);

    return {
      message: 'Assignment deleted.',
      assignments: (await this.listSchoolAssignments(authUser)).assignments,
    };
  }

  async listSchoolAssignmentSubmissions(authUser: AuthUserContext, assignmentId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedAssignmentId = this.normalizeRequiredText(assignmentId, 'Assignment ID');
    const state = this.loadState();
    const assignment = state.assignments.find(
      (item) => item.id === normalizedAssignmentId && item.schoolUserId === schoolUserId
    );

    if (!assignment) {
      throw new NotFoundException('Assignment was not found for this school.');
    }

    const submissions = state.submissions
      .filter((submission) => submission.assignmentId === normalizedAssignmentId)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());

    return {
      assignment: await this.buildSchoolAssignmentResponse(assignment, state.submissions),
      submissions,
    };
  }

  gradeSchoolAssignmentSubmission(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const submissionId = this.normalizeRequiredText(input.submissionId, 'Submission ID');
    const state = this.loadState();
    const submissionIndex = state.submissions.findIndex((submission) => submission.id === submissionId);

    if (submissionIndex === -1) {
      throw new NotFoundException('Submission was not found.');
    }

    const submission = state.submissions[submissionIndex];
    const assignment = state.assignments.find((item) => item.id === submission.assignmentId);
    if (!assignment || assignment.schoolUserId !== schoolUserId) {
      throw new ForbiddenException('This submission does not belong to your school.');
    }

    const score = this.normalizeNumber(input.score, 'Score');
    const feedback = this.normalizeOptionalText(input.feedback);
    const cappedScore = Math.max(0, Math.min(score, submission.maxScore || assignment.points));

    state.submissions[submissionIndex] = {
      ...submission,
      score: cappedScore,
      feedback,
      status: 'graded',
      gradedAt: new Date().toISOString(),
    };

    this.saveState(state);
    return {
      message: 'Submission graded.',
      submission: state.submissions[submissionIndex],
    };
  }

  listSchoolAssignmentNotifications(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const readIds = this.getSchoolAssignmentNotificationReadIds(state, schoolUserId);
    const archivedIds = this.getSchoolAssignmentNotificationArchiveIds(state, schoolUserId);

    const notifications = state.submissions
      .map((submission) => {
        const assignment = state.assignments.find((item) => item.id === submission.assignmentId);
        if (!assignment || assignment.schoolUserId !== schoolUserId) {
          return null;
        }

        const notificationId = this.buildSchoolAssignmentNotificationId(submission.id);
        if (archivedIds.has(notificationId)) {
          return null;
        }

        const needsReview = assignment.type === 'assignment' && submission.status !== 'graded';
        const isLate = submission.lateSubmission;
        const title = needsReview
          ? `${submission.studentName} submitted ${assignment.title}`
          : `${submission.studentName} completed ${assignment.title}`;
        const message = needsReview
          ? `${submission.studentName} turned in ${assignment.subject} homework for ${assignment.classGroup}. Review and grade it${isLate ? ' (late submission).' : '.'}`
          : `${submission.studentName} submitted ${assignment.subject} ${assignment.type === 'classwork' ? 'classwork' : 'task'}${typeof submission.score === 'number' ? ` and scored ${submission.score}/${submission.maxScore}` : ''}${isLate ? ' after the due time.' : '.'}`;

        return {
          id: notificationId,
          assignmentId: assignment.id,
          submissionId: submission.id,
          title,
          message,
          createdAt: submission.submittedAt,
          isRead: readIds.has(notificationId),
          needsReview,
          isLate,
          studentName: submission.studentName,
        };
      })
      .filter((notification): notification is NonNullable<typeof notification> => Boolean(notification))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12);

    return {
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      notifications,
    };
  }

  markSchoolAssignmentNotificationAsRead(authUser: AuthUserContext, notificationId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = this.listSchoolAssignmentNotifications(authUser);
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this school.');
    }

    const state = this.loadState();
    const alreadyRead = state.schoolNotificationReads.some(
      (entry) => entry.schoolUserId === schoolUserId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyRead) {
      state.schoolNotificationReads.unshift({
        schoolUserId,
        notificationId: normalizedNotificationId,
        readAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = this.listSchoolAssignmentNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
    };
  }

  markAllSchoolAssignmentNotificationsAsRead(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const payload = this.listSchoolAssignmentNotifications(authUser);
    const readIds = this.getSchoolAssignmentNotificationReadIds(state, schoolUserId);
    let updated = 0;

    payload.notifications.forEach((notification) => {
      if (readIds.has(notification.id)) {
        return;
      }

      state.schoolNotificationReads.unshift({
        schoolUserId,
        notificationId: notification.id,
        readAt: new Date().toISOString(),
      });
      updated += 1;
    });

    if (updated > 0) {
      this.saveState(state);
    }

    return {
      updated,
      unreadCount: 0,
    };
  }

  archiveSchoolAssignmentNotification(authUser: AuthUserContext, notificationId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = this.listSchoolAssignmentNotifications(authUser);
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this school.');
    }

    const state = this.loadState();
    const alreadyArchived = state.schoolNotificationArchives.some(
      (entry) => entry.schoolUserId === schoolUserId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyArchived) {
      state.schoolNotificationArchives.unshift({
        schoolUserId,
        notificationId: normalizedNotificationId,
        archivedAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = this.listSchoolAssignmentNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
      archived: true as const,
    };
  }

  async listStudentAssignmentNotifications(authUser: AuthUserContext, query: Record<string, string>) {
    this.assertStudentRole(authUser);
    const department = this.normalizeRequiredText(query.department, 'Department');
    const classGroup = this.normalizeRequiredText(query.classGroup, 'Class');
    const studentId = this.resolveStudentId(authUser, query.studentId);
    const state = this.loadState();
    const readIds = this.getStudentAssignmentNotificationReadIds(state, studentId);
    const archivedIds = this.getStudentAssignmentNotificationArchiveIds(state, studentId);

    const releaseNotifications = await Promise.all(
      state.assignments
        .filter((assignment) => assignment.department === department && assignment.classGroup === classGroup)
        .map(async (assignment) => {
          const released = await this.resolveAssignmentReleased(assignment);
          if (!released) {
            return null;
          }

          const notificationId = this.buildStudentAssignmentReleaseNotificationId(assignment.id);
          if (archivedIds.has(notificationId)) {
            return null;
          }

          return {
            id: notificationId,
            kind: 'released' as const,
            assignmentId: assignment.id,
            title: `${assignment.type === 'assignment' ? 'New homework' : 'New classwork'}: ${assignment.title}`,
            message: `${assignment.subject} task for ${assignment.classGroup} is now open. Due ${new Date(assignment.dueAt).toLocaleString()}.`,
            createdAt: await this.resolveAssignmentNotificationCreatedAt(assignment),
            isRead: readIds.has(notificationId),
            department: assignment.department,
            classGroup: assignment.classGroup,
            sessionId: assignment.sessionId,
          };
        })
    );

    const gradedNotifications = state.submissions
      .filter((submission) => submission.studentId === studentId && submission.status === 'graded')
      .map((submission) => {
        const assignment = state.assignments.find((item) => item.id === submission.assignmentId);
        if (!assignment || assignment.department !== department || assignment.classGroup !== classGroup) {
          return null;
        }

        const notificationId = this.buildStudentAssignmentGradeNotificationId(submission.id);
        if (archivedIds.has(notificationId)) {
          return null;
        }

        return {
          id: notificationId,
          kind: 'graded' as const,
          assignmentId: assignment.id,
          title: `${assignment.title} has been scored`,
          message:
            typeof submission.score === 'number'
              ? `Your ${assignment.subject} ${assignment.type === 'classwork' ? 'classwork' : 'homework'} is ready. Score: ${submission.score}/${submission.maxScore}.`
              : `Your ${assignment.subject} ${assignment.type === 'classwork' ? 'classwork' : 'homework'} has been reviewed.`,
          createdAt: submission.gradedAt || submission.submittedAt,
          isRead: readIds.has(notificationId),
          department: assignment.department,
          classGroup: assignment.classGroup,
          sessionId: assignment.sessionId,
        };
      })
      .filter((notification): notification is NonNullable<typeof notification> => Boolean(notification));

    const notifications = [
      ...releaseNotifications.filter(
        (notification): notification is NonNullable<typeof notification> => Boolean(notification)
      ),
      ...gradedNotifications,
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12);

    return {
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      notifications,
    };
  }

  async markStudentAssignmentNotificationAsRead(authUser: AuthUserContext, notificationId: string, body: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser, body.studentId);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = await this.listStudentAssignmentNotifications(authUser, this.normalizeStudentNotificationQuery(body));
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this student.');
    }

    const state = this.loadState();
    const alreadyRead = state.studentNotificationReads.some(
      (entry) => entry.studentId === studentId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyRead) {
      state.studentNotificationReads.unshift({
        studentId,
        notificationId: normalizedNotificationId,
        readAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = await this.listStudentAssignmentNotifications(authUser, this.normalizeStudentNotificationQuery(body));
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
    };
  }

  async markAllStudentAssignmentNotificationsAsRead(authUser: AuthUserContext, body: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser, body.studentId);
    const state = this.loadState();
    const payload = await this.listStudentAssignmentNotifications(authUser, this.normalizeStudentNotificationQuery(body));
    const readIds = this.getStudentAssignmentNotificationReadIds(state, studentId);
    let updated = 0;

    payload.notifications.forEach((notification) => {
      if (readIds.has(notification.id)) {
        return;
      }

      state.studentNotificationReads.unshift({
        studentId,
        notificationId: notification.id,
        readAt: new Date().toISOString(),
      });
      updated += 1;
    });

    if (updated > 0) {
      this.saveState(state);
    }

    return {
      updated,
      unreadCount: 0,
    };
  }

  async archiveStudentAssignmentNotification(authUser: AuthUserContext, notificationId: string, body: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser, body.studentId);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = await this.listStudentAssignmentNotifications(authUser, this.normalizeStudentNotificationQuery(body));
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this student.');
    }

    const state = this.loadState();
    const alreadyArchived = state.studentNotificationArchives.some(
      (entry) => entry.studentId === studentId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyArchived) {
      state.studentNotificationArchives.unshift({
        studentId,
        notificationId: normalizedNotificationId,
        archivedAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = await this.listStudentAssignmentNotifications(authUser, this.normalizeStudentNotificationQuery(body));
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
      archived: true as const,
    };
  }

  async listStudentAssignments(authUser: AuthUserContext, query: Record<string, string>) {
    this.assertStudentRole(authUser);
    const department = this.normalizeRequiredText(query.department, 'Department');
    const classGroup = this.normalizeRequiredText(query.classGroup, 'Class');
    const studentId = this.resolveStudentId(authUser, query.studentId);
    const state = this.loadState();

    const assignments = await Promise.all(
      state.assignments
        .filter((assignment) => assignment.department === department && assignment.classGroup === classGroup)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map(async (assignment) => ({
          ...assignment,
          isReleased: await this.resolveAssignmentReleased(assignment),
          linkedSessionStatus: assignment.sessionId ? await this.lookupSessionStatus(assignment.sessionId) : null,
        }))
    );

    const submissions = state.submissions.filter((submission) => submission.studentId === studentId);

    return {
      assignments,
      submissions,
    };
  }

  async submitStudentAssignment(authUser: AuthUserContext, input: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const assignmentId = this.normalizeRequiredText(input.assignmentId, 'Assignment ID');
    const studentId = this.resolveStudentId(authUser, input.studentId);
    const studentName = this.resolveStudentName(authUser, input.studentName);
    const state = this.loadState();
    const assignment = state.assignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment was not found.');
    }

    if (!(await this.resolveAssignmentReleased(assignment))) {
      throw new ForbiddenException('This task is not open yet.');
    }

    const existing = state.submissions.find(
      (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
    );
    if (existing) {
      throw new BadRequestException('You have already submitted this task.');
    }

    const submittedAt = new Date().toISOString();
    const lateSubmission = Date.now() > new Date(assignment.dueAt).getTime();

    const submission: AssignmentSubmission = {
      id: `SUB-${randomBytes(4).toString('hex').toUpperCase()}`,
      assignmentId,
      studentId,
      studentName,
      submittedAt,
      status: 'submitted',
      maxScore: this.computeAssignmentMaxScore(assignment),
      lateSubmission,
    };

    if (assignment.type === 'classwork') {
      const answers = this.normalizeClassworkAnswers(input.answers, assignment);
      const questionResults = assignment.questions.map((question) => {
        const selectedOptionId = answers.find((answer) => answer.questionId === question.id)?.optionId || null;
        const selectedOptionLabel =
          question.options.find((option) => option.id === selectedOptionId)?.text || '';
        const correctOption = question.options.find((option) => option.id === question.correctOptionId);
        const isCorrect = selectedOptionId === question.correctOptionId;

        return {
          questionId: question.id,
          prompt: question.prompt,
          selectedOptionId,
          selectedOptionLabel,
          correctOptionId: question.correctOptionId,
          correctOptionLabel: correctOption?.text || '',
          isCorrect,
          earnedPoints: isCorrect ? question.points : 0,
          maxPoints: question.points,
        } satisfies QuestionResult;
      });

      const score = questionResults.reduce((total, result) => total + result.earnedPoints, 0);
      submission.answers = answers;
      submission.questionResults = questionResults;
      submission.score = score;
      submission.feedback = this.buildClassworkFeedback(score, submission.maxScore);
      submission.status = 'graded';
      submission.gradedAt = submittedAt;
    } else {
      const submissionNote = this.normalizeOptionalText(input.submissionNote);
      const submissionFiles = this.normalizeSubmissionFiles(input.submissionFiles);
      if (!submissionNote && submissionFiles.length === 0) {
        throw new BadRequestException('Add a short note or upload at least one file before you submit.');
      }
      submission.submissionNote = submissionNote;
      submission.submissionFiles = submissionFiles;
      submission.feedback = lateSubmission
        ? 'Submitted late. Your teacher will still review it.'
        : 'Submission received. Your teacher will review it shortly.';
    }

    state.submissions.unshift(submission);
    this.saveState(state);

    return {
      submission,
      autoGradeResult:
        assignment.type === 'classwork'
          ? {
              assignmentId: assignment.id,
              title: assignment.title,
              score: submission.score || 0,
              maxScore: submission.maxScore,
              percentage:
                submission.maxScore > 0 ? Math.round(((submission.score || 0) / submission.maxScore) * 100) : 0,
              feedback: submission.feedback || '',
              questionResults: submission.questionResults || [],
              submittedAtIso: submittedAt,
            }
          : null,
    };
  }

  private loadState(): AssignmentsState {
    if (!existsSync(this.storagePath)) {
      return {
        assignments: [],
        submissions: [],
        schoolNotificationReads: [],
        schoolNotificationArchives: [],
        studentNotificationReads: [],
        studentNotificationArchives: [],
      };
    }

    try {
      const raw = readFileSync(this.storagePath, 'utf-8');
      const parsed = JSON.parse(raw) as AssignmentsState;
      return {
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        schoolNotificationReads: Array.isArray(parsed.schoolNotificationReads) ? parsed.schoolNotificationReads : [],
        schoolNotificationArchives: Array.isArray(parsed.schoolNotificationArchives) ? parsed.schoolNotificationArchives : [],
        studentNotificationReads: Array.isArray(parsed.studentNotificationReads) ? parsed.studentNotificationReads : [],
        studentNotificationArchives: Array.isArray(parsed.studentNotificationArchives) ? parsed.studentNotificationArchives : [],
      };
    } catch {
      return {
        assignments: [],
        submissions: [],
        schoolNotificationReads: [],
        schoolNotificationArchives: [],
        studentNotificationReads: [],
        studentNotificationArchives: [],
      };
    }
  }

  private saveState(state: AssignmentsState) {
    writeFileSync(this.storagePath, JSON.stringify(state, null, 2));
  }

  private resolveSchoolUserId(authUser: AuthUserContext) {
    const role = this.normalizeRole(authUser.role);
    if (!this.isSchoolManagerRole(role)) {
      throw new ForbiddenException('Only school or admin accounts can manage homework.');
    }
    const identifier = authUser.id || authUser.email;
    if (!identifier) {
      throw new ForbiddenException('School account identity could not be verified.');
    }
    return identifier;
  }

  private assertStudentRole(authUser: AuthUserContext) {
    const role = this.normalizeRole(authUser.role);
    if (role && role !== 'student' && role !== 'admin') {
      throw new ForbiddenException('Only student accounts can access assignments.');
    }
  }

  private normalizeRole(role: string | null | undefined) {
    return String(role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }

  private isSchoolManagerRole(role: string) {
    return role === 'school' || role === 'admin' || role === 'school-admin' || role === 'school-owner';
  }

  private resolveStudentId(authUser: AuthUserContext, input?: unknown) {
    const fallback = typeof input === 'string' ? input.trim() : String(input || '').trim();
    return authUser.id || authUser.email || fallback || `student-${randomBytes(4).toString('hex')}`;
  }

  private resolveStudentName(authUser: AuthUserContext, input?: unknown) {
    const fallback = typeof input === 'string' ? input.trim() : '';
    return authUser.name || fallback || 'Student';
  }

  private normalizeStudentNotificationQuery(input: Record<string, unknown>) {
    return {
      department: this.normalizeRequiredText(input.department, 'Department'),
      classGroup: this.normalizeRequiredText(input.classGroup, 'Class'),
      studentId: typeof input.studentId === 'string' || typeof input.studentId === 'number' ? String(input.studentId) : '',
    };
  }

  private buildSchoolAssignmentNotificationId(submissionId: string) {
    return `school-submission:${submissionId}`;
  }

  private buildStudentAssignmentReleaseNotificationId(assignmentId: string) {
    return `student-release:${assignmentId}`;
  }

  private buildStudentAssignmentGradeNotificationId(submissionId: string) {
    return `student-graded:${submissionId}`;
  }

  private getSchoolAssignmentNotificationReadIds(state: AssignmentsState, schoolUserId: string) {
    return new Set(
      state.schoolNotificationReads
        .filter((entry) => entry.schoolUserId === schoolUserId)
        .map((entry) => entry.notificationId)
    );
  }

  private getSchoolAssignmentNotificationArchiveIds(state: AssignmentsState, schoolUserId: string) {
    return new Set(
      state.schoolNotificationArchives
        .filter((entry) => entry.schoolUserId === schoolUserId)
        .map((entry) => entry.notificationId)
    );
  }

  private getStudentAssignmentNotificationReadIds(state: AssignmentsState, studentId: string) {
    return new Set(
      state.studentNotificationReads
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => entry.notificationId)
    );
  }

  private getStudentAssignmentNotificationArchiveIds(state: AssignmentsState, studentId: string) {
    return new Set(
      state.studentNotificationArchives
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => entry.notificationId)
    );
  }

  private normalizeRequiredText(value: unknown, label: string) {
    const text = String(value || '').trim();
    if (!text) {
      throw new BadRequestException(`${label} is required.`);
    }
    return text;
  }

  private normalizeOptionalText(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized || null;
  }

  private normalizeNumber(value: unknown, label: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${label} must be a number.`);
    }
    return parsed;
  }

  private parseRequiredDate(value: unknown, label: string) {
    const raw = this.normalizeRequiredText(value, label);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is not a valid date.`);
    }
    return parsed.toISOString();
  }

  private normalizeChecklist(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => Boolean(item));
  }

  private normalizeQuestions(value: unknown, type: AssignmentType) {
    if (type !== 'classwork') {
      return [] as AssignmentQuestion[];
    }

    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Add at least one classwork question.');
    }

    return value.map((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException(`Question ${index + 1} is invalid.`);
      }
      const question = raw as Record<string, unknown>;
      const prompt = this.normalizeRequiredText(question.prompt, `Question ${index + 1} prompt`);
      const points = this.normalizeNumber(question.points, `Question ${index + 1} points`);
      if (points <= 0) {
        throw new BadRequestException(`Question ${index + 1} points must be greater than 0.`);
      }
      const options = Array.isArray(question.options) ? question.options : [];
      const normalizedOptions = options.map((option, optionIndex) => {
        const optionValue = option as Record<string, unknown>;
        return {
          id: String(optionValue.id || `opt-${optionIndex + 1}`),
          text: this.normalizeRequiredText(optionValue.text, `Question ${index + 1} option ${optionIndex + 1}`),
        };
      });
      if (normalizedOptions.length < 2) {
        throw new BadRequestException(`Question ${index + 1} needs at least 2 options.`);
      }
      const correctOptionId = this.normalizeRequiredText(question.correctOptionId, `Question ${index + 1} correct option`);
      if (!normalizedOptions.some((option) => option.id === correctOptionId)) {
        throw new BadRequestException(`Question ${index + 1} has an invalid correct option.`);
      }
      return {
        id: String(question.id || `q-${randomBytes(3).toString('hex')}`),
        prompt,
        points,
        options: normalizedOptions,
        correctOptionId,
      } satisfies AssignmentQuestion;
    });
  }

  private normalizeAssignmentInput(input: Record<string, unknown>) {
    const type = input.type === 'classwork' ? 'classwork' : 'assignment';
    const deliveryMode = input.deliveryMode === 'offline' ? 'offline' : 'virtual';
    const releaseMode =
      input.releaseMode === 'scheduled' || input.releaseMode === 'on_class_end'
        ? (input.releaseMode as ReleaseMode)
        : 'immediate';
    const description = this.normalizeRequiredText(input.description, 'Short summary');
    const content = this.normalizeRequiredText(input.content, 'Task content');
    const points = Math.max(1, Math.min(500, Math.trunc(this.normalizeNumber(input.points, 'Points'))));
    const releaseAt = releaseMode === 'scheduled' ? this.parseRequiredDate(input.releaseAt, 'Release time') : null;
    const sessionId = releaseMode === 'on_class_end' ? this.normalizeRequiredText(input.sessionId, 'Linked class') : null;

    return {
      title: this.normalizeRequiredText(input.title, 'Title'),
      subject: this.normalizeRequiredText(input.subject, 'Subject'),
      department: this.normalizeRequiredText(input.department, 'Department'),
      classGroup: this.normalizeRequiredText(input.classGroup, 'Class'),
      description,
      content,
      checklist: this.normalizeChecklist(input.checklist),
      type,
      deliveryMode,
      releaseMode,
      releaseAt,
      dueAt: this.parseRequiredDate(input.dueAt, 'Due date'),
      points,
      attachments: Math.max(0, Math.trunc(Number(input.attachments) || 0)),
      questions: this.normalizeQuestions(input.questions, type),
      sessionId,
    } satisfies Omit<AssignmentRecord, 'id' | 'schoolUserId' | 'createdAt' | 'updatedAt'>;
  }

  private normalizeSubmissionFiles(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as SubmissionFile[];
    }
    return value
      .map((raw) => {
        if (!raw || typeof raw !== 'object') {
          return null;
        }
        const file = raw as Record<string, unknown>;
        const name = this.normalizeOptionalText(file.name);
        const sizeBytes = Number(file.sizeBytes);
        const mimeType = this.normalizeOptionalText(file.mimeType) || 'application/octet-stream';
        if (!name || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
          return null;
        }
        return {
          name,
          sizeBytes,
          mimeType,
        } satisfies SubmissionFile;
      })
      .filter((item): item is SubmissionFile => Boolean(item));
  }

  private normalizeClassworkAnswers(value: unknown, assignment: AssignmentRecord) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Answer every question before you submit.');
    }

    const questionMap = new Map(assignment.questions.map((question) => [question.id, question]));
    const normalized = value.map((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException(`Answer ${index + 1} is invalid.`);
      }
      const answer = raw as Record<string, unknown>;
      const questionId = this.normalizeRequiredText(answer.questionId, 'Answer question');
      const question = questionMap.get(questionId);
      if (!question) {
        throw new BadRequestException('One or more answers do not match this classwork.');
      }
      const optionId = this.normalizeRequiredText(answer.optionId, `Question ${question.prompt}`);
      if (!question.options.some((option) => option.id === optionId)) {
        throw new BadRequestException('One or more answers do not match this classwork.');
      }
      return { questionId, optionId };
    });

    if (normalized.length !== assignment.questions.length) {
      throw new BadRequestException('Answer every question before you submit.');
    }

    return normalized;
  }

  private computeAssignmentMaxScore(assignment: AssignmentRecord) {
    if (assignment.type === 'classwork') {
      return assignment.questions.reduce((total, question) => total + question.points, 0);
    }
    return assignment.points;
  }

  private buildClassworkFeedback(score: number, maxScore: number) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    if (percentage >= 85) {
      return 'Excellent work. You clearly understood this lesson.';
    }
    if (percentage >= 65) {
      return 'Nice progress. Revisit one or two ideas to improve your score.';
    }
    return 'Good attempt. Review the corrections and try a similar practice set.';
  }

  private async buildSchoolAssignmentResponse(
    assignment: AssignmentRecord,
    submissions: AssignmentSubmission[]
  ) {
    const assignmentSubmissions = submissions.filter((submission) => submission.assignmentId === assignment.id);
    const gradedCount = assignmentSubmissions.filter((submission) => submission.status === 'graded').length;
    return {
      ...assignment,
      submissionsCount: assignmentSubmissions.length,
      gradedCount,
      isReleased: await this.resolveAssignmentReleased(assignment),
      linkedSessionStatus: assignment.sessionId ? await this.lookupSessionStatus(assignment.sessionId) : null,
    };
  }

  private async resolveAssignmentReleased(assignment: AssignmentRecord) {
    if (assignment.releaseMode === 'immediate') {
      return true;
    }
    if (assignment.releaseMode === 'scheduled') {
      const releaseAtMs = new Date(assignment.releaseAt || '').getTime();
      return Number.isFinite(releaseAtMs) ? Date.now() >= releaseAtMs : false;
    }
    if (!assignment.sessionId) {
      return false;
    }
    return (await this.lookupSessionStatus(assignment.sessionId)) === 'completed';
  }

  private async resolveAssignmentNotificationCreatedAt(assignment: AssignmentRecord) {
    if (assignment.releaseMode === 'immediate') {
      return assignment.createdAt;
    }

    if (assignment.releaseMode === 'scheduled') {
      return assignment.releaseAt || assignment.createdAt;
    }

    if (!assignment.sessionId) {
      return assignment.updatedAt;
    }

    const timing = await this.lookupSessionTiming(assignment.sessionId);
    return timing?.endAt.toISOString() || assignment.updatedAt;
  }

  private async lookupSessionStatus(sessionPublicId: string): Promise<'upcoming' | 'live' | 'completed' | null> {
    const fromDb = await this.lookupSessionTiming(sessionPublicId);
    if (fromDb) {
      return this.resolveSessionStatus(fromDb.startAt, fromDb.endAt);
    }
    return null;
  }

  private async lookupSessionTiming(sessionPublicId: string) {
    const fromDb = await this.lookupSessionTimingFromDatabase(sessionPublicId);
    if (fromDb) {
      return fromDb;
    }

    if (!existsSync(this.fallbackSchedulePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.fallbackSchedulePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, FallbackScheduleSessionRecord[]>;
      const sessions = Object.values(parsed).flatMap((value) => (Array.isArray(value) ? value : []));
      const target = sessions.find((session) => session.publicId === sessionPublicId);
      if (!target) {
        return null;
      }
      return {
        startAt: new Date(target.startAt),
        endAt: new Date(target.endAt),
      };
    } catch {
      return null;
    }
  }

  private async lookupSessionTimingFromDatabase(sessionPublicId: string) {
    try {
      if (!this.prisma.schoolScheduleSession?.findFirst) {
        return null;
      }
      const session = await this.prisma.schoolScheduleSession.findFirst({
        where: {
          publicId: sessionPublicId,
        },
        select: {
          startAt: true,
          endAt: true,
        },
      });
      if (!session) {
        return null;
      }
      return {
        startAt: session.startAt,
        endAt: session.endAt,
      };
    } catch {
      return null;
    }
  }

  private resolveSessionStatus(startAt: Date, endAt: Date) {
    const now = Date.now();
    const startMs = startAt.getTime();
    const endMs = endAt.getTime();
    if (Number.isFinite(endMs) && now >= endMs) {
      return 'completed' as const;
    }
    if (Number.isFinite(startMs) && now >= startMs) {
      return 'live' as const;
    }
    return 'upcoming' as const;
  }
}
