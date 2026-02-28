import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, PrismaService],
})
export class RealtimeModule {}
