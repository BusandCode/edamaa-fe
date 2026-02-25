import { Injectable, Logger } from '@nestjs/common';
import { LearningProgressService, type CourseProgressRecord } from '../learning-progress/learning-progress.service';
import { PrismaService } from '../prisma.service';

type WeeklyMetric = {
  week: string;
  score: number;
  completionRate: number;
  studyHours: number;
};

type SubjectMetric = {
  subject: string;
  averageScore: number;
  completionRate: number;
  onTimeRate: number;
  attempts: number;
  trend: number;
};

type GoalMetric = {
  id: string;
  title: string;
  current: number;
  target: number;
  suffix: string;
};

type AnalyticsSummary = {
  overallScore: number;
  completionRate: number;
  onTimeRate: number;
  averageStudyHours: number;
  trendDelta: number;
  attendanceRate: number;
};

type PerformanceResponse = {
  learnerKey: string | null;
  studentId: number | null;
  generatedAt: string;
  summary: AnalyticsSummary;
  weeklyMetrics: WeeklyMetric[];
  subjectMetrics: SubjectMetric[];
  goals: GoalMetric[];
  recommendations: string[];
  dataQuality: {
    degraded: boolean;
    dataSources: string[];
  };
  auth?: {
    supabaseUserId: string | null;
    email: string | null;
  };
};

type CourseLookup = {
  courseId: number;
  title: string;
};

type WeekBucket = {
  key: string;
  label: string;
  start: Date;
  callEvents: number;
  missedEvents: number;
  durationSeconds: number;
  progressUpdates: number;
};

@Injectable()
export class StudentAnalyticsService {
  private readonly logger = new Logger(StudentAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly learningProgressService: LearningProgressService
  ) {}

  async getPerformanceSnapshot(input: { learnerKey?: string; studentId?: number | null }): Promise<PerformanceResponse> {
    const learnerKey = (input.learnerKey || '').trim();
    const studentId = Number.isFinite(input.studentId) ? Number(input.studentId) : null;
    const generatedAt = new Date();
    const since = this.startOfWeek(this.addDays(generatedAt, -7 * 11));
    const dataSources = new Set<string>();
    let degraded = false;

    const progressRecords = learnerKey
      ? this.learningProgressService.listByLearner(learnerKey)
      : [];

    if (progressRecords.length > 0) {
      dataSources.add('learning-progress');
    }

    let courses: CourseLookup[] = [];
    let callEvents: Array<{
      event: string;
      reason: string | null;
      durationSeconds: number | null;
      publishedAt: Date;
    }> = [];

    if (studentId !== null) {
      const [coursesResult, callsResult] = await Promise.all([
        this.loadCoursesByStudent(studentId),
        this.loadCallEventsByStudent(studentId, since),
      ]);
      courses = coursesResult.items;
      callEvents = callsResult.items;
      degraded = coursesResult.degraded || callsResult.degraded;

      if (courses.length > 0) {
        dataSources.add('enrollments');
      }
      if (callEvents.length > 0) {
        dataSources.add('call-events');
      }
    }

    const subjectMetrics = this.buildSubjectMetrics(courses, progressRecords, callEvents);
    const weeklyMetrics = this.buildWeeklyMetrics(generatedAt, subjectMetrics, progressRecords, callEvents);
    const summary = this.buildSummary(subjectMetrics, weeklyMetrics);
    const goals = this.buildGoals(summary);
    const recommendations = this.buildRecommendations(summary, subjectMetrics);

    if (dataSources.size === 0) {
      dataSources.add('fallback');
    }

    return {
      learnerKey: learnerKey || null,
      studentId,
      generatedAt: generatedAt.toISOString(),
      summary,
      weeklyMetrics,
      subjectMetrics,
      goals,
      recommendations,
      dataQuality: {
        degraded,
        dataSources: Array.from(dataSources),
      },
    };
  }

  async getPerformanceSnapshotForAuthUser(
    authUser: { id?: string | null; email?: string | null },
    input: { learnerKey?: string }
  ): Promise<PerformanceResponse> {
    const normalizedEmail =
      typeof authUser.email === 'string' && authUser.email.trim()
        ? authUser.email.trim().toLowerCase()
        : '';
    const studentIdResolution = await this.resolveStudentIdFromEmail(normalizedEmail);
    const snapshot = await this.getPerformanceSnapshot({
      learnerKey: input.learnerKey,
      studentId: studentIdResolution.studentId,
    });

    return {
      ...snapshot,
      dataQuality: {
        ...snapshot.dataQuality,
        degraded: snapshot.dataQuality.degraded || studentIdResolution.degraded,
      },
      auth: {
        supabaseUserId:
          typeof authUser.id === 'string' && authUser.id.trim() ? authUser.id.trim() : null,
        email: normalizedEmail || null,
      },
    };
  }

