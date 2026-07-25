-- Tenant schedule timezone + skip diagnostics on autonomous schedules

ALTER TABLE "Tenant" ADD COLUMN "scheduleTimezone" TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE "AutonomousSchedule"
  ADD COLUMN "lastSkipReason" TEXT,
  ADD COLUMN "lastSkippedAt" TIMESTAMP(3);
