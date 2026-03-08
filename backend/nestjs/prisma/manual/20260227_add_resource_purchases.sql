-- Persist paid resource unlocks so students keep access after backend restarts.
-- Safe to run manually on PostgreSQL/Supabase when Prisma migrations are not used.

CREATE TABLE IF NOT EXISTS "ResourcePurchase" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "buyerEmail" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL DEFAULT 0,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResourcePurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResourcePurchase_publicId_key"
  ON "ResourcePurchase" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "ResourcePurchase_resourceId_buyerEmail_key"
  ON "ResourcePurchase" ("resourceId", "buyerEmail");

CREATE INDEX IF NOT EXISTS "ResourcePurchase_buyerEmail_purchasedAt_idx"
  ON "ResourcePurchase" ("buyerEmail", "purchasedAt");

CREATE INDEX IF NOT EXISTS "ResourcePurchase_resourceId_purchasedAt_idx"
  ON "ResourcePurchase" ("resourceId", "purchasedAt");
