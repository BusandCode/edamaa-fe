import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && serviceRoleKey) {
      this.adminClient = createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return;
    }

    this.adminClient = null;
  }

  isConfigured() {
    return this.adminClient !== null;
  }

  async getUserFromAuthHeader(authHeader?: string) {
    if (!this.adminClient) {
      throw new UnauthorizedException('Supabase auth is not configured');
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length);
    // Newer supabase-js typings in this environment expose an auth client type
    // that does not include `getUser(...)` even though runtime supports it.
    const authClient = this.adminClient.auth as any;
    const { data, error } = await authClient.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid Supabase token');
    }

    return data.user;
  }
}
