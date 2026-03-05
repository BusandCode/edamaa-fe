-- Adds multi-role account support and role-change approval workflow.
-- Safe to run multiple times on PostgreSQL/Supabase.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountRole') THEN
    CREATE TYPE "AccountRole" AS ENUM ('STUDENT', 'TUTOR', 'SCHOOL', 'ADMIN');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountRoleStatus') THEN
    CREATE TYPE "AccountRoleStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleChangeRequestStatus') THEN
    CREATE TYPE "RoleChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "UserRole" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "role" "AccountRole" NOT NULL,
  "status" "AccountRoleStatus" NOT NULL DEFAULT 'ACTIVE',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedAt" TIMESTAMP(3),
  "deactivatedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_publicId_key"
  ON "UserRole" ("publicId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserRole_userId_role_key"
  ON "UserRole" ("userId", "role");

CREATE INDEX IF NOT EXISTS "UserRole_userId_status_isDefault_idx"
  ON "UserRole" ("userId", "status", "isDefault");

CREATE INDEX IF NOT EXISTS "UserRole_role_status_createdAt_idx"
  ON "UserRole" ("role", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserRole_userId_fkey'
  ) THEN
    ALTER TABLE "UserRole"
      ADD CONSTRAINT "UserRole_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "RoleChangeRequest" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "targetRole" "AccountRole" NOT NULL,
  "status" "RoleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "requestPayload" JSONB,
  "reviewedByEmail" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoleChangeRequest_publicId_key"
  ON "RoleChangeRequest" ("publicId");

CREATE INDEX IF NOT EXISTS "RoleChangeRequest_userId_status_createdAt_idx"
  ON "RoleChangeRequest" ("userId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "RoleChangeRequest_targetRole_status_createdAt_idx"
  ON "RoleChangeRequest" ("targetRole", "status", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RoleChangeRequest_userId_fkey'
  ) THEN
    ALTER TABLE "RoleChangeRequest"
      ADD CONSTRAINT "RoleChangeRequest_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- Backfill one active default role row per user if none exists yet.
INSERT INTO "UserRole" (
  "publicId",
  "userId",
  "role",
  "status",
  "isDefault",
  "requestedAt",
  "activatedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  'ROLE-' || LPAD(u."id"::text, 4, '0') || '-' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 6),
  u."id",
  (
    CASE
      WHEN lower(coalesce(u."role", '')) IN ('tutor', 'teacher', 'instructor') THEN 'TUTOR'
      WHEN lower(coalesce(u."role", '')) IN ('school', 'school-admin', 'school-owner') THEN 'SCHOOL'
      WHEN lower(coalesce(u."role", '')) = 'admin' THEN 'ADMIN'
      ELSE 'STUDENT'
    END
  )::"AccountRole",
  'ACTIVE',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserRole" ur
  WHERE ur."userId" = u."id"
);

-- Ensure exactly one default role flag per user.
WITH ranked_roles AS (
  SELECT
    ur."id",
    ur."userId",
    ROW_NUMBER() OVER (
      PARTITION BY ur."userId"
      ORDER BY
        CASE WHEN ur."isDefault" THEN 0 ELSE 1 END,
        CASE WHEN ur."status" = 'ACTIVE' THEN 0 ELSE 1 END,
        ur."id" ASC
    ) AS rn
  FROM "UserRole" ur
)
UPDATE "UserRole" ur
SET "isDefault" = CASE WHEN ranked_roles.rn = 1 THEN true ELSE false END
FROM ranked_roles
WHERE ranked_roles."id" = ur."id";

-- Keep legacy User.role in sync with each user's default role.
UPDATE "User" u
SET "role" = CASE ur."role"
  WHEN 'STUDENT' THEN 'student'
  WHEN 'TUTOR' THEN 'tutor'
  WHEN 'SCHOOL' THEN 'school'
  WHEN 'ADMIN' THEN 'admin'
  ELSE 'student'
END
FROM "UserRole" ur
WHERE ur."userId" = u."id"
  AND ur."isDefault" = true;
