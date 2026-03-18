import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ResourcesService } from './resources.service';

type UploadResourceBody = {
  title?: string;
  description?: string;
  subject?: string;
  type?: string;
  category?: string;
  pricingType?: string;
  price?: string | number;
  uploaderRole?: string;
  instructorName?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('me/feed')
  getFeed(@Req() request: Request) {
    return this.resourcesService.getFeedForAuthUser(this.getAuthUser(request));
  }

  @Get('me/notifications')
  getNotifications(@Req() request: Request) {
    return this.resourcesService.getNotificationsForAuthUser(this.getAuthUser(request));
  }

  @Post('me/notifications/:notificationId/read')
  markNotificationAsRead(
    @Req() request: Request,
    @Param('notificationId') notificationId: string
  ) {
    return this.resourcesService.markNotificationAsReadForAuthUser(
      this.getAuthUser(request),
      notificationId
    );
  }

  @Post('me/notifications/read-all')
  markAllNotificationsAsRead(@Req() request: Request) {
    return this.resourcesService.markAllNotificationsAsReadForAuthUser(this.getAuthUser(request));
  }

  @Get('me/uploads')
  getMyUploads(@Req() request: Request) {
    return this.resourcesService.getUploadsForAuthUser(this.getAuthUser(request));
  }

  @Get('discover/free-books')
  discoverFreeBooks(
    @Req() request: Request,
    @Query('q') query: string | undefined,
    @Query('subject') subject: string | undefined,
    @Query('limit') limit: string | undefined
  ) {
    return this.resourcesService.searchFreeLibraryForAuthUser(this.getAuthUser(request), {
      query,
      subject,
      limit,
    });
  }

  @Post('me/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    })
  )
  uploadResource(
    @Req() request: Request,
    @Body() body: UploadResourceBody,
    @UploadedFile() uploadedFile: any
  ) {
    return this.resourcesService.uploadResourceForAuthUser(
      this.getAuthUser(request),
      {
        title: body.title,
        description: body.description,
        subject: body.subject,
        type: body.type,
        category: body.category,
        pricingType: body.pricingType,
        price: body.price,
        uploaderRole: body.uploaderRole,
        instructorName: body.instructorName,
      },
      uploadedFile
    );
  }

  @Patch('me/items/:resourceId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    })
  )
  updateResource(
    @Req() request: Request,
    @Param('resourceId') resourceId: string,
    @Body() body: UploadResourceBody,
    @UploadedFile() uploadedFile: any
  ) {
    return this.resourcesService.updateResourceForAuthUser(
      this.getAuthUser(request),
      resourceId,
      {
        title: body.title,
        description: body.description,
        subject: body.subject,
        type: body.type,
        category: body.category,
        pricingType: body.pricingType,
        price: body.price,
        uploaderRole: body.uploaderRole,
        instructorName: body.instructorName,
      },
      uploadedFile
    );
  }

  @Post('me/items/:resourceId/purchase')
  purchaseResource(@Req() request: Request, @Param('resourceId') resourceId: string) {
    return this.resourcesService.purchaseResourceForAuthUser(this.getAuthUser(request), resourceId);
  }

  @Delete('me/items/:resourceId')
  deleteResource(@Req() request: Request, @Param('resourceId') resourceId: string) {
    return this.resourcesService.deleteResourceForAuthUser(this.getAuthUser(request), resourceId);
  }

  @Get('me/items/:resourceId/download')
  async downloadResource(
    @Req() request: Request,
    @Param('resourceId') resourceId: string,
    @Query('inline') inline: string | undefined,
    @Res() response: Response
  ) {
    const payload = this.resourcesService.getResourceDownloadForAuthUser(
      this.getAuthUser(request),
      resourceId
    );

    const disposition = inline === '1' ? 'inline' : 'attachment';
    const safeFileName = String(payload.fileName || 'resource-file')
      .replace(/[\r\n"]/g, '')
      .trim();

    response.setHeader('Content-Type', payload.mimeType || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Disposition', `${disposition}; filename="${safeFileName}"`);
    response.send(payload.bytes);
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
