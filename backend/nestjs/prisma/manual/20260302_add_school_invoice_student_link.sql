-- Adds student-user linkage to school fee invoices for account-based targeting.
-- Safe to run multiple times on PostgreSQL/Supabase.

ALTER TABLE "SchoolFeeInvoice"
  ADD COLUMN IF NOT EXISTS "studentUserId" INTEGER;

CREATE INDEX IF NOT EXISTS "SchoolFeeInvoice_studentUserId_status_dueAt_idx"
  ON "SchoolFeeInvoice" ("studentUserId", "status", "dueAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolFeeInvoice_studentUserId_fkey'
  ) THEN
    ALTER TABLE "SchoolFeeInvoice"
      ADD CONSTRAINT "SchoolFeeInvoice_studentUserId_fkey"
      FOREIGN KEY ("studentUserId")
      REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
