import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient | null;
  private readonly allowLocalDevBypass: boolean;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.allowLocalDevBypass =
      process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH_BYPASS !== '0';

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

  async getUserFromAuthHeader(
    authHeader?: string,
    devEmailHeader?: string,
    devRoleHeader?: string,
    devUserMetadataHeader?: string,
    devAppMetadataHeader?: string
  ) {
    if (!this.adminClient) {
      if (this.allowLocalDevBypass) {
        const email =
          this.normalizeEmail(devEmailHeader) || this.extractEmailFromBearerToken(authHeader);
        const role =
          this.normalizeRole(devRoleHeader) || this.extractRoleFromBearerToken(authHeader) || 'student';
        const devUserMetadata = this.parseOptionalMetadataJson(devUserMetadataHeader);
        const devAppMetadata = this.parseOptionalMetadataJson(devAppMetadataHeader);
        if (email && email.includes('@')) {
          return {
            id: `local-dev-${email}`,
            email,
            role,
            user_metadata: {
              full_name: email.split('@')[0] || 'Local Dev User',
              role,
              ...devUserMetadata,
            },
            app_metadata: {
              provider: 'local-dev',
              role,
              ...devAppMetadata,
            },
          };
        }
      }

      throw new UnauthorizedException(
        'Supabase auth is not configured. In local dev, sign in again or send x-dev-user-email header.'
      );
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

  private normalizeEmail(value?: string | null) {
    return String(value || '').trim().toLowerCase();
  }

  private normalizeRole(value?: string | null) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-');

    if (!normalized) {
      return '';
    }

    if (
      normalized === 'student' ||
      normalized === 'tutor' ||
      normalized === 'school' ||
      normalized === 'teacher' ||
      normalized === 'instructor' ||
      normalized === 'school-admin' ||
      normalized === 'school-owner'
    ) {
      return normalized;
    }

    return '';
  }

  private extractEmailFromBearerToken(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return '';
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length !== 3) {
      return '';
    }

    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;
      const email = this.normalizeEmail(
        typeof payload.email === 'string' ? payload.email : ''
      );
      return email && email.includes('@') ? email : '';
    } catch {
      return '';
    }
  }

  private extractRoleFromBearerToken(authHeader?: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return '';
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length !== 3) {
      return '';
    }

    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      const metadataRole =
        this.readString(payload.role) ||
        this.readString(payload.account_role) ||
        this.readString((payload.user_metadata as any)?.role) ||
        this.readString((payload.user_metadata as any)?.account_role) ||
        this.readString((payload.app_metadata as any)?.role);

      return this.normalizeRole(metadataRole);
    } catch {
      return '';
    }
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private parseOptionalMetadataJson(value?: string | null) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return {};
    }

    try {
      const parsed = JSON.parse(normalized) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}
