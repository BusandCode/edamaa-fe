import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  SubscriptionRole,
  SubscriptionStatus,
  type TeachingSubscription,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type TeachingActorApi = 'tutor' | 'school';
type TeachingSubscriptionStatusApi =
  | 'inactive'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled';

type CreateCheckoutInput = {
  actor?: string;
  successUrl?: string;
  cancelUrl?: string;
};

type SyncCheckoutInput = {
  actor?: string;
  sessionId?: string;
};

type TeachingSubscriptionStatusResponse = {
  actor: TeachingActorApi;
  status: TeachingSubscriptionStatusApi;
  isActive: boolean;
  isEdamaa3dVerified: boolean;
  planCode: string;
  currentPeriodEnd: string | null;
  currentPeriodEndLabel: string | null;
  features: {
    canTeachLive: boolean;
    canUseUnlimitedOfflineClasses: boolean;
    maxScheduledOfflineClasses: number;
  };
};

type CheckoutResponse = {
  actor: TeachingActorApi;
  checkoutUrl: string | null;
  sessionId: string;
  message: string;
};

const ACTOR_TO_ROLE: Record<TeachingActorApi, SubscriptionRole> = {
  tutor: SubscriptionRole.TUTOR,
  school: SubscriptionRole.SCHOOL,
};

const ROLE_TO_ACTOR: Record<SubscriptionRole, TeachingActorApi> = {
  [SubscriptionRole.TUTOR]: 'tutor',
  [SubscriptionRole.SCHOOL]: 'school',
};

