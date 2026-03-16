-- Adds retry/backoff columns for queued school-fee reminder emails.
-- Safe to run multiple times on PostgreSQL/Supabase.

ALTER TABLE "SchoolFeeReminderDispatch"
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- Existing FAILED rows were already attempted at least once.
UPDATE "SchoolFeeReminderDispatch"
SET "attemptCount" = 1
WHERE "status" = 'FAILED'
  AND COALESCE("attemptCount", 0) = 0;

UPDATE "SchoolFeeReminderDispatch"
SET "lastError" = "failureReason"
WHERE "lastError" IS NULL
  AND "failureReason" IS NOT NULL
  AND btrim("failureReason") <> '';

CREATE INDEX IF NOT EXISTS "SchoolFeeReminderDispatch_channel_status_nextRetryAt_createdAt_idx"
  ON "SchoolFeeReminderDispatch" ("channel", "status", "nextRetryAt", "createdAt");
