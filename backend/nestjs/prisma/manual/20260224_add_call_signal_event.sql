-- Adds persistent storage for realtime call signaling analytics.
-- Safe to run once on PostgreSQL/Supabase.

CREATE TABLE IF NOT EXISTS "CallSignalEvent" (
  "id" SERIAL NOT NULL,
  "eventId" TEXT,
  "channel" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "callId" TEXT,
  "studentId" INTEGER,
  "senderRole" TEXT,
  "senderLabel" TEXT,
  "mode" TEXT,
  "reason" TEXT,
  "durationSeconds" INTEGER,
  "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CallSignalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CallSignalEvent_eventId_key"
  ON "CallSignalEvent" ("eventId");

CREATE INDEX IF NOT EXISTS "CallSignalEvent_channel_event_createdAt_idx"
  ON "CallSignalEvent" ("channel", "event", "createdAt");

CREATE INDEX IF NOT EXISTS "CallSignalEvent_studentId_createdAt_idx"
  ON "CallSignalEvent" ("studentId", "createdAt");

CREATE INDEX IF NOT EXISTS "CallSignalEvent_callId_createdAt_idx"
  ON "CallSignalEvent" ("callId", "createdAt");
