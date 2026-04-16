import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type ParticipantRole = 'teacher' | 'student' | 'assistant';

type ResolveSessionInput = {
  sessionId?: string;
  title?: string;
  participantRole?: string;
};

type CloudflareApiEnvelope<T> = {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  data?: T;
};

type CreateMeetingResponseData = {
  id?: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: string | null;
};

type AddParticipantResponseData = {
  id?: string;
  token?: string;
  authToken?: string;
  custom_participant_id?: string;
  name?: string | null;
};

class CloudflareRealtimeKitApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly providerCode?: number
  ) {
    super(message);
  }
}

@Injectable()
export class CloudflareRealtimeKitService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus() {
    const config = this.getConfig();
    return {
      provider: 'cloudflare-realtimekit',
      configured: config.configured,
      accountIdConfigured: Boolean(config.accountId),
      appIdConfigured: Boolean(config.appId),
      apiTokenConfigured: Boolean(config.apiToken),
      presets: {
        teacher: config.teacherPresetName,
        student: config.studentPresetName,
        assistant: config.assistantPresetName,
      },
    };
  }

  async getMeetingMapping(sessionId: string) {
    const normalizedSessionId = this.normalizeSessionId(sessionId);
    const meeting = await this.prisma.cloudflareRealtimeKitMeeting.findUnique({
      where: { sessionPublicId: normalizedSessionId },
    });

    return {
      sessionId: normalizedSessionId,
      exists: Boolean(meeting),
      meeting: meeting
        ? {
            publicId: meeting.publicId,
            sessionId: meeting.sessionPublicId,
            providerMeetingId: meeting.providerMeetingId,
            title: meeting.title,
            createdAt: meeting.createdAt,
            updatedAt: meeting.updatedAt,
          }
        : null,
    };
  }

  async resolveSessionForAuthUser(authUser: AuthUser, input: ResolveSessionInput) {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const sessionId = this.normalizeSessionId(input.sessionId);
    const participantRole = this.normalizeParticipantRole(input.participantRole);
    const requestedTitle = this.normalizeOptionalText(input.title) || this.buildDefaultMeetingTitle(sessionId);
    const presetName = this.resolvePresetName(participantRole);
    const customParticipantId = this.buildCustomParticipantId(authUser, participantRole);

    let meeting = await this.prisma.cloudflareRealtimeKitMeeting.findUnique({
      where: { sessionPublicId: sessionId },
    });

    if (!meeting) {
      const createdMeeting = await this.createMeeting(requestedTitle);
      meeting = await this.prisma.cloudflareRealtimeKitMeeting.create({
        data: {
          publicId: this.createMeetingPublicId(),
          sessionPublicId: sessionId,
          providerMeetingId: createdMeeting.id,
          title: createdMeeting.title || requestedTitle,
          createdByEmail: email,
          metadata: {
            provider: 'cloudflare-realtimekit',
          },
        },
      });
    }

    let participant;
    try {
      participant = await this.addParticipant(meeting.providerMeetingId, {
        name: displayName,
        presetName,
        customParticipantId,
      });
    } catch (error) {
      if (error instanceof CloudflareRealtimeKitApiError && error.statusCode === 404) {
        const recreatedMeeting = await this.createMeeting(meeting.title || requestedTitle);
        meeting = await this.prisma.cloudflareRealtimeKitMeeting.update({
          where: { id: meeting.id },
          data: {
            providerMeetingId: recreatedMeeting.id,
            title: recreatedMeeting.title || meeting.title || requestedTitle,
            metadata: {
              provider: 'cloudflare-realtimekit',
              recreatedAt: new Date().toISOString(),
            },
          },
        });

        participant = await this.addParticipant(meeting.providerMeetingId, {
          name: displayName,
          presetName,
          customParticipantId,
        });
      } else {
        throw error;
      }
    }

    return {
      provider: 'cloudflare-realtimekit',
      sessionId,
      meetingId: meeting.providerMeetingId,
      title: meeting.title,
      participant: {
        id: participant.id,
        token: participant.token,
        customParticipantId,
        name: displayName,
        presetName,
        role: participantRole,
      },
      mapping: {
        publicId: meeting.publicId,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
      },
    };
  }

  private getConfig() {
    const accountId = this.normalizeOptionalText(process.env.CLOUDFLARE_ACCOUNT_ID);
    const appId = this.normalizeOptionalText(process.env.CLOUDFLARE_REALTIMEKIT_APP_ID);
    const apiToken =
      this.normalizeOptionalText(process.env.CLOUDFLARE_REALTIMEKIT_API_TOKEN) ||
      this.normalizeOptionalText(process.env.CLOUDFLARE_API_TOKEN);
    const teacherPresetName =
      this.normalizeOptionalText(process.env.CLOUDFLARE_REALTIMEKIT_TEACHER_PRESET_NAME) ||
      'webinar-host';
    const studentPresetName =
      this.normalizeOptionalText(process.env.CLOUDFLARE_REALTIMEKIT_STUDENT_PRESET_NAME) ||
      'webinar-participant';
    const assistantPresetName =
      this.normalizeOptionalText(process.env.CLOUDFLARE_REALTIMEKIT_ASSISTANT_PRESET_NAME) ||
      'group-call-host';

    return {
      accountId,
      appId,
      apiToken,
      teacherPresetName,
      studentPresetName,
      assistantPresetName,
      configured: Boolean(accountId && appId && apiToken),
    };
  }

  private requireConfig() {
    const config = this.getConfig();
    if (!config.configured) {
      throw new BadRequestException(
        'Cloudflare RealtimeKit is not configured. Add CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_REALTIMEKIT_APP_ID, and CLOUDFLARE_REALTIMEKIT_API_TOKEN.'
      );
    }

    return config;
  }

  private async createMeeting(title: string) {
    const payload = await this.requestCloudflare<CloudflareApiEnvelope<CreateMeetingResponseData>>('/meetings', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });

    const meetingId = this.normalizeOptionalText(payload.data?.id);
    if (!meetingId) {
      throw new InternalServerErrorException('Cloudflare RealtimeKit did not return a meeting id.');
    }

    return {
      id: meetingId,
      title: this.normalizeOptionalText(payload.data?.title) || title,
    };
  }

  private async addParticipant(
    meetingId: string,
    input: { name: string; presetName: string; customParticipantId: string }
  ) {
    const payload = await this.requestCloudflare<CloudflareApiEnvelope<AddParticipantResponseData>>(
      `/meetings/${encodeURIComponent(meetingId)}/participants`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          preset_name: input.presetName,
          custom_participant_id: input.customParticipantId,
        }),
      }
    );

    const participantId = this.normalizeOptionalText(payload.data?.id);
    const token =
      this.normalizeOptionalText(payload.data?.token) ||
      this.normalizeOptionalText(payload.data?.authToken);

    if (!participantId || !token) {
      throw new InternalServerErrorException(
        'Cloudflare RealtimeKit did not return the participant credentials needed to join.'
      );
    }

    return {
      id: participantId,
      token,
    };
  }

  private async requestCloudflare<T>(path: string, init: RequestInit) {
    const config = this.requireConfig();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/realtime/kit/${config.appId}${path}`,
      {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiToken}`,
          ...(init.headers || {}),
        },
      }
    );

    const payload = (await response.json().catch(() => null)) as
      | (CloudflareApiEnvelope<unknown> & Record<string, unknown>)
      | null;

    if (!response.ok || payload?.success === false) {
      const firstError = Array.isArray(payload?.errors) ? payload?.errors[0] : null;
      throw new CloudflareRealtimeKitApiError(
        this.normalizeOptionalText(firstError?.message) ||
          `Cloudflare RealtimeKit request failed with status ${response.status}.`,
        response.status,
        typeof firstError?.code === 'number' ? firstError.code : undefined
      );
    }

    return payload as T;
  }

  private resolvePresetName(role: ParticipantRole) {
    const config = this.requireConfig();
    if (role === 'teacher') {
      return config.teacherPresetName;
    }
    if (role === 'assistant') {
      return config.assistantPresetName;
    }
    return config.studentPresetName;
  }

  private normalizeParticipantRole(value: string | undefined): ParticipantRole {
    const normalized = String(value || 'student').trim().toLowerCase();
    if (normalized === 'teacher' || normalized === 'host') {
      return 'teacher';
    }
    if (normalized === 'assistant' || normalized === 'ta') {
      return 'assistant';
    }
    return 'student';
  }

  private normalizeSessionId(value: string | undefined) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      throw new BadRequestException('Session ID is required.');
    }
    if (normalized.length > 190) {
      throw new BadRequestException('Session ID is too long.');
    }
    return normalized;
  }

  private normalizeOptionalText(value: unknown) {
    const normalized = String(value || '').trim();
    return normalized || '';
  }

  private requireEmail(authUser: AuthUser) {
    const email = this.normalizeOptionalText(authUser.email).toLowerCase();
    if (!email || !email.includes('@')) {
      throw new UnauthorizedException('Authenticated user email is required to join a Cloudflare live session.');
    }
    return email;
  }

  private normalizeDisplayName(name: string | null | undefined, email: string) {
    const normalized = this.normalizeOptionalText(name);
    if (normalized) {
      return normalized;
    }

    const emailPrefix = email.split('@')[0] || 'Edamaa User';
    return emailPrefix
      .split(/[._-]+/g)
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }

  private buildDefaultMeetingTitle(sessionId: string) {
    return `Edamaa Live Session ${sessionId}`;
  }

  private buildCustomParticipantId(authUser: AuthUser, participantRole: ParticipantRole) {
    const stableSeed = this.normalizeOptionalText(authUser.id) || this.normalizeOptionalText(authUser.email);
    const digest = createHash('sha256').update(stableSeed).digest('hex').slice(0, 24);
    return `${participantRole}-${digest}`;
  }

  private createMeetingPublicId() {
    return `cfm_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  }
}
