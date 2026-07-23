-- Orchestration plan: cron, priority, conditions, orchestrationMode
CREATE TYPE "OrchestrationMode" AS ENUM ('fixed', 'meta_dynamic');

ALTER TABLE "AutonomousSchedule" ADD COLUMN "orchestrationMode" "OrchestrationMode" NOT NULL DEFAULT 'fixed';
ALTER TABLE "AutonomousSchedule" ADD COLUMN "cronExpr" TEXT;
ALTER TABLE "AutonomousSchedule" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AutonomousSchedule" ADD COLUMN "conditions" JSONB;

UPDATE "AutonomousSchedule"
SET "orchestrationMode" = 'meta_dynamic'
WHERE "scheduleKind" = 'meta';
