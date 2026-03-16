-- Persists school invoice notification read state per student email.
-- Safe to run multiple times on PostgreSQL/Supabase.

CREATE TABLE IF NOT EXISTS "SchoolFeeInvoiceNotificationRead" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL,
  "invoicePublicId" TEXT,
  "userEmail" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "readAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeInvoiceNotificationRead_publicId_key"
  ON "SchoolFeeInvoiceNotificationRead" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolFeeInvoiceNotificationRead_userEmail_notificationId_key"
  ON "SchoolFeeInvoiceNotificationRead" ("userEmail", "notificationId");

CREATE INDEX IF NOT EXISTS "SchoolFeeInvoiceNotificationRead_invoicePublicId_createdAt_idx"
  ON "SchoolFeeInvoiceNotificationRead" ("invoicePublicId", "createdAt");

CREATE INDEX IF NOT EXISTS "SchoolFeeInvoiceNotificationRead_userEmail_createdAt_idx"
  ON "SchoolFeeInvoiceNotificationRead" ("userEmail", "createdAt");