const STATUS_FROM_PRISMA: Record<SubscriptionStatus, TeachingSubscriptionStatusApi> = {
  [SubscriptionStatus.INACTIVE]: 'inactive',
  [SubscriptionStatus.ACTIVE]: 'active',
  [SubscriptionStatus.TRIALING]: 'trialing',
  [SubscriptionStatus.PAST_DUE]: 'past_due',
  [SubscriptionStatus.CANCELED]: 'canceled',
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly prisma: PrismaService) {
    const stripeKey = (process.env.STRIPE_API_KEY || '').trim();
    const hasLiveStripeKey = Boolean(stripeKey) && !stripeKey.includes('placeholder');

    this.stripe = hasLiveStripeKey
      ? new Stripe(stripeKey, {
          apiVersion: '2022-11-15',
        })
      : null;
  }

  async getTeachingSubscriptionStatusForAuthUser(
    authUser: AuthUser,
    actorInput?: string
  ): Promise<TeachingSubscriptionStatusResponse> {
    const actor = this.normalizeActor(actorInput);
    const role = ACTOR_TO_ROLE[actor];
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const user = await this.resolveOrCreateUser(email, displayName);
    const row = await this.getOrCreateSubscriptionRow(user.id, role);
    const synced = await this.syncRowWithStripeIfAvailable(row);
    return this.mapSubscriptionToResponse(synced);
  }

  async createTeachingSubscriptionCheckoutForAuthUser(
    authUser: AuthUser,
    input: CreateCheckoutInput
  ): Promise<CheckoutResponse> {
    const stripe = this.requireStripeClient();
    const actor = this.normalizeActor(input.actor);
    const role = ACTOR_TO_ROLE[actor];
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const user = await this.resolveOrCreateUser(email, displayName);
    const existing = await this.getOrCreateSubscriptionRow(user.id, role);
    const priceId = this.resolveStripePriceId(actor);
    const appBaseUrl = this.resolveAppBaseUrl();
    const successUrl =
      this.normalizeHttpUrl(input.successUrl) ||
      `${appBaseUrl}/subscription?actor=${actor}&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      this.normalizeHttpUrl(input.cancelUrl) || `${appBaseUrl}/subscription?actor=${actor}&checkout=cancel`;

    const customerId =
      existing.stripeCustomerId ||
      (await this.resolveOrCreateStripeCustomer({
        stripe,
        email,
        displayName,
      }));

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        userId: String(user.id),
        userEmail: email,
        actor,
      },
      subscription_data: {
        metadata: {
          userId: String(user.id),
          userEmail: email,
          actor,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    });

    await this.prisma.teachingSubscription.update({
      where: { id: existing.id },
      data: {
        planCode: this.resolvePlanCode(actor),
        priceId,
        stripeCustomerId: customerId,
        checkoutSessionId: checkoutSession.id,
      },
    });

    return {
      actor,
      checkoutUrl: checkoutSession.url || null,
      sessionId: checkoutSession.id,
      message: checkoutSession.url
        ? 'Checkout created successfully.'
        : 'Checkout was created, but Stripe did not return a redirect URL.',
    };
  }

  async syncTeachingSubscriptionCheckoutForAuthUser(
    authUser: AuthUser,
    input: SyncCheckoutInput
  ): Promise<{
    subscription: TeachingSubscriptionStatusResponse;
    message: string;
  }> {
    const stripe = this.requireStripeClient();
    const sessionId = String(input.sessionId || '').trim();
    if (!sessionId) {
      throw new BadRequestException('Checkout session id is required');
    }

    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const user = await this.resolveOrCreateUser(email, displayName);
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (checkoutSession.mode !== 'subscription') {
      throw new BadRequestException('This checkout session is not a subscription session.');
    }

    const metadataUserId = String(checkoutSession.metadata?.userId || '').trim();
    const metadataEmail = this.normalizeEmail(String(checkoutSession.metadata?.userEmail || ''));
    const matchesUserId = metadataUserId && metadataUserId === String(user.id);
    const matchesEmail = metadataEmail && metadataEmail === email;
    if (!matchesUserId && !matchesEmail) {
      throw new UnauthorizedException(
        'This checkout session does not belong to the authenticated user.'
      );
    }

    const actor = this.normalizeActor(input.actor || checkoutSession.metadata?.actor || 'tutor');
    const role = ACTOR_TO_ROLE[actor];
    const row = await this.getOrCreateSubscriptionRow(user.id, role);
    const stripeSubscription = await this.resolveStripeSubscription(
      stripe,
      checkoutSession.subscription
    );

    if (!stripeSubscription) {
      throw new BadRequestException('Stripe subscription details are not available yet.');
    }

    const updated = await this.persistStripeSubscriptionState(row, stripeSubscription, {
      checkoutSessionId: checkoutSession.id,
      stripeCustomerId:
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer?.id || row.stripeCustomerId || undefined,
    });

    return {
      subscription: this.mapSubscriptionToResponse(updated),
      message: 'Subscription synced successfully.',
    };
  }

  private async getOrCreateSubscriptionRow(userId: number, role: SubscriptionRole) {
    const existing = await this.prisma.teachingSubscription.findUnique({
      where: {
        userId_role: {
          userId,
          role,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.teachingSubscription.create({
      data: {
        publicId: this.createSubscriptionPublicId(userId, role),
        userId,
        role,
        status: SubscriptionStatus.INACTIVE,
        planCode: this.resolvePlanCode(ROLE_TO_ACTOR[role]),
      },
    });
  }

  private async syncRowWithStripeIfAvailable(row: TeachingSubscription) {
    if (!this.stripe) {
      return row;
    }

    try {
      if (row.stripeSubscriptionId) {
        const stripeSubscription = await this.stripe.subscriptions.retrieve(row.stripeSubscriptionId);
        return this.persistStripeSubscriptionState(row, stripeSubscription);
      }

      if (row.checkoutSessionId) {
        const checkoutSession = await this.stripe.checkout.sessions.retrieve(row.checkoutSessionId, {
          expand: ['subscription'],
        });
        const stripeSubscription = await this.resolveStripeSubscription(
          this.stripe,
          checkoutSession.subscription
        );
        if (stripeSubscription) {
          return this.persistStripeSubscriptionState(row, stripeSubscription, {
            checkoutSessionId: checkoutSession.id,
            stripeCustomerId:
              typeof checkoutSession.customer === 'string'
                ? checkoutSession.customer
                : checkoutSession.customer?.id || row.stripeCustomerId || undefined,
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Subscription sync skipped (${(error as Error).message})`);
    }

    return row;
  }

  private async persistStripeSubscriptionState(
    row: TeachingSubscription,
    stripeSubscription: Stripe.Subscription,
    overrides?: {
      checkoutSessionId?: string;
      stripeCustomerId?: string;
    }
  ) {
    const status = this.mapStripeStatus(stripeSubscription.status);
    const currentPeriodStart = this.dateFromUnixSeconds(
      (stripeSubscription as any).current_period_start
    );
    const currentPeriodEnd = this.dateFromUnixSeconds((stripeSubscription as any).current_period_end);
    const shouldMarkVerified = status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;

    return this.prisma.teachingSubscription.update({
      where: { id: row.id },
      data: {
        status,
        stripeSubscriptionId: stripeSubscription.id || row.stripeSubscriptionId,
        stripeCustomerId:
          overrides?.stripeCustomerId ||
          (typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id) ||
          row.stripeCustomerId,
        checkoutSessionId: overrides?.checkoutSessionId || row.checkoutSessionId,
        currentPeriodStart: currentPeriodStart || row.currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd || row.currentPeriodEnd,
        verified3dAt: shouldMarkVerified ? row.verified3dAt || new Date() : null,
      },
    });
  }

  private async resolveStripeSubscription(
    stripe: Stripe,
    subscription: string | Stripe.Subscription | null
  ): Promise<Stripe.Subscription | null> {
    if (!subscription) {
      return null;
    }

    if (typeof subscription === 'string') {
      return stripe.subscriptions.retrieve(subscription);
    }

    return subscription;
  }

  private mapSubscriptionToResponse(row: TeachingSubscription): TeachingSubscriptionStatusResponse {
    const status = STATUS_FROM_PRISMA[row.status];
    const isActive = row.status === SubscriptionStatus.ACTIVE || row.status === SubscriptionStatus.TRIALING;
    const isEdamaa3dVerified = Boolean(row.verified3dAt && isActive);
    const currentPeriodEnd = row.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null;
    const currentPeriodEndLabel = row.currentPeriodEnd
      ? this.formatDateForUi(row.currentPeriodEnd)
      : null;

    return {
      actor: ROLE_TO_ACTOR[row.role],
      status,
      isActive,
      isEdamaa3dVerified,
      planCode: row.planCode,
      currentPeriodEnd,
      currentPeriodEndLabel,
      features: {
        canTeachLive: isActive,
        canUseUnlimitedOfflineClasses: isActive,
        maxScheduledOfflineClasses: isActive ? 9999 : 1,
      },
    };
  }

  private requireStripeClient() {
    if (!this.stripe) {
      throw new BadRequestException(
        'Subscriptions are not configured yet. Set STRIPE_API_KEY on the backend.'
      );
    }

    return this.stripe;
  }

  private resolveStripePriceId(actor: TeachingActorApi) {
    const rolePriceId =
      actor === 'tutor'
        ? process.env.STRIPE_TUTOR_SUBSCRIPTION_PRICE_ID
        : process.env.STRIPE_SCHOOL_SUBSCRIPTION_PRICE_ID;
    const priceId = String(
      rolePriceId || process.env.STRIPE_TEACHING_SUBSCRIPTION_PRICE_ID || ''
    ).trim();

    if (!priceId) {
      throw new BadRequestException(
        'Subscription pricing is not configured yet. Add STRIPE_TUTOR_SUBSCRIPTION_PRICE_ID or STRIPE_SCHOOL_SUBSCRIPTION_PRICE_ID.'
      );
    }

    return priceId;
  }

  private resolvePlanCode(actor: TeachingActorApi) {
    return actor === 'tutor' ? 'edamaa-tutor-pro' : 'edamaa-school-pro';
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    if (status === 'active') {
      return SubscriptionStatus.ACTIVE;
    }

    if (status === 'trialing') {
      return SubscriptionStatus.TRIALING;
    }

    if (status === 'past_due' || status === 'unpaid' || status === 'incomplete_expired') {
      return SubscriptionStatus.PAST_DUE;
    }

    if (status === 'canceled') {
      return SubscriptionStatus.CANCELED;
    }

    return SubscriptionStatus.INACTIVE;
  }

  private dateFromUnixSeconds(value: unknown) {
    const unixSeconds = Number(value);
    if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
      return null;
    }

    return new Date(unixSeconds * 1000);
  }

  private normalizeActor(value: string | undefined): TeachingActorApi {
    const normalized = String(value || 'tutor').trim().toLowerCase();
    if (normalized === 'school') {
      return 'school';
    }

    if (normalized === 'tutor') {
      return 'tutor';
    }

    throw new BadRequestException('Actor must be "tutor" or "school".');
  }

  private requireEmail(authUser: AuthUser) {
    const email = this.normalizeEmail(authUser.email || '');
    if (!email || !email.includes('@')) {
      throw new UnauthorizedException('Authenticated user email is required');
    }
    return email;
  }

  private normalizeDisplayName(name: string | null | undefined, email: string) {
    const normalized = String(name || '').trim();
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

  private normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
  }

  private async resolveOrCreateUser(email: string, displayName: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: displayName,
      },
    });
  }

  private async resolveOrCreateStripeCustomer(input: {
    stripe: Stripe;
    email: string;
    displayName: string;
  }) {
    const existing = await input.stripe.customers.list({
      email: input.email,
      limit: 1,
    });

    const existingCustomer = existing.data[0];
    if (existingCustomer?.id) {
      return existingCustomer.id;
    }

    const createdCustomer = await input.stripe.customers.create({
      email: input.email,
      name: input.displayName,
    });
    return createdCustomer.id;
  }

  private createSubscriptionPublicId(userId: number, role: SubscriptionRole) {
    const roleCode = role === SubscriptionRole.SCHOOL ? 'SCH' : 'TUT';
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `SUB-${roleCode}-${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }

  private formatDateForUi(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private normalizeHttpUrl(urlValue: string | undefined) {
    const value = String(urlValue || '').trim();
    if (!value) {
      return '';
    }

    return /^https?:\/\//i.test(value) ? value : '';
  }

  private resolveAppBaseUrl() {
    const envBase =
      this.normalizeHttpUrl(process.env.PAYMENTS_APP_BASE_URL) ||
      this.normalizeHttpUrl(process.env.FRONTEND_APP_URL);
    return (envBase || 'http://127.0.0.1:5173').replace(/\/+$/, '');
  }
}
