import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PaymentCategory,
  PaymentMethodType,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

type AuthUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type PaymentStatusApi = 'paid' | 'pending' | 'overdue' | 'upcoming';
type PaymentCategoryApi = 'tuition' | 'accommodation' | 'fees' | 'materials';
type PaymentMethodTypeApi = 'card' | 'bank';

type PaymentMethodItem = {
  id: string;
  type: PaymentMethodTypeApi;
  label: string;
  last4: string;
  isDefault: boolean;
};

type PaymentTransactionItem = {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: PaymentStatusApi;
  category: PaymentCategoryApi;
  receipt?: string;
};

type PaymentSummary = {
  totalPaid: number;
  totalPending: number;
  totalUpcoming: number;
  overdueCount: number;
};

type PaymentDashboardResponse = {
  generatedAt: string;
  summary: PaymentSummary;
  methods: PaymentMethodItem[];
  payments: PaymentTransactionItem[];
  dataQuality: {
    degraded: boolean;
    source: 'prisma' | 'memory';
  };
};

type AddPaymentMethodInput = {
  type?: string;
  label?: string;
  last4?: string;
  isDefault?: boolean;
};

type CreateStripeMethodSetupIntentInput = {
  label?: string;
  isDefault?: boolean;
};

type ConfirmStripeMethodInput = {
  setupIntentId?: string;
  label?: string;
  isDefault?: boolean;
};

type PayTransactionInput = {
  transactionId: string;
  successUrl?: string;
  cancelUrl?: string;
  paymentMethodId?: string;
};

type PayTransactionResponse = {
  mode: 'checkout' | 'settled';
  checkoutUrl?: string | null;
  transaction: PaymentTransactionItem;
  message: string;
  dataQuality: {
    degraded: boolean;
    source: 'prisma' | 'memory';
  };
};

type ReceiptResponse = {
  transactionId: string;
  receiptNumber: string;
  fileName: string;
  content: string;
  generatedAt: string;
  dataQuality: {
    degraded: boolean;
    source: 'prisma' | 'memory';
  };
};

type StripeMethodSetupIntentResponse = {
  setupIntentId: string;
  clientSecret: string;
  publishableKey: string;
  customerId: string;
};

type MemoryLedger = {
  methods: PaymentMethodItem[];
  payments: PaymentTransactionItem[];
};

const STATUS_FROM_PRISMA: Record<PaymentStatus, PaymentStatusApi> = {
  [PaymentStatus.PAID]: 'paid',
  [PaymentStatus.PENDING]: 'pending',
  [PaymentStatus.OVERDUE]: 'overdue',
  [PaymentStatus.UPCOMING]: 'upcoming',
};

const CATEGORY_FROM_PRISMA: Record<PaymentCategory, PaymentCategoryApi> = {
  [PaymentCategory.TUITION]: 'tuition',
  [PaymentCategory.ACCOMMODATION]: 'accommodation',
  [PaymentCategory.FEES]: 'fees',
  [PaymentCategory.MATERIALS]: 'materials',
};

const STATUS_TO_PRISMA: Record<PaymentStatusApi, PaymentStatus> = {
  paid: PaymentStatus.PAID,
  pending: PaymentStatus.PENDING,
  overdue: PaymentStatus.OVERDUE,
  upcoming: PaymentStatus.UPCOMING,
};

const CATEGORY_TO_PRISMA: Record<PaymentCategoryApi, PaymentCategory> = {
  tuition: PaymentCategory.TUITION,
  accommodation: PaymentCategory.ACCOMMODATION,
  fees: PaymentCategory.FEES,
  materials: PaymentCategory.MATERIALS,
};

const METHOD_FROM_PRISMA: Record<PaymentMethodType, PaymentMethodTypeApi> = {
  [PaymentMethodType.CARD]: 'card',
  [PaymentMethodType.BANK]: 'bank',
};

const METHOD_TO_PRISMA: Record<PaymentMethodTypeApi, PaymentMethodType> = {
  card: PaymentMethodType.CARD,
  bank: PaymentMethodType.BANK,
};

