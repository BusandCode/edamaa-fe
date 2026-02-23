import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = await this.supabaseService.getUserFromAuthHeader(request.headers?.authorization);
    request.user = user;
    return true;
  }
}
