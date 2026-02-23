import { Module } from '@nestjs/common';
import { DjangoAdminClientService } from './django-admin-client.service';
import { InternalAdminController } from './internal-admin.controller';
import { InternalTokenGuard } from './internal-token.guard';

@Module({
  controllers: [InternalAdminController],
  providers: [DjangoAdminClientService, InternalTokenGuard],
})
export class InternalAdminModule {}
