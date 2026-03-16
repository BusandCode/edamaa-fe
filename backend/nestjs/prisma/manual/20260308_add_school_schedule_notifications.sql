-- Persists school schedule notifications and read state per account.
-- Safe for repeated execution.

CREATE TABLE IF NOT EXISTS "SchoolScheduleNotification" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL UNIQUE,
  "schoolUserId" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "sessionPublicId" TEXT NOT NULL,
  "sessionTitle" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "instructor" TEXT NOT NULL,
  "roomCode" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "assignedTutorEmail" TEXT,
  "department" TEXT,
  "classGroup" TEXT,
  "audienceTag" TEXT,
  "targetEmail" TEXT,
  "tutorJoinLink" TEXT,
  "tutorJoinCode" TEXT,
  "tutorJoinToken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SchoolScheduleNotification_schoolUserId_createdAt_idx"
  ON "SchoolScheduleNotification" ("schoolUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "SchoolScheduleNotification_targetEmail_createdAt_idx"
  ON "SchoolScheduleNotification" ("targetEmail", "createdAt");
CREATE INDEX IF NOT EXISTS "SchoolScheduleNotification_kind_createdAt_idx"
  ON "SchoolScheduleNotification" ("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "SchoolScheduleNotification_sessionPublicId_createdAt_idx"
  ON "SchoolScheduleNotification" ("sessionPublicId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolScheduleNotification_schoolUserId_fkey'
  ) THEN
    ALTER TABLE "SchoolScheduleNotification"
      ADD CONSTRAINT "SchoolScheduleNotification_schoolUserId_fkey"
      FOREIGN KEY ("schoolUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SchoolScheduleNotificationRead" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL UNIQUE,
  "notificationId" INTEGER NOT NULL,
  "userEmail" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolScheduleNotificationRead_userEmail_notificationId_key"
  ON "SchoolScheduleNotificationRead" ("userEmail", "notificationId");
CREATE INDEX IF NOT EXISTS "SchoolScheduleNotificationRead_userEmail_createdAt_idx"
  ON "SchoolScheduleNotificationRead" ("userEmail", "createdAt");
CREATE INDEX IF NOT EXISTS "SchoolScheduleNotificationRead_notificationId_createdAt_idx"
  ON "SchoolScheduleNotificationRead" ("notificationId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SchoolScheduleNotificationRead_notificationId_fkey'
  ) THEN
    ALTER TABLE "SchoolScheduleNotificationRead"
      ADD CONSTRAINT "SchoolScheduleNotificationRead_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "SchoolScheduleNotification"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