  private async loadCoursesByStudent(studentId: number) {
    try {
      const rows = await this.prisma.enrollment.findMany({
        where: { userId: studentId },
        include: { course: true },
      });

      const dedupedByCourse = new Map<number, CourseLookup>();
      rows.forEach((row) => {
        if (!dedupedByCourse.has(row.courseId)) {
          dedupedByCourse.set(row.courseId, {
            courseId: row.courseId,
            title: row.course?.title || `Course ${row.courseId}`,
          });
        }
      });

      return {
        items: Array.from(dedupedByCourse.values()),
        degraded: false,
      };
    } catch (error) {
      this.logger.warn(`Could not load enrollment analytics (${(error as Error).message})`);
      return {
        items: [] as CourseLookup[],
        degraded: true,
      };
    }
  }

  private async resolveStudentIdFromEmail(email: string) {
    if (!email) {
      return { studentId: null as number | null, degraded: false };
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      return { studentId: user?.id ?? null, degraded: false };
    } catch (error) {
      this.logger.warn(`Could not resolve analytics user by email (${(error as Error).message})`);
      return { studentId: null as number | null, degraded: true };
    }
  }

  private async loadCallEventsByStudent(studentId: number, since: Date) {
    try {
      const rows = await this.prisma.callSignalEvent.findMany({
        where: {
          studentId,
          publishedAt: { gte: since },
        },
        orderBy: { publishedAt: 'asc' },
      });

      return {
        items: rows.map((row) => ({
          event: row.event,
          reason: row.reason,
          durationSeconds: row.durationSeconds,
          publishedAt: row.publishedAt,
        })),
        degraded: false,
      };
    } catch (error) {
      this.logger.warn(`Could not load call analytics (${(error as Error).message})`);
      return {
        items: [] as Array<{
          event: string;
          reason: string | null;
          durationSeconds: number | null;
          publishedAt: Date;
        }>,
        degraded: true,
      };
    }
  }

  private buildSubjectMetrics(
    courses: CourseLookup[],
    progressRecords: CourseProgressRecord[],
    callEvents: Array<{
      event: string;
      reason: string | null;
      durationSeconds: number | null;
      publishedAt: Date;
    }>
  ) {
    const progressByCourseId = new Map<number, CourseProgressRecord>();
    progressRecords.forEach((record) => {
      progressByCourseId.set(record.courseId, record);
    });

    const courseSubjects =
      courses.length > 0
        ? courses
        : progressRecords.length > 0
          ? progressRecords.map((record) => ({
              courseId: record.courseId,
              title: `Course ${record.courseId}`,
            }))
          : [{ courseId: 0, title: 'General Learning' }];

    const missedCount = callEvents.filter((event) => event.reason === 'missed' || event.reason === 'declined').length;
    const perSubjectActivity = callEvents.length / Math.max(1, courseSubjects.length);
    const missedRatio = callEvents.length > 0 ? missedCount / callEvents.length : 0;

    return courseSubjects.map((entry, index) => {
      const progress = progressByCourseId.get(entry.courseId);
      const completedLessons = progress?.completedLessonIds.length || 0;
      const passedModules = progress?.passedModuleIds.length || 0;
      const completionRate = this.clamp(
        Math.round(42 + completedLessons * 8 + passedModules * 14 + perSubjectActivity * 5 - index),
        35,
        100
      );
      const onTimeRate = this.clamp(
        Math.round(90 - missedRatio * 25 + passedModules * 3 + completedLessons * 2 - index * 2),
        45,
        99
      );
      const averageScore = this.clamp(Math.round(completionRate * 0.62 + onTimeRate * 0.38), 40, 99);
      const attempts = Math.max(1, completedLessons + passedModules + Math.round(perSubjectActivity));
      const trend = this.roundToSingleDecimal(
        this.clamp((passedModules * 2 + completedLessons) / 2 - missedCount * 0.4 + (index % 2 === 0 ? 1.2 : -0.8), -12, 12)
      );

      return {
        subject: entry.title,
        averageScore,
        completionRate,
        onTimeRate,
        attempts,
        trend,
      };
    });
  }

  private buildWeeklyMetrics(
    now: Date,
    subjectMetrics: SubjectMetric[],
    progressRecords: CourseProgressRecord[],
    callEvents: Array<{
      event: string;
      reason: string | null;
      durationSeconds: number | null;
      publishedAt: Date;
    }>
  ) {
    const weeks = this.createWeekBuckets(now, 12);
    const weekByKey = new Map<string, WeekBucket>(weeks.map((bucket) => [bucket.key, bucket]));

    callEvents.forEach((event) => {
      const bucket = weekByKey.get(this.weekKey(event.publishedAt));
      if (!bucket) {
        return;
      }

      bucket.callEvents += 1;
      if (event.reason === 'missed' || event.reason === 'declined') {
        bucket.missedEvents += 1;
      }
      if (event.event === 'call.end' && Number.isFinite(event.durationSeconds)) {
        bucket.durationSeconds += Math.max(0, Math.round(Number(event.durationSeconds)));
      }
    });

    progressRecords.forEach((record) => {
      const updatedAt = new Date(record.updatedAt);
      if (!Number.isFinite(updatedAt.getTime())) {
        return;
      }

      const bucket = weekByKey.get(this.weekKey(updatedAt));
      if (!bucket) {
        return;
      }
      bucket.progressUpdates += 1;
    });

    const baseCompletion = this.average(subjectMetrics.map((metric) => metric.completionRate), 58);

    return weeks.map((bucket) => {
      const studyHours = this.roundToSingleDecimal(
        Math.max(0.2, bucket.durationSeconds / 3600 + bucket.callEvents * 0.15 + bucket.progressUpdates * 0.25)
      );
      const completionRate = this.clamp(
        Math.round(baseCompletion + bucket.progressUpdates * 4 + bucket.callEvents * 2 - bucket.missedEvents * 3),
        30,
        100
      );
      const score = this.clamp(
        Math.round(completionRate * 0.62 + studyHours * 10 + bucket.callEvents * 1.6 - bucket.missedEvents * 2.4),
        35,
        99
      );

      return {
        week: bucket.label,
        score,
        completionRate,
        studyHours,
      };
    });
  }

