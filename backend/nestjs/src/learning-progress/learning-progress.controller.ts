import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { LearningProgressService } from './learning-progress.service';

type ProgressUpdateBody = {
  selectedLessonId?: string | null;
  completedLessonIds?: string[];
  passedModuleIds?: string[];
};

@Controller('learning-progress')
export class LearningProgressController {
  constructor(private readonly learningProgressService: LearningProgressService) {}

  @Get(':learnerKey/:courseId')
  getOne(@Param('learnerKey') learnerKey: string, @Param('courseId', ParseIntPipe) courseId: number) {
    return (
      this.learningProgressService.get(learnerKey, courseId) ?? {
        learnerKey,
        courseId,
        selectedLessonId: null,
        completedLessonIds: [],
        passedModuleIds: [],
        updatedAt: null,
      }
    );
  }

  @Put(':learnerKey/:courseId')
  update(
    @Param('learnerKey') learnerKey: string,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: ProgressUpdateBody
  ) {
    return this.learningProgressService.upsert(learnerKey, courseId, body);
  }
}