type SeedPayment = {
  description: string;
  amount: number;
  dayOffset: number;
  status: PaymentStatusApi;
  category: PaymentCategoryApi;
};

const SEED_PAYMENTS: SeedPayment[] = [
  { description: 'First Semester Tuition', amount: 450000, dayOffset: -180, status: 'paid', category: 'tuition' },
  {
    description: 'Accommodation Fee (Session 1)',
    amount: 180000,
    dayOffset: -176,
    status: 'paid',
    category: 'accommodation',
  },
  { description: 'Student Union Dues', amount: 15000, dayOffset: -160, status: 'paid', category: 'fees' },
  {
    description: 'Lab Materials - Chemistry',
    amount: 32000,
    dayOffset: -145,
    status: 'paid',
    category: 'materials',
  },
  { description: 'Library Access Fee', amount: 8000, dayOffset: -130, status: 'paid', category: 'fees' },
  { description: 'Second Semester Tuition', amount: 450000, dayOffset: 4, status: 'pending', category: 'tuition' },
  {
    description: 'Accommodation Fee (Session 2)',
    amount: 180000,
    dayOffset: -12,
    status: 'overdue',
    category: 'accommodation',
  },
  { description: 'Examination Registration', amount: 25000, dayOffset: 15, status: 'upcoming', category: 'fees' },
  {
    description: 'Lab Materials - Physics',
    amount: 28000,
    dayOffset: 21,
    status: 'upcoming',
    category: 'materials',
  },
];

