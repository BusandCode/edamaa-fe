import { Injectable } from '@nestjs/common';

export type CourseProgressRecord = {
  learnerKey: string;
  courseId: number;
  selectedLessonId: string | null;
  completedLessonIds: string[];
  passedModuleIds: string[];
  updatedAt: string;
};

type ProgressUpdateInput = {
  selectedLessonId?: string | null;
  completedLessonIds?: string[];
  passedModuleIds?: string[];
};

@Injectable()
export class LearningProgressService {
  /**
   * In-memory store for local dev and lightweight sync.
   * This keeps course progress available across browser sessions/devices
   * as long as the API process stays online.
   */
  private readonly records = new Map<string, CourseProgressRecord>();

  get(learnerKey: string, courseId: number): CourseProgressRecord | null {
    return this.records.get(this.composeKey(learnerKey, courseId)) ?? null;
  }

  upsert(learnerKey: string, courseId: number, update: ProgressUpdateInput): CourseProgressRecord {
    const existing = this.get(learnerKey, courseId);

    const merged: CourseProgressRecord = {
      learnerKey,
      courseId,
      selectedLessonId:
        typeof update.selectedLessonId === 'string' || update.selectedLessonId === null
          ? update.selectedLessonId
          : existing?.selectedLessonId ?? null,
      completedLessonIds: this.unique(update.completedLessonIds ?? existing?.completedLessonIds ?? []),
      passedModuleIds: this.unique(update.passedModuleIds ?? existing?.passedModuleIds ?? []),
      updatedAt: new Date().toISOString(),
    };

    this.records.set(this.composeKey(learnerKey, courseId), merged);
    return merged;
  }

  listByLearner(learnerKey: string): CourseProgressRecord[] {
    if (!learnerKey.trim()) {
      return [];
    }

    return Array.from(this.records.values()).filter((record) => record.learnerKey === learnerKey);
  }

  listByCourse(courseId: number): CourseProgressRecord[] {
    return Array.from(this.records.values())
      .filter((record) => record.courseId === courseId)
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }

  private composeKey(learnerKey: string, courseId: number) {
    return `${learnerKey}::${courseId}`;
  }

  private unique(values: string[]) {
    return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
  }
}
