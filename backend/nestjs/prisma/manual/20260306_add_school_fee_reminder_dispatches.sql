-- Adds reminder dispatch audit rows for school-fee due-soon/overdue notifications.
-- Safe to run multiple times on PostgreSQL/Supabase.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SchoolFeeReminderType'
  ) THEN
    CREATE TYPE "SchoolFeeReminderType" AS ENUM ('DUE_SOON', 'OVERDUE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SchoolFeeReminderChannel'
  ) THEN
    CREATE TYPE "SchoolFeeReminderChannel" AS ENUM ('IN_APP', 'EMAIL');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SchoolFeeReminderDispatchStatus'
  ) THEN
    CREATE TYPE "SchoolFeeReminderDispatchStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "SchoolFeeReminderDispatch" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "invoicePublicId" TEXT NOT NULL,
  "accountId" INTEGER NOT NULL,
  "studentEmail" TEXT NOT NULL,
  "reminderType" "SchoolFeeReminderType" NOT NULL,
  "channel" "SchoolFeeReminderChannel" NOT NULL,
  "status" "SchoolFeeReminderDispatchStatus" NOT NULL DEFAULT 'QUEUED',
  "reminderDate" TIMESTAMPTZ NOT NULL,
  "sentAt" TIMESTAMPTZ,
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_publicId_key"
  ON "SchoolFeeReminderDispatch" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_invoice_student_type_channel_date_key"
  ON "SchoolFeeReminderDispatch" ("invoiceId", "studentEmail", "reminderType", "channel", "reminderDate");

CREATE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_accountId_createdAt_idx"
  ON "SchoolFeeReminderDispatch" ("accountId", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_studentEmail_createdAt_idx"
  ON "SchoolFeeReminderDispatch" ("studentEmail", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_channel_status_createdAt_idx"
  ON "SchoolFeeReminderDispatch" ("channel", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeeReminderDispatch_invoiceId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeeReminderDispatch"
      ADD CONSTRAINT "SchoolFeeReminderDispatch_invoiceId_fkey"
      FOREIGN KEY ("invoiceId")
      REFERENCES "SchoolFeeInvoice"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
