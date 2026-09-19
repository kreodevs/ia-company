-- Oleada 4: durable run events + unified checkpoints

CREATE TABLE "ExecutionRunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRunEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutionRunEvent_runId_createdAt_idx" ON "ExecutionRunEvent"("runId", "createdAt");
CREATE INDEX "ExecutionRunEvent_tenantId_createdAt_idx" ON "ExecutionRunEvent"("tenantId", "createdAt");

ALTER TABLE "ExecutionRunEvent" ADD CONSTRAINT "ExecutionRunEvent_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "RunCheckpointKind" AS ENUM ('approval', 'veto', 'go_no_go', 'opencode', 'custom');
CREATE TYPE "RunCheckpointStatus" AS ENUM ('pending', 'resolved', 'expired');

CREATE TABLE "RunCheckpoint" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "tenantId" TEXT,
    "kind" "RunCheckpointKind" NOT NULL,
    "status" "RunCheckpointStatus" NOT NULL DEFAULT 'pending',
    "title" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "resolution" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RunCheckpoint_runId_status_idx" ON "RunCheckpoint"("runId", "status");
CREATE INDEX "RunCheckpoint_tenantId_status_idx" ON "RunCheckpoint"("tenantId", "status");

ALTER TABLE "RunCheckpoint" ADD CONSTRAINT "RunCheckpoint_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
