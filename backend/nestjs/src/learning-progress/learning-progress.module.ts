import { Module } from '@nestjs/common';
import { LearningProgressController } from './learning-progress.controller';
import { LearningProgressService } from './learning-progress.service';

@Module({
  controllers: [LearningProgressController],
  providers: [LearningProgressService],
})
export class LearningProgressModule {}
