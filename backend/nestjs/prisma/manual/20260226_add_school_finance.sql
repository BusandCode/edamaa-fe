-- Adds school fee management, wallet, and withdrawal domain tables.
-- Safe to run on PostgreSQL/Supabase when Prisma migrations are not used.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolFeeInvoiceStatus') THEN
    CREATE TYPE "SchoolFeeInvoiceStatus" AS ENUM (
      'DRAFT',
      'PENDING',
      'PARTIALLY_PAID',
      'PAID',
      'OVERDUE',
      'CANCELED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolFeePaymentStatus') THEN
    CREATE TYPE "SchoolFeePaymentStatus" AS ENUM (
      'PENDING',
      'SETTLED',
      'FAILED',
      'REFUNDED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SchoolPayoutStatus') THEN
    CREATE TYPE "SchoolPayoutStatus" AS ENUM (
      'REQUESTED',
      'PROCESSING',
      'PAID',
      'FAILED',
      'CANCELED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolFinanceAccount" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "schoolUserId" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "pendingMinor" INTEGER NOT NULL DEFAULT 0,
  "availableMinor" INTEGER NOT NULL DEFAULT 0,
  "onHoldMinor" INTEGER NOT NULL DEFAULT 0,
  "lifetimeGrossMinor" INTEGER NOT NULL DEFAULT 0,
  "lifetimeNetMinor" INTEGER NOT NULL DEFAULT 0,
  "totalWithdrawnMinor" INTEGER NOT NULL DEFAULT 0,
  "stripeConnectedAccountId" TEXT,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFinanceAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFinanceAccount_publicId_key"
  ON "SchoolFinanceAccount" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFinanceAccount_schoolUserId_key"
  ON "SchoolFinanceAccount" ("schoolUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFinanceAccount_schoolUserId_fkey'
  ) THEN
    ALTER TABLE "SchoolFinanceAccount"
      ADD CONSTRAINT "SchoolFinanceAccount_schoolUserId_fkey"
      FOREIGN KEY ("schoolUserId")
      REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolPayoutLedgerEntry" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "payoutId" INTEGER NOT NULL,
  "previousStatus" "SchoolPayoutStatus",
  "nextStatus" "SchoolPayoutStatus" NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolPayoutLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolPayoutLedgerEntry_publicId_key"
  ON "SchoolPayoutLedgerEntry" ("publicId");

CREATE INDEX IF NOT EXISTS "SchoolPayoutLedgerEntry_accountId_createdAt_idx"
  ON "SchoolPayoutLedgerEntry" ("accountId", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolPayoutLedgerEntry_payoutId_createdAt_idx"
  ON "SchoolPayoutLedgerEntry" ("payoutId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolPayoutLedgerEntry_accountId_fkey'
  ) THEN
    ALTER TABLE "SchoolPayoutLedgerEntry"
      ADD CONSTRAINT "SchoolPayoutLedgerEntry_accountId_fkey"
      FOREIGN KEY ("accountId")
      REFERENCES "SchoolFinanceAccount"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolPayoutLedgerEntry_payoutId_fkey'
  ) THEN
    ALTER TABLE "SchoolPayoutLedgerEntry"
      ADD CONSTRAINT "SchoolPayoutLedgerEntry_payoutId_fkey"
      FOREIGN KEY ("payoutId")
      REFERENCES "SchoolPayout"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolFeePlan" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "dueDays" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFeePlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeePlan_publicId_key"
  ON "SchoolFeePlan" ("publicId");

CREATE INDEX IF NOT EXISTS "SchoolFeePlan_accountId_isActive_createdAt_idx"
  ON "SchoolFeePlan" ("accountId", "isActive", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeePlan_accountId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeePlan"
      ADD CONSTRAINT "SchoolFeePlan_accountId_fkey"
      FOREIGN KEY ("accountId")
      REFERENCES "SchoolFinanceAccount"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolFeeInvoice" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "planId" INTEGER,
  "studentEmail" TEXT NOT NULL,
  "studentName" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "SchoolFeeInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "stripeCheckoutSessionId" TEXT,
  "stripePaymentIntentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFeeInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeInvoice_publicId_key"
  ON "SchoolFeeInvoice" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeInvoice_stripeCheckoutSessionId_key"
  ON "SchoolFeeInvoice" ("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "SchoolFeeInvoice_accountId_status_createdAt_idx"
  ON "SchoolFeeInvoice" ("accountId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolFeeInvoice_studentEmail_status_dueAt_idx"
  ON "SchoolFeeInvoice" ("studentEmail", "status", "dueAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeeInvoice_accountId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeeInvoice"
      ADD CONSTRAINT "SchoolFeeInvoice_accountId_fkey"
      FOREIGN KEY ("accountId")
      REFERENCES "SchoolFinanceAccount"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeeInvoice_planId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeeInvoice"
      ADD CONSTRAINT "SchoolFeeInvoice_planId_fkey"
      FOREIGN KEY ("planId")
      REFERENCES "SchoolFeePlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolFeePayment" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "payerUserId" INTEGER,
  "payerEmail" TEXT NOT NULL,
  "grossAmountMinor" INTEGER NOT NULL,
  "platformFeeMinor" INTEGER NOT NULL DEFAULT 0,
  "processingFeeMinor" INTEGER NOT NULL DEFAULT 0,
  "netAmountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "provider" "PaymentProvider" NOT NULL DEFAULT 'LOCAL',
  "providerReference" TEXT,
  "status" "SchoolFeePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "settledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolFeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeePayment_publicId_key"
  ON "SchoolFeePayment" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeePayment_providerReference_key"
  ON "SchoolFeePayment" ("providerReference");

CREATE INDEX IF NOT EXISTS "SchoolFeePayment_accountId_status_createdAt_idx"
  ON "SchoolFeePayment" ("accountId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolFeePayment_invoiceId_status_createdAt_idx"
  ON "SchoolFeePayment" ("invoiceId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeePayment_accountId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeePayment"
      ADD CONSTRAINT "SchoolFeePayment_accountId_fkey"
      FOREIGN KEY ("accountId")
      REFERENCES "SchoolFinanceAccount"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeePayment_invoiceId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeePayment"
      ADD CONSTRAINT "SchoolFeePayment_invoiceId_fkey"
      FOREIGN KEY ("invoiceId")
      REFERENCES "SchoolFeeInvoice"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeePayment_payerUserId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeePayment"
      ADD CONSTRAINT "SchoolFeePayment_payerUserId_fkey"
      FOREIGN KEY ("payerUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolPayout" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "SchoolPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
  "provider" "PaymentProvider" NOT NULL DEFAULT 'LOCAL',
  "providerReference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolPayout_publicId_key"
  ON "SchoolPayout" ("publicId");

CREATE INDEX IF NOT EXISTS "SchoolPayout_accountId_status_createdAt_idx"
  ON "SchoolPayout" ("accountId", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolPayout_accountId_fkey'
  ) THEN
    ALTER TABLE "SchoolPayout"
      ADD CONSTRAINT "SchoolPayout_accountId_fkey"
      FOREIGN KEY ("accountId")
      REFERENCES "SchoolFinanceAccount"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
