CREATE TABLE IF NOT EXISTS "SchoolScheduleSession" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "schoolUserId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "instructor" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "expectedStudents" INTEGER NOT NULL DEFAULT 0,
  "roomCode" TEXT NOT NULL,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolScheduleSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SchoolScheduleSession_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "SchoolScheduleSession_schoolUserId_fkey" FOREIGN KEY ("schoolUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SchoolScheduleSession_schoolUserId_startAt_idx"
  ON "SchoolScheduleSession"("schoolUserId", "startAt");

CREATE INDEX IF NOT EXISTS "SchoolScheduleSession_schoolUserId_instructor_startAt_idx"
  ON "SchoolScheduleSession"("schoolUserId", "instructor", "startAt");

CREATE INDEX IF NOT EXISTS "SchoolScheduleSession_schoolUserId_roomCode_startAt_idx"
  ON "SchoolScheduleSession"("schoolUserId", "roomCode", "startAt");
