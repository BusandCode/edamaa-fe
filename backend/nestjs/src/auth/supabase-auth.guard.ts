import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const devEmailHeader = request.headers?.['x-dev-user-email'];
    const devRoleHeader = request.headers?.['x-dev-user-role'];
    const devUserMetadataHeader = request.headers?.['x-dev-user-metadata'];
    const devAppMetadataHeader = request.headers?.['x-dev-app-metadata'];
    const user = await this.supabaseService.getUserFromAuthHeader(
      request.headers?.authorization,
      Array.isArray(devEmailHeader) ? devEmailHeader[0] : devEmailHeader,
      Array.isArray(devRoleHeader) ? devRoleHeader[0] : devRoleHeader,
      Array.isArray(devUserMetadataHeader) ? devUserMetadataHeader[0] : devUserMetadataHeader,
      Array.isArray(devAppMetadataHeader) ? devAppMetadataHeader[0] : devAppMetadataHeader
    );
    request.user = user;
    return true;
  }
}
