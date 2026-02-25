import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PaymentsService } from './payments.service';

type AddPaymentMethodBody = {
  type?: string;
  label?: string;
  last4?: string;
  isDefault?: boolean;
};

type CreateStripeMethodSetupIntentBody = {
  label?: string;
  isDefault?: boolean;
};

type ConfirmStripePaymentMethodBody = {
  setupIntentId?: string;
  label?: string;
  isDefault?: boolean;
};

type PayTransactionBody = {
  successUrl?: string;
  cancelUrl?: string;
  paymentMethodId?: string;
};

@UseGuards(SupabaseAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me/dashboard')
  getDashboard(@Req() request: Request) {
    return this.paymentsService.getDashboardForAuthUser(this.getAuthUser(request));
  }

  @Post('me/methods')
  addMethod(@Req() request: Request, @Body() body: AddPaymentMethodBody) {
    return this.paymentsService.addMethodForAuthUser(this.getAuthUser(request), body);
  }

  @Post('me/methods/setup-intent')
  createMethodSetupIntent(@Req() request: Request, @Body() body: CreateStripeMethodSetupIntentBody) {
    return this.paymentsService.createStripeMethodSetupIntentForAuthUser(this.getAuthUser(request), {
      label: body.label,
      isDefault: body.isDefault,
    });
  }

  @Post('me/methods/stripe/confirm')
  confirmStripeMethod(@Req() request: Request, @Body() body: ConfirmStripePaymentMethodBody) {
    return this.paymentsService.confirmStripeMethodForAuthUser(this.getAuthUser(request), {
      setupIntentId: body.setupIntentId,
      label: body.label,
      isDefault: body.isDefault,
    });
  }

  @Post('me/transactions/:transactionId/pay')
  payTransaction(
    @Req() request: Request,
    @Param('transactionId') transactionId: string,
    @Body() body: PayTransactionBody
  ) {
    return this.paymentsService.payTransactionForAuthUser(this.getAuthUser(request), {
      transactionId,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      paymentMethodId: body.paymentMethodId,
    });
  }

  @Get('me/transactions/:transactionId/receipt')
  getReceipt(@Req() request: Request, @Param('transactionId') transactionId: string) {
    return this.paymentsService.getReceiptForAuthUser(this.getAuthUser(request), transactionId);
  }

  private getAuthUser(request: Request) {
    const authUser = ((request as any).user || null) as
      | {
          id?: string | null;
          email?: string | null;
          user_metadata?: Record<string, unknown> | null;
        }
      | null;

    return {
      id: authUser?.id ?? null,
      email: authUser?.email ?? null,
      name:
        (typeof authUser?.user_metadata?.full_name === 'string' &&
          (authUser?.user_metadata?.full_name as string).trim()) ||
        null,
    };
  }
}
