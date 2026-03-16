import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AccountRolesService } from './account-roles.service';

type RequestRoleChangeBody = {
  targetRole?: string;
  note?: string;
  payload?: unknown;
};

type SwitchRoleBody = {
  role?: string;
};

type DeactivateRoleBody = {
  role?: string;
};

type ApproveRoleRequestBody = {
  makeDefault?: boolean;
  note?: string;
};

type RejectRoleRequestBody = {
  reason?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('account/roles')
export class AccountRolesController {
  constructor(private readonly accountRolesService: AccountRolesService) {}

  @Get('me')
  getMyRoles(@Req() request: Request) {
    return this.accountRolesService.getMyRoles(this.getAuthUser(request));
  }

  @Post('request')
  requestRoleChange(@Req() request: Request, @Body() body: RequestRoleChangeBody) {
    return this.accountRolesService.requestRoleChange(this.getAuthUser(request), {
      targetRole: body.targetRole,
      note: body.note,
      payload: body.payload,
    });
  }

  @Post('switch')
  switchRole(@Req() request: Request, @Body() body: SwitchRoleBody) {
    return this.accountRolesService.switchDefaultRole(this.getAuthUser(request), {
      role: body.role,
    });
  }

  @Post('deactivate')
  deactivateRole(@Req() request: Request, @Body() body: DeactivateRoleBody) {
    return this.accountRolesService.deactivateRole(this.getAuthUser(request), {
      role: body.role,
    });
  }

  @Get('requests')
  listRequests(@Req() request: Request, @Query('status') status: string | undefined) {
    return this.accountRolesService.listRoleRequestsForAdmin(this.getAuthUser(request), status);
  }

  @Post('requests/:requestId/approve')
  approveRequest(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: ApproveRoleRequestBody
  ) {
    return this.accountRolesService.approveRoleRequest(this.getAuthUser(request), requestId, {
      makeDefault: body.makeDefault,
      note: body.note,
    });
  }

  @Post('requests/:requestId/reject')
  rejectRequest(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: RejectRoleRequestBody
  ) {
    return this.accountRolesService.rejectRoleRequest(this.getAuthUser(request), requestId, {
      reason: body.reason,
    });
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

    const roleCandidates = [
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
      roleCandidates.find(
        (candidate) => typeof candidate === 'string' && candidate.trim().length > 0
      ) || null;

    return {
      id: authUser?.id ?? null,
      email: authUser?.email ?? null,
      role: resolvedRole,
      app_metadata: authUser?.app_metadata ?? null,
      user_metadata: authUser?.user_metadata ?? null,
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