  private buildSummary(subjectMetrics: SubjectMetric[], weeklyMetrics: WeeklyMetric[]): AnalyticsSummary {
    const overallScore = this.roundToSingleDecimal(this.average(subjectMetrics.map((metric) => metric.averageScore), 72));
    const completionRate = this.roundToSingleDecimal(this.average(subjectMetrics.map((metric) => metric.completionRate), 68));
    const onTimeRate = this.roundToSingleDecimal(this.average(subjectMetrics.map((metric) => metric.onTimeRate), 74));
    const averageStudyHours = this.roundToSingleDecimal(this.average(weeklyMetrics.map((metric) => metric.studyHours), 5.5));

    const firstWindow = weeklyMetrics.slice(0, 4).map((metric) => metric.score);
    const lastWindow = weeklyMetrics.slice(-4).map((metric) => metric.score);
    const trendDelta = this.roundToSingleDecimal(this.average(lastWindow, overallScore) - this.average(firstWindow, overallScore));

    const activeWeeks = weeklyMetrics.filter((metric) => metric.studyHours >= 1 || metric.completionRate >= 55).length;
    const attendanceRate = this.clamp(Math.round((activeWeeks / Math.max(1, weeklyMetrics.length)) * 100), 40, 100);

    return {
      overallScore,
      completionRate,
      onTimeRate,
      averageStudyHours,
      trendDelta,
      attendanceRate,
    };
  }

  private buildGoals(summary: AnalyticsSummary): GoalMetric[] {
    return [
      {
        id: 'overall-score',
        title: 'Average Score Goal',
        current: this.roundToSingleDecimal(summary.overallScore),
        target: this.clamp(Math.round(summary.overallScore + 5), 70, 100),
        suffix: '%',
      },
      {
        id: 'completion-rate',
        title: 'Completion Goal',
        current: this.roundToSingleDecimal(summary.completionRate),
        target: this.clamp(Math.round(summary.completionRate + 6), 75, 100),
        suffix: '%',
      },
      {
        id: 'study-hours',
        title: 'Weekly Study Goal',
        current: this.roundToSingleDecimal(summary.averageStudyHours),
        target: this.roundToSingleDecimal(this.clamp(summary.averageStudyHours + 2, 8, 24)),
        suffix: ' hrs',
      },
    ];
  }

  private buildRecommendations(summary: AnalyticsSummary, subjectMetrics: SubjectMetric[]) {
    const recommendations: string[] = [];
    const focusSubjects = subjectMetrics
      .filter((subject) => subject.averageScore < 80 || subject.onTimeRate < 80)
      .slice(0, 2)
      .map((subject) => subject.subject);

    if (focusSubjects.length > 0) {
      recommendations.push(
        `Run two focused revision blocks this week for ${focusSubjects.join(' and ')} to stabilise your score.`
      );
    }

    if (summary.onTimeRate < 85) {
      recommendations.push('Set personal due-time reminders 12 hours earlier so your submissions land consistently on time.');
    }

    if (summary.averageStudyHours < 10) {
      recommendations.push('Add one extra 30-minute study block on three days this week to build a steady learning rhythm.');
    }

    recommendations.push('Review this report with your tutor to align next-week goals with your strongest and weakest areas.');

    return recommendations.slice(0, 4);
  }

  private createWeekBuckets(referenceDate: Date, count: number): WeekBucket[] {
    const currentWeekStart = this.startOfWeek(referenceDate);
    const buckets: WeekBucket[] = [];

    for (let index = count - 1; index >= 0; index -= 1) {
      const weekStart = this.addDays(currentWeekStart, -index * 7);
      const humanIndex = count - index;
      buckets.push({
        key: this.weekKey(weekStart),
        label: `W${humanIndex}`,
        start: weekStart,
        callEvents: 0,
        missedEvents: 0,
        durationSeconds: 0,
        progressUpdates: 0,
      });
    }

    return buckets;
  }

  private weekKey(value: Date) {
    const weekStart = this.startOfWeek(value);
    return weekStart.toISOString().slice(0, 10);
  }

  private startOfWeek(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + offsetToMonday);
    return date;
  }

  private addDays(value: Date, days: number) {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private average(values: number[], fallback: number) {
    if (values.length === 0) {
      return fallback;
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private roundToSingleDecimal(value: number) {
    return Math.round(value * 10) / 10;
  }
}