const SEED_METHODS: Array<{
  type: PaymentMethodTypeApi;
  label: string;
  last4: string;
  isDefault: boolean;
}> = [
  { type: 'card', label: 'Visa ending', last4: '4291', isDefault: true },
  { type: 'bank', label: 'GTBank A/c', last4: '7823', isDefault: false },
  { type: 'card', label: 'Mastercard', last4: '0047', isDefault: false },
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly memoryLedgerByEmail = new Map<string, MemoryLedger>();
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

  async getDashboardForAuthUser(authUser: AuthUser): Promise<PaymentDashboardResponse> {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);

    try {
      return await this.getDashboardFromPrisma(email, displayName);
    } catch (error) {
      this.logger.warn(`Falling back to memory dashboard (${(error as Error).message})`);
      return this.getDashboardFromMemory(email);
    }
  }

  async addMethodForAuthUser(
    authUser: AuthUser,
    input: AddPaymentMethodInput
  ): Promise<{
    method: PaymentMethodItem;
    methods: PaymentMethodItem[];
    dataQuality: {
      degraded: boolean;
      source: 'prisma' | 'memory';
    };
  }> {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const type = this.normalizeMethodType(input.type);
    const label = String(input.label || '').trim();
    const last4 = this.normalizeLast4(input.last4);

    if (!label) {
      throw new BadRequestException('Payment method label is required');
    }

    try {
      const created = await this.addMethodInPrisma(email, displayName, {
        type,
        label,
        last4,
        isDefault: Boolean(input.isDefault),
      });
      return {
        ...created,
        dataQuality: {
          degraded: false,
          source: 'prisma',
        },
      };
    } catch (error) {
      this.logger.warn(`Falling back to memory method add (${(error as Error).message})`);
      const created = this.addMethodInMemory(email, {
        type,
        label,
        last4,
        isDefault: Boolean(input.isDefault),
      });
      return {
        ...created,
        dataQuality: {
          degraded: true,
          source: 'memory',
        },
      };
    }
  }

  async createStripeMethodSetupIntentForAuthUser(
    authUser: AuthUser,
    input: CreateStripeMethodSetupIntentInput
  ): Promise<StripeMethodSetupIntentResponse> {
    const stripe = this.requireStripeClient();
    const publishableKey = this.resolveStripePublishableKey();
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const userIdForMetadata = await this.resolveUserIdForStripeMetadata(email, displayName);

    const customerId = await this.resolveOrCreateStripeCustomer({
      stripe,
      email,
      displayName,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        userId: String(userIdForMetadata),
        userEmail: email,
        preferredLabel: String(input.label || '').trim(),
        preferredDefault: input.isDefault ? '1' : '0',
      },
    });

    if (!setupIntent.client_secret) {
      throw new BadRequestException('Could not initialize secure card setup. Please try again.');
    }

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      publishableKey,
      customerId,
    };
  }

  async confirmStripeMethodForAuthUser(
    authUser: AuthUser,
    input: ConfirmStripeMethodInput
  ): Promise<{
    method: PaymentMethodItem;
    methods: PaymentMethodItem[];
    dataQuality: {
      degraded: boolean;
      source: 'prisma' | 'memory';
    };
  }> {
    const stripe = this.requireStripeClient();
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const setupIntentId = String(input.setupIntentId || '').trim();

    if (!setupIntentId) {
      throw new BadRequestException('Setup intent id is required');
    }

    let userId: number | null = null;
    try {
      const user = await this.resolveOrCreateUser(email, displayName);
      await this.ensureSeedDataForUser(user.id);
      userId = user.id;
    } catch (error) {
      // Keep card setup available in local/dev even without a database.
      this.logger.warn(`Falling back to memory card save (${(error as Error).message})`);
    }

    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    });

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestException('Card setup is not completed yet. Please finish card verification.');
    }

    const metadataUserId = String(setupIntent.metadata?.userId || '').trim();
    const metadataEmail = this.normalizeEmail(String(setupIntent.metadata?.userEmail || ''));
    const isOwnerByUserId = userId ? metadataUserId === String(userId) : false;
    const isOwnerByEmail = metadataEmail && metadataEmail === email;
    if (!isOwnerByUserId && !isOwnerByEmail) {
      throw new UnauthorizedException('This card setup does not belong to the authenticated user.');
    }

    const paymentMethod = await this.resolveStripePaymentMethod(stripe, setupIntent.payment_method);
    const cardDetails = paymentMethod.card;
    if (!cardDetails?.last4) {
      throw new BadRequestException('We could not read card details from Stripe.');
    }

    const normalizedBrand = this.normalizeStripeCardBrand(cardDetails.brand);
    const titleBrand = this.toTitleCase(normalizedBrand);
    const defaultLabel = /card$/i.test(titleBrand) ? titleBrand : `${titleBrand} card`;
    const label = String(input.label || '').trim() || defaultLabel;

    if (userId) {
      try {
        const created = await this.addOrUpdateStripeMethodInPrisma({
          userId,
          label,
          last4: cardDetails.last4,
          providerReference: paymentMethod.id,
          isDefault: Boolean(input.isDefault),
        });

        return {
          ...created,
          dataQuality: {
            degraded: false,
            source: 'prisma',
          },
        };
      } catch (error) {
        this.logger.warn(`Falling back to memory card save (${(error as Error).message})`);
      }
    }

    const created = this.addMethodInMemory(email, {
      type: 'card',
      label,
      last4: cardDetails.last4,
      isDefault: Boolean(input.isDefault),
    });

    return {
      ...created,
      dataQuality: {
        degraded: true,
        source: 'memory',
      },
    };
  }

  async payTransactionForAuthUser(
    authUser: AuthUser,
    input: PayTransactionInput
  ): Promise<PayTransactionResponse> {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const transactionId = String(input.transactionId || '').trim();

    if (!transactionId) {
      throw new BadRequestException('Transaction id is required');
    }

    try {
      const response = await this.payTransactionInPrisma(email, displayName, {
        ...input,
        transactionId,
      });
      return {
        ...response,
        dataQuality: {
          degraded: false,
          source: 'prisma',
        },
      };
    } catch (error) {
      this.logger.warn(`Falling back to memory payment flow (${(error as Error).message})`);
      const response = this.payTransactionInMemory(email, transactionId);
      return {
        ...response,
        dataQuality: {
          degraded: true,
          source: 'memory',
        },
      };
    }
  }

  async getReceiptForAuthUser(authUser: AuthUser, transactionId: string): Promise<ReceiptResponse> {
    const email = this.requireEmail(authUser);
    const displayName = this.normalizeDisplayName(authUser.name, email);
    const normalizedTransactionId = String(transactionId || '').trim();

    if (!normalizedTransactionId) {
      throw new BadRequestException('Transaction id is required');
    }

    try {
      const receipt = await this.getReceiptFromPrisma(email, displayName, normalizedTransactionId);
      return {
        ...receipt,
        dataQuality: {
          degraded: false,
          source: 'prisma',
        },
      };
    } catch (error) {
      this.logger.warn(`Falling back to memory receipt (${(error as Error).message})`);
      const receipt = this.getReceiptFromMemory(email, normalizedTransactionId);
      return {
        ...receipt,
        dataQuality: {
          degraded: true,
          source: 'memory',
        },
      };
    }
  }

  private async getDashboardFromPrisma(email: string, displayName: string): Promise<PaymentDashboardResponse> {
    const user = await this.resolveOrCreateUser(email, displayName);
    await this.ensureSeedDataForUser(user.id);

    const [methods, transactions] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.paymentTransaction.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    const mappedMethods = methods.map((method) => this.mapMethodFromPrisma(method));
    const mappedTransactions = transactions.map((transaction) => this.mapTransactionFromPrisma(transaction));

    return {
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(mappedTransactions),
      methods: mappedMethods,
      payments: mappedTransactions,
      dataQuality: {
        degraded: false,
        source: 'prisma',
      },
    };
  }

  private getDashboardFromMemory(email: string): PaymentDashboardResponse {
    const ledger = this.getOrCreateMemoryLedger(email);
    return {
      generatedAt: new Date().toISOString(),
      summary: this.buildSummary(ledger.payments),
      methods: [...ledger.methods],
      payments: [...ledger.payments],
      dataQuality: {
        degraded: true,
        source: 'memory',
      },
    };
  }

  private async addMethodInPrisma(
    email: string,
    displayName: string,
    input: {
      type: PaymentMethodTypeApi;
      label: string;
      last4: string;
      isDefault: boolean;
    }
  ) {
    const user = await this.resolveOrCreateUser(email, displayName);
    await this.ensureSeedDataForUser(user.id);

    const existingCount = await this.prisma.paymentMethod.count({ where: { userId: user.id } });
    const shouldSetDefault = input.isDefault || existingCount === 0;

    if (shouldSetDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await this.prisma.paymentMethod.create({
      data: {
        publicId: this.createRuntimePublicId('M', user.id),
        userId: user.id,
        type: METHOD_TO_PRISMA[input.type],
        label: input.label,
        last4: input.last4,
        isDefault: shouldSetDefault,
        provider: PaymentProvider.LOCAL,
      },
    });

    const methods = await this.prisma.paymentMethod.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      method: this.mapMethodFromPrisma(created),
      methods: methods.map((method) => this.mapMethodFromPrisma(method)),
    };
  }

  private async addOrUpdateStripeMethodInPrisma(input: {
    userId: number;
    label: string;
    last4: string;
    providerReference: string;
    isDefault: boolean;
  }) {
    const [existingMethod, methodCount] = await Promise.all([
      this.prisma.paymentMethod.findFirst({
        where: {
          userId: input.userId,
          provider: PaymentProvider.STRIPE,
          providerReference: input.providerReference,
        },
      }),
      this.prisma.paymentMethod.count({ where: { userId: input.userId } }),
    ]);

    const shouldSetDefault =
      input.isDefault || methodCount === 0 || Boolean(existingMethod?.isDefault);

    if (shouldSetDefault) {
      await this.prisma.paymentMethod.updateMany({
        where: { userId: input.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const method = existingMethod
      ? await this.prisma.paymentMethod.update({
          where: { id: existingMethod.id },
          data: {
            type: PaymentMethodType.CARD,
            label: input.label,
            last4: input.last4,
            isDefault: shouldSetDefault,
            provider: PaymentProvider.STRIPE,
            providerReference: input.providerReference,
          },
        })
      : await this.prisma.paymentMethod.create({
          data: {
            publicId: this.createRuntimePublicId('M', input.userId),
            userId: input.userId,
            type: PaymentMethodType.CARD,
            label: input.label,
            last4: input.last4,
            isDefault: shouldSetDefault,
            provider: PaymentProvider.STRIPE,
            providerReference: input.providerReference,
          },
        });

    const methods = await this.prisma.paymentMethod.findMany({
      where: { userId: input.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      method: this.mapMethodFromPrisma(method),
      methods: methods.map((mappedMethod) => this.mapMethodFromPrisma(mappedMethod)),
    };
  }

  private async resolveStripePaymentMethod(
    stripe: Stripe,
    paymentMethod: string | Stripe.PaymentMethod | null
  ): Promise<Stripe.PaymentMethod> {
    if (!paymentMethod) {
      throw new BadRequestException('Setup intent has no payment method attached.');
    }

    if (typeof paymentMethod === 'string') {
      return stripe.paymentMethods.retrieve(paymentMethod);
    }

    return paymentMethod;
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

  private addMethodInMemory(
    email: string,
    input: {
      type: PaymentMethodTypeApi;
      label: string;
      last4: string;
      isDefault: boolean;
    }
  ) {
    const ledger = this.getOrCreateMemoryLedger(email);
    const shouldSetDefault = input.isDefault || ledger.methods.length === 0;

    if (shouldSetDefault) {
      ledger.methods = ledger.methods.map((method) => ({
        ...method,
        isDefault: false,
      }));
    }

    const method: PaymentMethodItem = {
      id: `M-LCL-${ledger.methods.length + 1}`,
      type: input.type,
      label: input.label,
      last4: input.last4,
      isDefault: shouldSetDefault,
    };

    ledger.methods = [...ledger.methods, method];
    return {
      method,
      methods: [...ledger.methods],
    };
  }

  private async payTransactionInPrisma(
    email: string,
    displayName: string,
    input: PayTransactionInput
  ): Promise<Omit<PayTransactionResponse, 'dataQuality'>> {
    const user = await this.resolveOrCreateUser(email, displayName);
    await this.ensureSeedDataForUser(user.id);

    if (input.paymentMethodId) {
      const method = await this.prisma.paymentMethod.findFirst({
        where: {
          userId: user.id,
          publicId: input.paymentMethodId,
        },
      });

      if (!method) {
        throw new BadRequestException('Selected payment method was not found');
      }
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        userId: user.id,
        publicId: input.transactionId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status === PaymentStatus.PAID) {
      return {
        mode: 'settled',
        checkoutUrl: null,
        transaction: this.mapTransactionFromPrisma(transaction),
        message: 'This transaction is already marked as paid.',
      };
    }

    if (this.stripe) {
      const appBaseUrl = this.resolveAppBaseUrl();
      const successUrl =
        this.normalizeHttpUrl(input.successUrl) ||
        `${appBaseUrl}/payments?checkout=success&paymentId=${encodeURIComponent(transaction.publicId)}`;
      const cancelUrl =
        this.normalizeHttpUrl(input.cancelUrl) ||
        `${appBaseUrl}/payments?checkout=cancel&paymentId=${encodeURIComponent(transaction.publicId)}`;

      const checkoutSession = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          transactionPublicId: transaction.publicId,
          userId: String(user.id),
          userEmail: email,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: transaction.currency.toLowerCase(),
              unit_amount: transaction.amountMinor,
              product_data: {
                name: transaction.description,
              },
            },
          },
        ],
      });

      const updated = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          provider: PaymentProvider.STRIPE,
          providerReference: checkoutSession.id,
        },
      });

      return {
        mode: 'checkout',
        checkoutUrl: checkoutSession.url || null,
        transaction: this.mapTransactionFromPrisma(updated),
        message: checkoutSession.url
          ? 'Checkout session created successfully.'
          : 'Checkout created, but no redirect URL was returned.',
      };
    }

    const settled = await this.markPrismaTransactionAsPaid(transaction.id);
    return {
      mode: 'settled',
      checkoutUrl: null,
      transaction: this.mapTransactionFromPrisma(settled),
      message: 'Payment marked as paid in local mode.',
    };
  }

  private payTransactionInMemory(
    email: string,
    transactionId: string
  ): Omit<PayTransactionResponse, 'dataQuality'> {
    const ledger = this.getOrCreateMemoryLedger(email);
    const index = ledger.payments.findIndex((payment) => payment.id === transactionId);

    if (index < 0) {
      throw new NotFoundException('Payment transaction not found');
    }

    const existing = ledger.payments[index];
    if (existing.status === 'paid') {
      return {
        mode: 'settled',
        checkoutUrl: null,
        transaction: existing,
        message: 'This transaction is already marked as paid.',
      };
    }

    const settled: PaymentTransactionItem = {
      ...existing,
      status: 'paid',
      date: this.formatDateForUi(new Date()),
      receipt: existing.receipt || this.createReceiptRef(existing.id, new Date()),
    };

    ledger.payments[index] = settled;

    return {
      mode: 'settled',
      checkoutUrl: null,
      transaction: settled,
      message: 'Payment marked as paid in local mode.',
    };
  }

  private async getReceiptFromPrisma(
    email: string,
    displayName: string,
    transactionId: string
  ): Promise<Omit<ReceiptResponse, 'dataQuality'>> {
    const user = await this.resolveOrCreateUser(email, displayName);
    await this.ensureSeedDataForUser(user.id);

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        userId: user.id,
        publicId: transactionId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Receipt is available once the payment is completed');
    }

    const receiptRef = transaction.receiptRef || this.createReceiptRef(transaction.publicId, transaction.paidAt || new Date());
    if (!transaction.receiptRef) {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { receiptRef },
      });
    }

    const content = this.buildReceiptText({
      receiptRef,
      transactionId: transaction.publicId,
      studentEmail: email,
      description: transaction.description,
      category: CATEGORY_FROM_PRISMA[transaction.category],
      amountNaira: this.toNaira(transaction.amountMinor),
      paidAt: transaction.paidAt || transaction.updatedAt || new Date(),
      currency: transaction.currency,
    });

    return {
      transactionId: transaction.publicId,
      receiptNumber: receiptRef,
      fileName: `${receiptRef}.txt`,
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  private getReceiptFromMemory(email: string, transactionId: string): Omit<ReceiptResponse, 'dataQuality'> {
    const ledger = this.getOrCreateMemoryLedger(email);
    const transaction = ledger.payments.find((payment) => payment.id === transactionId);

    if (!transaction) {
      throw new NotFoundException('Payment transaction not found');
    }

    if (transaction.status !== 'paid') {
      throw new BadRequestException('Receipt is available once the payment is completed');
    }

    const paidAt = new Date();
    const receiptRef = transaction.receipt || this.createReceiptRef(transaction.id, paidAt);
    const content = this.buildReceiptText({
      receiptRef,
      transactionId: transaction.id,
      studentEmail: email,
      description: transaction.description,
      category: transaction.category,
      amountNaira: transaction.amount,
      paidAt,
      currency: 'NGN',
    });

    return {
      transactionId: transaction.id,
      receiptNumber: receiptRef,
      fileName: `${receiptRef}.txt`,
      content,
      generatedAt: new Date().toISOString(),
    };
  }

  private async ensureSeedDataForUser(userId: number) {
    const [methodCount, paymentCount] = await Promise.all([
      this.prisma.paymentMethod.count({ where: { userId } }),
      this.prisma.paymentTransaction.count({ where: { userId } }),
    ]);

    if (methodCount === 0) {
      await this.prisma.paymentMethod.createMany({
        data: SEED_METHODS.map((method, index) => ({
          publicId: this.createSeedPublicId('M', userId, index + 1),
          userId,
          type: METHOD_TO_PRISMA[method.type],
          label: method.label,
          last4: method.last4,
          isDefault: method.isDefault,
          provider: PaymentProvider.LOCAL,
        })),
      });
    }

    if (paymentCount === 0) {
      const now = new Date();
      await this.prisma.paymentTransaction.createMany({
        data: SEED_PAYMENTS.map((payment, index) => {
          const txDate = this.addDays(now, payment.dayOffset);
          const isPaid = payment.status === 'paid';
          const receiptRef = isPaid
            ? this.createReceiptRef(this.createSeedPublicId('P', userId, index + 1), txDate)
            : null;

          return {
            publicId: this.createSeedPublicId('P', userId, index + 1),
            userId,
            description: payment.description,
            amountMinor: payment.amount * 100,
            currency: 'NGN',
            status: STATUS_TO_PRISMA[payment.status],
            category: CATEGORY_TO_PRISMA[payment.category],
            dueAt: txDate,
            paidAt: isPaid ? txDate : null,
            receiptRef,
            provider: PaymentProvider.LOCAL,
          };
        }),
      });
    }
  }

  private getOrCreateMemoryLedger(email: string): MemoryLedger {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = this.memoryLedgerByEmail.get(normalizedEmail);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const methods: PaymentMethodItem[] = SEED_METHODS.map((method, index) => ({
      id: `M-LCL-${index + 1}`,
      type: method.type,
      label: method.label,
      last4: method.last4,
      isDefault: method.isDefault,
    }));

    const payments: PaymentTransactionItem[] = SEED_PAYMENTS.map((payment, index) => {
      const txDate = this.addDays(now, payment.dayOffset);
      const id = `P-LCL-${index + 1}`;
      return {
        id,
        description: payment.description,
        amount: payment.amount,
        date: this.formatDateForUi(txDate),
        status: payment.status,
        category: payment.category,
        receipt: payment.status === 'paid' ? this.createReceiptRef(id, txDate) : undefined,
      };
    });

    const ledger: MemoryLedger = { methods, payments };
    this.memoryLedgerByEmail.set(normalizedEmail, ledger);
    return ledger;
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
        role: 'student',
      },
    });
  }

  private async resolveUserIdForStripeMetadata(email: string, displayName: string) {
    try {
      const user = await this.resolveOrCreateUser(email, displayName);
      await this.ensureSeedDataForUser(user.id);
      return user.id;
    } catch (error) {
      this.logger.warn(`Falling back to local runtime user for Stripe metadata (${(error as Error).message})`);
      return this.createLocalRuntimeUserId(email);
    }
  }

  private mapMethodFromPrisma(method: {
    publicId: string;
    type: PaymentMethodType;
    label: string;
    last4: string;
    isDefault: boolean;
  }): PaymentMethodItem {
    return {
      id: method.publicId,
      type: METHOD_FROM_PRISMA[method.type],
      label: method.label,
      last4: method.last4,
      isDefault: method.isDefault,
    };
  }

  private mapTransactionFromPrisma(transaction: {
    publicId: string;
    description: string;
    amountMinor: number;
    dueAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    status: PaymentStatus;
    category: PaymentCategory;
    receiptRef: string | null;
  }): PaymentTransactionItem {
    const effectiveDate = transaction.paidAt || transaction.dueAt || transaction.createdAt;
    return {
      id: transaction.publicId,
      description: transaction.description,
      amount: this.toNaira(transaction.amountMinor),
      date: this.formatDateForUi(effectiveDate),
      status: STATUS_FROM_PRISMA[transaction.status],
      category: CATEGORY_FROM_PRISMA[transaction.category],
      receipt: transaction.receiptRef || undefined,
    };
  }

  private async markPrismaTransactionAsPaid(transactionDbId: number) {
    const paidAt = new Date();
    const current = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionDbId },
    });

    if (!current) {
      throw new NotFoundException('Payment transaction not found');
    }

    const receiptRef = current.receiptRef || this.createReceiptRef(current.publicId, paidAt);

    return this.prisma.paymentTransaction.update({
      where: { id: transactionDbId },
      data: {
        status: PaymentStatus.PAID,
        paidAt,
        receiptRef,
        provider: this.stripe ? PaymentProvider.STRIPE : PaymentProvider.LOCAL,
      },
    });
  }

  private buildSummary(payments: PaymentTransactionItem[]): PaymentSummary {
    return {
      totalPaid: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
      totalPending: payments
        .filter((payment) => payment.status === 'pending' || payment.status === 'overdue')
        .reduce((sum, payment) => sum + payment.amount, 0),
      totalUpcoming: payments
        .filter((payment) => payment.status === 'upcoming')
        .reduce((sum, payment) => sum + payment.amount, 0),
      overdueCount: payments.filter((payment) => payment.status === 'overdue').length,
    };
  }

  private buildReceiptText(input: {
    receiptRef: string;
    transactionId: string;
    studentEmail: string;
    description: string;
    category: PaymentCategoryApi;
    amountNaira: number;
    currency: string;
    paidAt: Date;
  }) {
    return [
      'EDAMAA PAYMENT RECEIPT',
      '======================',
      `Receipt No: ${input.receiptRef}`,
      `Transaction ID: ${input.transactionId}`,
      `Student Email: ${input.studentEmail}`,
      `Description: ${input.description}`,
      `Category: ${this.toTitleCase(input.category)}`,
      `Amount: ₦${input.amountNaira.toLocaleString()} (${input.currency})`,
      `Paid At: ${input.paidAt.toLocaleString()}`,
      '',
      'Status: PAID',
      '',
      'Thank you for your payment.',
      'Edamaa Billing Service',
    ].join('\n');
  }

  private normalizeMethodType(value: string | undefined): PaymentMethodTypeApi {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'card' || normalized === 'bank') {
      return normalized;
    }
    throw new BadRequestException('Method type must be "card" or "bank"');
  }

  private normalizeLast4(value: string | undefined) {
    const digitsOnly = String(value || '')
      .replace(/\D+/g, '')
      .slice(-4);

    if (digitsOnly.length !== 4) {
      throw new BadRequestException('Payment method requires a valid last 4 digits');
    }

    return digitsOnly;
  }

  private requireStripeClient() {
    if (!this.stripe) {
      throw new BadRequestException(
        'Card setup is not available yet. Set STRIPE_API_KEY on the backend and retry.'
      );
    }

    return this.stripe;
  }

  private resolveStripePublishableKey() {
    const publishableKey = String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
    if (!publishableKey) {
      throw new BadRequestException(
        'Card setup is not configured yet. Set STRIPE_PUBLISHABLE_KEY on the backend.'
      );
    }

    return publishableKey;
  }

  private normalizeStripeCardBrand(brand: string | null | undefined) {
    const normalized = String(brand || '').trim().toLowerCase();
    if (!normalized || normalized === 'unknown') {
      return 'card';
    }

    if (normalized === 'mastercard') {
      return 'mastercard';
    }

    if (normalized === 'visa') {
      return 'visa';
    }

    if (normalized === 'verve') {
      return 'verve';
    }

    return normalized;
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

    const emailPrefix = email.split('@')[0] || 'Student';
    return emailPrefix
      .split(/[._-]+/g)
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }

  private normalizeEmail(value: string) {
    return String(value || '').trim().toLowerCase();
  }

  private createLocalRuntimeUserId(email: string) {
    const normalized = this.normalizeEmail(email);
    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }

    const fallback = Math.abs(hash);
    return fallback > 0 ? fallback : 1;
  }

  private createSeedPublicId(prefix: 'M' | 'P', userId: number, sequence: number) {
    return `${prefix}${String(userId).padStart(4, '0')}-${String(sequence).padStart(3, '0')}`;
  }

  private createRuntimePublicId(prefix: 'M' | 'P', userId: number) {
    const stamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 900 + 100).toString();
    return `${prefix}${String(userId).padStart(4, '0')}-${stamp}${random}`;
  }

  private createReceiptRef(paymentId: string, date: Date) {
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `RCP-${stamp}-${paymentId}`;
  }

  private formatDateForUi(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private toNaira(amountMinor: number) {
    return Math.round(amountMinor / 100);
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
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

  private toTitleCase(value: string) {
    return value
      .split(/[\s_-]+/g)
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ');
  }
}
