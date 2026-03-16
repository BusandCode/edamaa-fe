import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

type AuthUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  appMetadata?: Record<string, unknown> | null;
  userMetadata?: Record<string, unknown> | null;
};

type ExamQuestion = {
  id: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: { id: string; text: string }[];
  correctOptionId?: string | null;
  maxPoints: number;
};

type ExamRecord = {
  id: string;
  schoolUserId: string;
  title: string;
  subject: string;
  department: string;
  classGroup: string;
  durationMinutes: number;
  startAt: string;
  createdAt: string;
  publishedAt?: string | null;
  gradingScheme: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  questions: ExamQuestion[];
};

type ExamQuestionBank = {
  id: string;
  schoolUserId: string;
  name: string;
  subject?: string | null;
  department?: string | null;
  classGroup?: string | null;
  questions: ExamQuestion[];
  createdAt: string;
  updatedAt: string;
};

type ExamNotification = {
  id: string;
  schoolUserId: string;
  examId: string;
  kind: 'results_published';
  title: string;
  message: string;
  createdAt: string;
};

type ExamNotificationRead = {
  schoolUserId: string;
  notificationId: string;
  readAt: string;
};

type ExamNotificationArchive = {
  schoolUserId: string;
  notificationId: string;
  archivedAt: string;
};

type StudentExamNotificationRead = {
  studentId: string;
  notificationId: string;
  readAt: string;
};

type StudentExamNotificationArchive = {
  studentId: string;
  notificationId: string;
  archivedAt: string;
};

type ExamSubmission = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; response: string; optionId?: string | null }[];
  questionReviews?: {
    questionId: string;
    awardedPoints: number;
    feedback?: string | null;
  }[];
  submittedAt: string;
  status: 'submitted' | 'graded' | 'published';
  score?: number;
  maxScore: number;
  feedback?: string | null;
  gradedAt?: string | null;
  publishedAt?: string | null;
};

type ExamAttempt = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; response: string; optionId?: string | null }[];
  activeQuestionIndex: number;
  startedAt: string;
  lastSavedAt: string;
  expiresAt: string;
  status: 'in_progress' | 'submitted' | 'expired';
  submittedAt?: string | null;
};

type ExamTrendSummary = {
  examId: string;
  title: string;
  startAt: string;
  status: 'draft' | 'published';
  submissionsCount: number;
  scoredCount: number;
  averagePercentage: number | null;
  isCurrent: boolean;
};

type ExamsState = {
  exams: ExamRecord[];
  questionBanks: ExamQuestionBank[];
  examNotifications: ExamNotification[];
  examNotificationReads: ExamNotificationRead[];
  examNotificationArchives: ExamNotificationArchive[];
  studentExamNotificationReads: StudentExamNotificationRead[];
  studentExamNotificationArchives: StudentExamNotificationArchive[];
  submissions: ExamSubmission[];
  attempts: ExamAttempt[];
  gradingSchemes?: Record<string, { primary: string; secondary: string; tertiary: string }>;
};

@Injectable()
export class ExamsService {
  private readonly storagePath = '/tmp/edamaa-exams.json';

  listSchoolExams(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    return {
      exams: state.exams.filter((exam) => exam.schoolUserId === schoolUserId),
      gradingScheme: this.getSchoolGradingScheme(state, schoolUserId),
    };
  }

  listSchoolQuestionBanks(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    return {
      questionBanks: state.questionBanks
        .filter((bank) => bank.schoolUserId === schoolUserId)
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .map((bank) => this.buildQuestionBankResponse(bank)),
    };
  }

  listSchoolExamNotifications(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const readIds = this.getExamNotificationReadIds(state, schoolUserId);
    const archivedIds = this.getExamNotificationArchiveIds(state, schoolUserId);
    const notifications = state.examNotifications
      .filter(
        (notification) =>
          notification.schoolUserId === schoolUserId && !archivedIds.has(notification.id)
      )
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 12)
      .map((notification) => this.buildExamNotificationResponse(notification, readIds.has(notification.id)));

    return {
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
      notifications,
    };
  }

  markSchoolExamNotificationAsRead(authUser: AuthUserContext, notificationId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const state = this.loadState();
    const target = state.examNotifications.find(
      (notification) =>
        notification.id === normalizedNotificationId && notification.schoolUserId === schoolUserId
    );

    if (!target) {
      throw new NotFoundException('Notification was not found for this school.');
    }

    const alreadyRead = state.examNotificationReads.some(
      (entry) =>
        entry.schoolUserId === schoolUserId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyRead) {
      state.examNotificationReads.unshift({
        schoolUserId,
        notificationId: normalizedNotificationId,
        readAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const notifications = this.listSchoolExamNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: notifications.unreadCount,
    };
  }

  archiveSchoolExamNotification(authUser: AuthUserContext, notificationId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = this.listSchoolExamNotifications(authUser);
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this school.');
    }

    const state = this.loadState();
    const alreadyArchived = state.examNotificationArchives.some(
      (entry) =>
        entry.schoolUserId === schoolUserId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyArchived) {
      state.examNotificationArchives.unshift({
        schoolUserId,
        notificationId: normalizedNotificationId,
        archivedAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = this.listSchoolExamNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
      archived: true as const,
    };
  }

  markAllSchoolExamNotificationsAsRead(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const readIds = this.getExamNotificationReadIds(state, schoolUserId);
    const payload = this.listSchoolExamNotifications(authUser);
    let updated = 0;

    payload.notifications.forEach((notification) => {
      if (readIds.has(notification.id)) {
        return;
      }

      state.examNotificationReads.unshift({
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

  createSchoolExam(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const title = this.normalizeRequiredText(input.title, 'Exam title');
    const subject = this.normalizeRequiredText(input.subject, 'Subject');
    const department = this.normalizeRequiredText(input.department, 'Department');
    const classGroup = this.normalizeRequiredText(input.classGroup, 'Class');
    const startAt = this.parseRequiredDate(input.startAt, 'Start time');
    const durationMinutes = this.resolveDurationMinutes(input.durationMinutes);
    const questions = this.normalizeQuestions(input.questions);
    const state = this.loadState();
    const defaultScheme = this.getSchoolGradingScheme(state, schoolUserId);
    const incomingScheme = this.normalizeGradingScheme(input.gradingScheme);
    const gradingScheme = incomingScheme ? { ...defaultScheme, ...incomingScheme } : defaultScheme;
    const exam: ExamRecord = {
      id: `EXAM-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId,
      title,
      subject,
      department,
      classGroup,
      durationMinutes,
      startAt: startAt.toISOString(),
      createdAt: new Date().toISOString(),
      publishedAt: null,
      gradingScheme,
      questions,
    };

    state.exams.unshift(exam);
    this.saveState(state);
    return { exam };
  }

  createSchoolQuestionBank(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const name = this.normalizeRequiredText(input.name, 'Question bank name');
    const questions = this.normalizeQuestions(input.questions);
    const now = new Date().toISOString();
    const questionBank: ExamQuestionBank = {
      id: `QBK-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId,
      name,
      subject: this.normalizeOptionalText(input.subject),
      department: this.normalizeOptionalText(input.department),
      classGroup: this.normalizeOptionalText(input.classGroup),
      questions,
      createdAt: now,
      updatedAt: now,
    };

    const state = this.loadState();
    state.questionBanks.unshift(questionBank);
    this.saveState(state);
    return { questionBank: this.buildQuestionBankResponse(questionBank) };
  }

  updateSchoolQuestionBank(
    authUser: AuthUserContext,
    questionBankId: string,
    input: Record<string, unknown>
  ) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedQuestionBankId = this.normalizeRequiredText(questionBankId, 'Question bank ID');
    const state = this.loadState();
    const questionBankIndex = state.questionBanks.findIndex(
      (bank) => bank.id === normalizedQuestionBankId && bank.schoolUserId === schoolUserId
    );

    if (questionBankIndex === -1) {
      throw new NotFoundException('Question bank was not found for this school.');
    }

    const existing = state.questionBanks[questionBankIndex];
    const nextName =
      Object.prototype.hasOwnProperty.call(input, 'name')
        ? this.normalizeRequiredText(input.name, 'Question bank name')
        : existing.name;
    const nextQuestions =
      Object.prototype.hasOwnProperty.call(input, 'questions') && input.questions !== undefined
        ? this.normalizeQuestions(input.questions)
        : existing.questions;

    state.questionBanks[questionBankIndex] = {
      ...existing,
      name: nextName,
      subject: this.resolveOptionalStoredValue(input, 'subject', existing.subject),
      department: this.resolveOptionalStoredValue(input, 'department', existing.department),
      classGroup: this.resolveOptionalStoredValue(input, 'classGroup', existing.classGroup),
      questions: nextQuestions,
      updatedAt: new Date().toISOString(),
    };

    this.saveState(state);
    return { questionBank: this.buildQuestionBankResponse(state.questionBanks[questionBankIndex]) };
  }

  deleteSchoolQuestionBank(authUser: AuthUserContext, questionBankId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedQuestionBankId = this.normalizeRequiredText(questionBankId, 'Question bank ID');
    const state = this.loadState();
    const nextQuestionBanks = state.questionBanks.filter(
      (bank) => !(bank.id === normalizedQuestionBankId && bank.schoolUserId === schoolUserId)
    );

    if (nextQuestionBanks.length === state.questionBanks.length) {
      throw new NotFoundException('Question bank was not found for this school.');
    }

    state.questionBanks = nextQuestionBanks;
    this.saveState(state);
    return { questionBankId: normalizedQuestionBankId, removed: true as const };
  }

  listExamSubmissions(authUser: AuthUserContext, examId: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedExamId = this.normalizeRequiredText(examId, 'Exam ID');
    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === normalizedExamId);
    if (!exam || exam.schoolUserId !== schoolUserId) {
      throw new NotFoundException('Exam was not found for this school.');
    }
    return {
      exam,
      submissions: state.submissions.filter((submission) => submission.examId === exam.id),
    };
  }

  getSchoolExamTrends(authUser: AuthUserContext, examId: string, limitValue?: string) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const normalizedExamId = this.normalizeRequiredText(examId, 'Exam ID');
    const limit = this.resolveTrendLimit(limitValue);
    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === normalizedExamId);
    if (!exam || exam.schoolUserId !== schoolUserId) {
      throw new NotFoundException('Exam was not found for this school.');
    }

    const comparableExams = state.exams
      .filter(
        (item) =>
          item.schoolUserId === schoolUserId &&
          item.subject === exam.subject &&
          item.department === exam.department &&
          item.classGroup === exam.classGroup
      )
      .sort((left, right) => this.resolveExamTimelineValue(left) - this.resolveExamTimelineValue(right));

    const currentIndex = comparableExams.findIndex((item) => item.id === exam.id);
    const startIndex = Math.max(0, currentIndex - limit + 1);
    const windowedExams = comparableExams.slice(startIndex, currentIndex + 1);

    return {
      examId: exam.id,
      trends: windowedExams.map((item) => {
        const examSubmissions = state.submissions.filter((submission) => submission.examId === item.id);
        const scoredSubmissions = examSubmissions.filter(
          (submission) => typeof submission.score === 'number' && submission.maxScore > 0
        );
        const averagePercentage =
          scoredSubmissions.length > 0
            ? scoredSubmissions.reduce(
                (sum, submission) => sum + ((submission.score || 0) / submission.maxScore) * 100,
                0
              ) / scoredSubmissions.length
            : null;

        return {
          examId: item.id,
          title: item.title,
          startAt: item.startAt,
          status: item.publishedAt ? 'published' : 'draft',
          submissionsCount: examSubmissions.length,
          scoredCount: scoredSubmissions.length,
          averagePercentage,
          isCurrent: item.id === exam.id,
        } satisfies ExamTrendSummary;
      }),
    };
  }

  getSchoolGradingSchemeForAuthUser(authUser: AuthUserContext) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    return { gradingScheme: this.getSchoolGradingScheme(state, schoolUserId) };
  }

  updateSchoolGradingSchemeForAuthUser(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const state = this.loadState();
    const normalized = this.normalizeGradingScheme(input);
    if (!normalized) {
      throw new BadRequestException('Provide at least one grading scheme value.');
    }
    const existing = this.getSchoolGradingScheme(state, schoolUserId);
    const updated = { ...existing, ...normalized };
    state.gradingSchemes = state.gradingSchemes || {};
    state.gradingSchemes[schoolUserId] = updated;
    this.saveState(state);
    return { gradingScheme: updated };
  }

  gradeExamSubmission(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const examId = this.normalizeRequiredText(input.examId, 'Exam ID');
    const submissionId = this.normalizeRequiredText(input.submissionId, 'Submission ID');
    const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : '';

    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === examId);
    if (!exam || exam.schoolUserId !== schoolUserId) {
      throw new NotFoundException('Exam was not found for this school.');
    }
    const submissionIndex = state.submissions.findIndex((submission) => submission.id === submissionId);
    if (submissionIndex === -1) {
      throw new NotFoundException('Submission was not found.');
    }

    const maxScore = this.computeMaxScore(exam);
    const questionReviews = this.normalizeQuestionReviews(input.questionReviews, exam);
    const score =
      questionReviews.length > 0
        ? questionReviews.reduce((sum, review) => sum + review.awardedPoints, 0)
        : this.normalizeNumber(input.score, 'Score');
    const normalizedScore = Math.max(0, Math.min(score, maxScore));

    state.submissions[submissionIndex] = {
      ...state.submissions[submissionIndex],
      score: normalizedScore,
      maxScore,
      feedback: feedback || null,
      questionReviews,
      status: 'graded',
      gradedAt: new Date().toISOString(),
    };
    this.saveState(state);

    return { submission: state.submissions[submissionIndex] };
  }

  publishExamResults(authUser: AuthUserContext, input: Record<string, unknown>) {
    const schoolUserId = this.resolveSchoolUserId(authUser);
    const examId = this.normalizeRequiredText(input.examId, 'Exam ID');
    const state = this.loadState();
    const examIndex = state.exams.findIndex((item) => item.id === examId);
    if (examIndex === -1 || state.exams[examIndex].schoolUserId !== schoolUserId) {
      throw new NotFoundException('Exam was not found for this school.');
    }

    const publishedAt = new Date().toISOString();
    const newlyPublishedCount = state.submissions.filter(
      (submission) => submission.examId === examId && submission.status === 'graded'
    ).length;
    const awaitingReviewCount = state.submissions.filter(
      (submission) => submission.examId === examId && submission.status === 'submitted'
    ).length;
    state.exams[examIndex] = {
      ...state.exams[examIndex],
      publishedAt,
    };

    state.submissions = state.submissions.map((submission) => {
      if (submission.examId !== examId || submission.status !== 'graded') {
        return submission;
      }
      return {
        ...submission,
        status: 'published',
        publishedAt,
      };
    });

    if (newlyPublishedCount > 0) {
      state.examNotifications.unshift(
        this.buildResultsPublishedNotification({
          schoolUserId,
          exam: state.exams[examIndex],
          newlyPublishedCount,
          awaitingReviewCount,
          publishedAt,
        })
      );
      if (state.examNotifications.length > 150) {
        state.examNotifications.length = 150;
      }
    }

    this.saveState(state);
    const publishedSubmissionsCount = state.submissions.filter(
      (submission) => submission.examId === examId && submission.status === 'published'
    ).length;

    return {
      publishedAt,
      examId,
      newlyPublishedCount,
      publishedSubmissionsCount,
      awaitingReviewCount,
    };
  }

  startStudentExamAttempt(authUser: AuthUserContext, input: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const examId = this.normalizeRequiredText(input.examId, 'Exam ID');
    const studentId = this.resolveStudentId(authUser, input.studentId);
    const studentName = this.resolveStudentName(authUser, input.studentName);

    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === examId);
    if (!exam) {
      throw new NotFoundException('Exam was not found.');
    }

    this.assertExamWindowOpen(exam);
    this.assertNoSubmittedAttempt(state, examId, studentId);

    const existingAttemptIndex = state.attempts.findIndex(
      (attempt) => attempt.examId === examId && attempt.studentId === studentId
    );
    const expiresAt = this.resolveExamEndAt(exam).toISOString();

    if (existingAttemptIndex >= 0) {
      const existingAttempt = state.attempts[existingAttemptIndex];
      if (existingAttempt.status === 'in_progress') {
        state.attempts[existingAttemptIndex] = {
          ...existingAttempt,
          studentName,
          expiresAt,
          answers: this.normalizeAttemptAnswers(existingAttempt.answers, exam),
        };
        this.saveState(state);
        return {
          exam,
          attempt: this.buildAttemptResponse(state.attempts[existingAttemptIndex], exam),
        };
      }

      if (existingAttempt.status === 'submitted') {
        throw new BadRequestException('You have already submitted this exam.');
      }
    }

    const attempt: ExamAttempt = {
      id: `ATT-${randomBytes(4).toString('hex').toUpperCase()}`,
      examId,
      studentId,
      studentName,
      answers: this.normalizeAttemptAnswers([], exam),
      activeQuestionIndex: 0,
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      expiresAt,
      status: 'in_progress',
      submittedAt: null,
    };

    if (existingAttemptIndex >= 0) {
      state.attempts[existingAttemptIndex] = attempt;
    } else {
      state.attempts.unshift(attempt);
    }

    this.saveState(state);
    return {
      exam,
      attempt: this.buildAttemptResponse(attempt, exam),
    };
  }

  saveStudentExamAttempt(authUser: AuthUserContext, input: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const examId = this.normalizeRequiredText(input.examId, 'Exam ID');
    const attemptId = this.normalizeRequiredText(input.attemptId, 'Attempt ID');
    const studentId = this.resolveStudentId(authUser, input.studentId);

    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === examId);
    if (!exam) {
      throw new NotFoundException('Exam was not found.');
    }

    this.assertExamWindowOpen(exam);

    const attemptIndex = state.attempts.findIndex(
      (attempt) =>
        attempt.id === attemptId &&
        attempt.examId === examId &&
        attempt.studentId === studentId &&
        attempt.status === 'in_progress'
    );
    if (attemptIndex === -1) {
      throw new NotFoundException('Exam attempt was not found.');
    }

    state.attempts[attemptIndex] = {
      ...state.attempts[attemptIndex],
      answers: this.normalizeAttemptAnswers(input.answers, exam),
      activeQuestionIndex: this.resolveActiveQuestionIndex(input.activeQuestionIndex, exam),
      lastSavedAt: new Date().toISOString(),
      expiresAt: this.resolveExamEndAt(exam).toISOString(),
    };

    this.saveState(state);
    return {
      attempt: this.buildAttemptResponse(state.attempts[attemptIndex], exam),
    };
  }

  listStudentExams(authUser: AuthUserContext, query: Record<string, string>) {
    this.assertStudentRole(authUser);
    const department = this.normalizeRequiredText(query.department, 'Department');
    const classGroup = this.normalizeRequiredText(query.classGroup, 'Class');
    const studentId = this.resolveStudentId(authUser, query.studentId);

    const state = this.loadState();
    const exams = state.exams.filter(
      (exam) => exam.department === department && exam.classGroup === classGroup
    );
    const attempts = state.attempts
      .filter((attempt) => attempt.studentId === studentId)
      .map((attempt) => {
        const exam = state.exams.find((item) => item.id === attempt.examId);
        return exam ? this.buildAttemptResponse(attempt, exam) : null;
      })
      .filter((attempt): attempt is ReturnType<ExamsService['buildAttemptResponse']> => Boolean(attempt));
    const submissions = state.submissions
      .filter((submission) => submission.studentId === studentId)
      .map((submission) => ({
        examId: submission.examId,
        status: submission.status,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt || null,
        publishedAt: submission.publishedAt || null,
        score: submission.score,
        maxScore: submission.maxScore,
      }));

    return { exams, attempts, submissions };
  }

  listStudentExamNotifications(authUser: AuthUserContext) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser);
    const state = this.loadState();
    const readIds = this.getStudentExamNotificationReadIds(state, studentId);
    const archivedIds = this.getStudentExamNotificationArchiveIds(state, studentId);

    const notifications = state.submissions
      .filter((submission) => submission.studentId === studentId && submission.status === 'published')
      .map((submission) => {
        const exam = state.exams.find((item) => item.id === submission.examId);
        if (!exam) {
          return null;
        }

        const notificationId = this.buildStudentExamNotificationId(submission.id);
        if (archivedIds.has(notificationId)) {
          return null;
        }
        const createdAt = submission.publishedAt || submission.gradedAt || submission.submittedAt;
        return {
          id: notificationId,
          examId: exam.id,
          title: `Result released for ${exam.title}`,
          message: `Your ${exam.subject} result for ${exam.classGroup} is now available. Open it to review the published score and feedback.`,
          createdAt,
          isRead: readIds.has(notificationId),
          department: exam.department,
          classGroup: exam.classGroup,
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

  archiveStudentExamNotification(authUser: AuthUserContext, notificationId: string) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = this.listStudentExamNotifications(authUser);
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this student.');
    }

    const state = this.loadState();
    const alreadyArchived = state.studentExamNotificationArchives.some(
      (entry) => entry.studentId === studentId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyArchived) {
      state.studentExamNotificationArchives.unshift({
        studentId,
        notificationId: normalizedNotificationId,
        archivedAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = this.listStudentExamNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
      archived: true as const,
    };
  }

  markStudentExamNotificationAsRead(authUser: AuthUserContext, notificationId: string) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser);
    const normalizedNotificationId = this.normalizeRequiredText(notificationId, 'Notification ID');
    const payload = this.listStudentExamNotifications(authUser);
    const exists = payload.notifications.some((notification) => notification.id === normalizedNotificationId);

    if (!exists) {
      throw new NotFoundException('Notification was not found for this student.');
    }

    const state = this.loadState();
    const alreadyRead = state.studentExamNotificationReads.some(
      (entry) => entry.studentId === studentId && entry.notificationId === normalizedNotificationId
    );

    if (!alreadyRead) {
      state.studentExamNotificationReads.unshift({
        studentId,
        notificationId: normalizedNotificationId,
        readAt: new Date().toISOString(),
      });
      this.saveState(state);
    }

    const nextPayload = this.listStudentExamNotifications(authUser);
    return {
      notificationId: normalizedNotificationId,
      unreadCount: nextPayload.unreadCount,
    };
  }

  markAllStudentExamNotificationsAsRead(authUser: AuthUserContext) {
    this.assertStudentRole(authUser);
    const studentId = this.resolveStudentId(authUser);
    const state = this.loadState();
    const payload = this.listStudentExamNotifications(authUser);
    const readIds = this.getStudentExamNotificationReadIds(state, studentId);
    let updated = 0;

    payload.notifications.forEach((notification) => {
      if (readIds.has(notification.id)) {
        return;
      }

      state.studentExamNotificationReads.unshift({
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

  submitStudentExam(authUser: AuthUserContext, input: Record<string, unknown>) {
    this.assertStudentRole(authUser);
    const examId = this.normalizeRequiredText(input.examId, 'Exam ID');
    const attemptId = this.normalizeRequiredText(input.attemptId, 'Attempt ID');
    const studentId = this.resolveStudentId(authUser, input.studentId);
    const studentName = this.resolveStudentName(authUser, input.studentName);

    const state = this.loadState();
    const exam = state.exams.find((item) => item.id === examId);
    if (!exam) {
      throw new NotFoundException('Exam was not found.');
    }

    const endAtMs = this.resolveExamEndAt(exam).getTime();
    const nowMs = Date.now();
    this.assertExamStarted(exam);
    if (Number.isFinite(endAtMs) && nowMs > endAtMs + 30_000) {
      throw new ForbiddenException('Exam time has ended.');
    }

    const maxScore = this.computeMaxScore(exam);
    this.assertNoSubmittedAttempt(state, examId, studentId);
    const attemptIndex = state.attempts.findIndex(
      (attempt) =>
        attempt.id === attemptId &&
        attempt.examId === examId &&
        attempt.studentId === studentId &&
        attempt.status === 'in_progress'
    );
    if (attemptIndex === -1) {
      throw new NotFoundException('Exam attempt was not found.');
    }

    const answers = this.normalizeAttemptAnswers(input.answers, exam);
    const submittedAt = new Date().toISOString();
    state.attempts[attemptIndex] = {
      ...state.attempts[attemptIndex],
      studentName,
      answers,
      activeQuestionIndex: this.resolveActiveQuestionIndex(input.activeQuestionIndex, exam),
      lastSavedAt: submittedAt,
      submittedAt,
      status: 'submitted',
    };

    const submission: ExamSubmission = {
      id: `SUB-${randomBytes(4).toString('hex').toUpperCase()}`,
      examId,
      studentId,
      studentName,
      answers,
      submittedAt,
      status: 'submitted',
      maxScore,
    };

    state.submissions.unshift(submission);
    this.saveState(state);
    return { submission };
  }

  getStudentExamResult(authUser: AuthUserContext, query: Record<string, string>) {
    this.assertStudentRole(authUser);
    const examId = this.normalizeRequiredText(query.examId, 'Exam ID');
    const studentId = this.resolveStudentId(authUser, query.studentId);

    const state = this.loadState();
    const submission = state.submissions.find(
      (item) => item.examId === examId && item.studentId === studentId
    );
    if (!submission) {
      throw new NotFoundException('Result is not available yet.');
    }
    if (submission.status !== 'published') {
      throw new ForbiddenException('Result has not been published yet.');
    }
    return { submission };
  }

  private loadState(): ExamsState {
    if (!existsSync(this.storagePath)) {
      return {
        exams: [],
        questionBanks: [],
        examNotifications: [],
        examNotificationReads: [],
        examNotificationArchives: [],
        studentExamNotificationReads: [],
        studentExamNotificationArchives: [],
        submissions: [],
        attempts: [],
        gradingSchemes: {},
      };
    }
    try {
      const raw = readFileSync(this.storagePath, 'utf-8');
      const parsed = JSON.parse(raw) as ExamsState;
      const exams = Array.isArray(parsed.exams) ? parsed.exams : [];
      const attempts = Array.isArray(parsed.attempts) ? parsed.attempts : [];
      const questionBanks = Array.isArray(parsed.questionBanks) ? parsed.questionBanks : [];
      const examNotifications = Array.isArray(parsed.examNotifications) ? parsed.examNotifications : [];
      const examNotificationReads = Array.isArray(parsed.examNotificationReads)
        ? parsed.examNotificationReads
        : [];
      const examNotificationArchives = Array.isArray(parsed.examNotificationArchives)
        ? parsed.examNotificationArchives
        : [];
      const studentExamNotificationReads = Array.isArray(parsed.studentExamNotificationReads)
        ? parsed.studentExamNotificationReads
        : [];
      const studentExamNotificationArchives = Array.isArray(parsed.studentExamNotificationArchives)
        ? parsed.studentExamNotificationArchives
        : [];
      return {
        exams,
        questionBanks,
        examNotifications,
        examNotificationReads,
        examNotificationArchives,
        studentExamNotificationReads,
        studentExamNotificationArchives,
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
        attempts: this.syncAttemptStatuses(attempts, exams),
        gradingSchemes: parsed.gradingSchemes || {},
      };
    } catch {
      return {
        exams: [],
        questionBanks: [],
        examNotifications: [],
        examNotificationReads: [],
        examNotificationArchives: [],
        studentExamNotificationReads: [],
        studentExamNotificationArchives: [],
        submissions: [],
        attempts: [],
        gradingSchemes: {},
      };
    }
  }

  private saveState(state: ExamsState) {
    writeFileSync(this.storagePath, JSON.stringify(state, null, 2));
  }

  private resolveSchoolUserId(authUser: AuthUserContext) {
    const role = this.normalizeRole(authUser.role);
    if (!this.isSchoolManagerRole(role)) {
      throw new ForbiddenException('Only school or admin accounts can manage exams.');
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
      throw new ForbiddenException('Only student accounts can access exams.');
    }
  }

  private normalizeRole(role: string | null | undefined) {
    return String(role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }

  private isSchoolManagerRole(role: string) {
    return (
      role === 'school' ||
      role === 'admin' ||
      role === 'school-admin' ||
      role === 'school-owner'
    );
  }

  private resolveStudentId(authUser: AuthUserContext, input?: unknown) {
    const fallback = typeof input === 'string' ? input.trim() : '';
    return authUser.id || authUser.email || fallback || `student-${randomBytes(4).toString('hex')}`;
  }

  private resolveStudentName(authUser: AuthUserContext, input?: unknown) {
    const fallback = typeof input === 'string' ? input.trim() : '';
    return authUser.name || fallback || 'Student';
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

    const text = value.trim();
    return text || null;
  }

  private resolveOptionalStoredValue(
    input: Record<string, unknown>,
    key: 'subject' | 'department' | 'classGroup',
    fallback: string | null | undefined
  ) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      return fallback || null;
    }

    return this.normalizeOptionalText(input[key]);
  }

  private normalizeNumber(value: unknown, label: string) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new BadRequestException(`${label} must be a number.`);
    }
    return numberValue;
  }

  private parseRequiredDate(value: unknown, label: string) {
    const raw = this.normalizeRequiredText(value, label);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${label} is not a valid date.`);
    }
    return parsed;
  }

  private resolveDurationMinutes(value: unknown) {
    const duration = Number(value);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('Duration must be a positive number.');
    }
    return Math.min(Math.floor(duration), 300);
  }

  private normalizeQuestions(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Add at least one question.');
    }
    return value.map((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException(`Question ${index + 1} is invalid.`);
      }
      const question = raw as Record<string, unknown>;
      const prompt = this.normalizeRequiredText(question.prompt, `Question ${index + 1} prompt`);
      const type = question.type === 'mcq' ? 'mcq' : 'short';
      const maxPoints = this.normalizeNumber(question.maxPoints, `Question ${index + 1} points`);
      if (maxPoints <= 0) {
        throw new BadRequestException(`Question ${index + 1} points must be greater than 0.`);
      }
      if (type === 'mcq') {
        const options = Array.isArray(question.options) ? question.options : [];
        const normalizedOptions = options
          .map((option, optionIndex) => {
            if (!option || typeof option !== 'object') {
              throw new BadRequestException(`Question ${index + 1} option ${optionIndex + 1} is invalid.`);
            }
            const optionValue = option as Record<string, unknown>;
            return {
              id: String(optionValue.id || `opt-${optionIndex + 1}`),
              text: this.normalizeRequiredText(
                optionValue.text,
                `Question ${index + 1} option ${optionIndex + 1}`
              ),
            };
          })
          .filter((option) => option.text);
        if (normalizedOptions.length < 2) {
          throw new BadRequestException(`Question ${index + 1} needs at least 2 options.`);
        }
        const correctOptionId = String(question.correctOptionId || '').trim();
        if (!correctOptionId) {
          throw new BadRequestException(`Question ${index + 1} needs a correct option.`);
        }
        if (!normalizedOptions.some((option) => option.id === correctOptionId)) {
          throw new BadRequestException(`Question ${index + 1} has an invalid correct option.`);
        }
        return {
          id: String(question.id || `q-${randomBytes(3).toString('hex')}`),
          type,
          prompt,
          options: normalizedOptions,
          correctOptionId,
          maxPoints,
        } satisfies ExamQuestion;
      }
      return {
        id: String(question.id || `q-${randomBytes(3).toString('hex')}`),
        type,
        prompt,
        maxPoints,
      } satisfies ExamQuestion;
    });
  }

  private normalizeAnswers(value: unknown) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException('Submit at least one answer.');
    }
    return value.map((raw) => {
      const answer = raw as Record<string, unknown>;
      return {
        questionId: this.normalizeRequiredText(answer.questionId, 'Answer question'),
        response: String(answer.response || '').trim(),
        optionId: typeof answer.optionId === 'string' ? answer.optionId : null,
      };
    });
  }

  private normalizeAttemptAnswers(value: unknown, exam: ExamRecord) {
    const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
    const providedAnswers = Array.isArray(value) ? value : [];
    const answerLookup = new Map<
      string,
      { questionId: string; response: string; optionId?: string | null }
    >();

    providedAnswers.forEach((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException(`Answer ${index + 1} is invalid.`);
      }

      const answer = raw as Record<string, unknown>;
      const questionId = this.normalizeRequiredText(answer.questionId, 'Answer question');
      if (!questionMap.has(questionId)) {
        throw new BadRequestException('One or more answers do not match this exam.');
      }

      answerLookup.set(questionId, {
        questionId,
        response: String(answer.response || '').trim(),
        optionId: typeof answer.optionId === 'string' ? answer.optionId : null,
      });
    });

    return exam.questions.map((question) => {
      const existing = answerLookup.get(question.id);
      return (
        existing || {
          questionId: question.id,
          response: '',
          optionId: null,
        }
      );
    });
  }

  private normalizeQuestionReviews(value: unknown, exam: ExamRecord) {
    if (!Array.isArray(value) || value.length === 0) {
      return [];
    }

    const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
    return value.map((raw, index) => {
      if (!raw || typeof raw !== 'object') {
        throw new BadRequestException(`Question review ${index + 1} is invalid.`);
      }

      const review = raw as Record<string, unknown>;
      const questionId = this.normalizeRequiredText(
        review.questionId,
        `Question review ${index + 1} question`
      );
      const question = questionMap.get(questionId);
      if (!question) {
        throw new BadRequestException(`Question review ${index + 1} does not match this exam.`);
      }

      const awardedPoints = this.normalizeNumber(
        review.awardedPoints,
        `Question review ${index + 1} score`
      );
      const feedback =
        typeof review.feedback === 'string' && review.feedback.trim()
          ? review.feedback.trim()
          : null;

      return {
        questionId,
        awardedPoints: Math.max(0, Math.min(awardedPoints, question.maxPoints || 0)),
        feedback,
      };
    });
  }

  private computeMaxScore(exam: ExamRecord) {
    return exam.questions.reduce((total, question) => total + (question.maxPoints || 0), 0);
  }

  private resolveActiveQuestionIndex(value: unknown, exam: ExamRecord) {
    const questionCount = exam.questions.length;
    if (questionCount <= 0) {
      return 0;
    }

    const index = Number(value);
    if (!Number.isFinite(index)) {
      return 0;
    }

    return Math.min(Math.max(Math.floor(index), 0), questionCount - 1);
  }

  private resolveExamEndAt(exam: ExamRecord) {
    const startAt = new Date(exam.startAt);
    return new Date(startAt.getTime() + exam.durationMinutes * 60 * 1000);
  }

  private assertExamStarted(exam: ExamRecord) {
    const startAtMs = new Date(exam.startAt).getTime();
    if (Number.isFinite(startAtMs) && Date.now() < startAtMs) {
      throw new ForbiddenException('Exam has not started yet.');
    }
  }

  private assertExamWindowOpen(exam: ExamRecord) {
    this.assertExamStarted(exam);
    const endAtMs = this.resolveExamEndAt(exam).getTime();
    if (Number.isFinite(endAtMs) && Date.now() > endAtMs) {
      throw new ForbiddenException('Exam time has ended.');
    }
  }

  private syncAttemptStatuses(attempts: ExamAttempt[], exams: ExamRecord[]): ExamAttempt[] {
    const examMap = new Map(exams.map((exam) => [exam.id, exam]));
    const nowMs = Date.now();

    return attempts.map((attempt) => {
      const exam = examMap.get(attempt.examId);
      if (!exam || attempt.status !== 'in_progress') {
        return attempt;
      }

      const endAtMs = this.resolveExamEndAt(exam).getTime();
      if (Number.isFinite(endAtMs) && nowMs > endAtMs) {
        return {
          ...attempt,
          status: 'expired',
          expiresAt: this.resolveExamEndAt(exam).toISOString(),
        } satisfies ExamAttempt;
      }

      return {
        ...attempt,
        expiresAt: this.resolveExamEndAt(exam).toISOString(),
      } satisfies ExamAttempt;
    });
  }

  private assertNoSubmittedAttempt(state: ExamsState, examId: string, studentId: string) {
    const existingSubmission = state.submissions.find(
      (submission) => submission.examId === examId && submission.studentId === studentId
    );
    if (existingSubmission) {
      throw new BadRequestException('You have already submitted this exam.');
    }

    const submittedAttempt = state.attempts.find(
      (attempt) =>
        attempt.examId === examId &&
        attempt.studentId === studentId &&
        attempt.status === 'submitted'
    );
    if (submittedAttempt) {
      throw new BadRequestException('You have already submitted this exam.');
    }
  }

  private buildAttemptResponse(attempt: ExamAttempt, exam: ExamRecord) {
    const answeredCount = attempt.answers.filter(
      (answer) => Boolean(answer.optionId || String(answer.response || '').trim())
    ).length;
    const expiresAtMs = new Date(attempt.expiresAt).getTime();

    return {
      ...attempt,
      questionCount: exam.questions.length,
      answeredCount,
      timeRemainingMs: Number.isFinite(expiresAtMs)
        ? Math.max(0, expiresAtMs - Date.now())
        : 0,
    };
  }

  private buildQuestionBankResponse(questionBank: ExamQuestionBank) {
    return {
      id: questionBank.id,
      name: questionBank.name,
      subject: questionBank.subject || null,
      department: questionBank.department || null,
      classGroup: questionBank.classGroup || null,
      questions: questionBank.questions,
      questionCount: questionBank.questions.length,
      createdAt: questionBank.createdAt,
      updatedAt: questionBank.updatedAt,
    };
  }

  private buildResultsPublishedNotification(input: {
    schoolUserId: string;
    exam: ExamRecord;
    newlyPublishedCount: number;
    awaitingReviewCount: number;
    publishedAt: string;
  }): ExamNotification {
    const classLabel = [input.exam.department, input.exam.classGroup].filter(Boolean).join(' • ');
    const awaitingMessage =
      input.awaitingReviewCount > 0
        ? ` ${input.awaitingReviewCount} submission${input.awaitingReviewCount === 1 ? '' : 's'} still awaiting review.`
        : '';

    return {
      id: `EXN-${randomBytes(4).toString('hex').toUpperCase()}`,
      schoolUserId: input.schoolUserId,
      examId: input.exam.id,
      kind: 'results_published',
      title: `Results released for ${input.exam.title}`,
      message: `${input.newlyPublishedCount} result${input.newlyPublishedCount === 1 ? '' : 's'} published${
        classLabel ? ` for ${classLabel}` : ''
      }.${awaitingMessage}`.trim(),
      createdAt: input.publishedAt,
    };
  }

  private buildExamNotificationResponse(notification: ExamNotification, isRead = false) {
    return {
      id: notification.id,
      examId: notification.examId,
      kind: notification.kind,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      isRead,
    };
  }

  private getExamNotificationReadIds(state: ExamsState, schoolUserId: string) {
    return new Set(
      state.examNotificationReads
        .filter((entry) => entry.schoolUserId === schoolUserId)
        .map((entry) => entry.notificationId)
    );
  }

  private getExamNotificationArchiveIds(state: ExamsState, schoolUserId: string) {
    return new Set(
      state.examNotificationArchives
        .filter((entry) => entry.schoolUserId === schoolUserId)
        .map((entry) => entry.notificationId)
    );
  }

  private buildStudentExamNotificationId(submissionId: string) {
    return `exam-result:${submissionId}`;
  }

  private getStudentExamNotificationReadIds(state: ExamsState, studentId: string) {
    return new Set(
      state.studentExamNotificationReads
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => entry.notificationId)
    );
  }

  private getStudentExamNotificationArchiveIds(state: ExamsState, studentId: string) {
    return new Set(
      state.studentExamNotificationArchives
        .filter((entry) => entry.studentId === studentId)
        .map((entry) => entry.notificationId)
    );
  }

  private resolveTrendLimit(value?: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 6;
    }
    return Math.min(12, Math.max(2, Math.floor(parsed)));
  }

  private resolveExamTimelineValue(exam: ExamRecord) {
    const startAt = new Date(exam.startAt).getTime();
    if (Number.isFinite(startAt)) {
      return startAt;
    }
    const createdAt = new Date(exam.createdAt).getTime();
    return Number.isFinite(createdAt) ? createdAt : 0;
  }

  private getDefaultGradingScheme() {
    return {
      primary: 'standard',
      secondary: 'waec',
      tertiary: 'cgpa-5',
    };
  }

  private getSchoolGradingScheme(state: ExamsState, schoolUserId: string) {
    const defaults = this.getDefaultGradingScheme();
    const saved = state.gradingSchemes?.[schoolUserId];
    return { ...defaults, ...(saved || {}) };
  }

  private normalizeGradingScheme(value: unknown) {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const raw = value as Record<string, unknown>;
    const normalized: { primary?: string; secondary?: string; tertiary?: string } = {};
    if (typeof raw.primary === 'string' && raw.primary.trim()) {
      normalized.primary = raw.primary.trim();
    }
    if (typeof raw.secondary === 'string' && raw.secondary.trim()) {
      normalized.secondary = raw.secondary.trim();
    }
    if (typeof raw.tertiary === 'string' && raw.tertiary.trim()) {
      normalized.tertiary = raw.tertiary.trim();
    }
    return Object.keys(normalized).length > 0 ? normalized : null;
  }
}
