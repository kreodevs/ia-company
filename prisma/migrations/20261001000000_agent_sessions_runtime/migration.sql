-- Fase 0 (paperclip reingeniería, camino B): runtime de sesiones multi-turno.
-- ExecutionRun pasa a ser contenedor de AgentSession (workflowId opcional, engine).

-- 1. ExecutionRun: workflowId opcional + discriminador de engine
CREATE TYPE "RunEngine" AS ENUM ('dag', 'session');

ALTER TABLE "ExecutionRun" ALTER COLUMN "workflowId" DROP NOT NULL;
ALTER TABLE "ExecutionRun" ADD COLUMN "engine" "RunEngine" NOT NULL DEFAULT 'dag';

-- 2. Checkpoints HITL de sesión
ALTER TABLE "RunCheckpoint" ADD COLUMN "sessionId" TEXT;
ALTER TYPE "RunCheckpointKind" ADD VALUE 'need_input';
ALTER TYPE "RunCheckpointKind" ADD VALUE 'tool_approval';
ALTER TYPE "RunCheckpointKind" ADD VALUE 'budget_exceeded';

CREATE INDEX "RunCheckpoint_sessionId_status_idx" ON "RunCheckpoint"("sessionId", "status");

-- 3. Sesiones de agente
CREATE TYPE "AgentSessionStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'AWAITING_INPUT',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'BUDGET_EXCEEDED'
);

CREATE TYPE "SessionToolCallStatus" AS ENUM ('ok', 'error', 'denied', 'awaiting_approval');

CREATE TABLE "AgentSession" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "tenantId" TEXT,
  "agentId" TEXT NOT NULL,
  "status" "AgentSessionStatus" NOT NULL DEFAULT 'PENDING',
  "role" TEXT NOT NULL DEFAULT '',
  "goal" TEXT NOT NULL,
  "acceptanceCriteria" JSONB NOT NULL DEFAULT '[]',
  "workspacePath" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "maxTurns" INTEGER NOT NULL DEFAULT 25,
  "currentTurn" INTEGER NOT NULL DEFAULT 0,
  "budgetTokens" INTEGER,
  "budgetUsd" DOUBLE PRECISION,
  "spentTokens" INTEGER NOT NULL DEFAULT 0,
  "spentCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "summary" TEXT,
  "lastError" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentSession_runId_idx" ON "AgentSession"("runId");
CREATE INDEX "AgentSession_tenantId_status_idx" ON "AgentSession"("tenantId", "status");
CREATE INDEX "AgentSession_agentId_status_idx" ON "AgentSession"("agentId", "status");

CREATE TABLE "SessionTurn" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnNo" INTEGER NOT NULL,
  "input" TEXT NOT NULL,
  "output" TEXT,
  "tokens" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),

  CONSTRAINT "SessionTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SessionTurn_sessionId_turnNo_key" ON "SessionTurn"("sessionId", "turnNo");

CREATE TABLE "SessionToolCall" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "turnId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "argsJson" JSONB NOT NULL DEFAULT '{}',
  "resultJson" JSONB,
  "exitCode" INTEGER,
  "durationMs" INTEGER,
  "status" "SessionToolCallStatus" NOT NULL DEFAULT 'ok',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SessionToolCall_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionToolCall_turnId_idx" ON "SessionToolCall"("turnId");
CREATE INDEX "SessionToolCall_sessionId_createdAt_idx" ON "SessionToolCall"("sessionId", "createdAt");

CREATE TABLE "WorkspaceSnapshot" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "filesChanged" JSONB NOT NULL DEFAULT '[]',
  "manifest" JSONB NOT NULL DEFAULT '{}',
  "commitSha" TEXT,
  "totalBytes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkspaceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceSnapshot_sessionId_createdAt_idx" ON "WorkspaceSnapshot"("sessionId", "createdAt");
CREATE INDEX "WorkspaceSnapshot_runId_idx" ON "WorkspaceSnapshot"("runId");

-- 4. Foreign keys
ALTER TABLE "AgentSession"
  ADD CONSTRAINT "AgentSession_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentSession"
  ADD CONSTRAINT "AgentSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentSession"
  ADD CONSTRAINT "AgentSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SessionTurn"
  ADD CONSTRAINT "SessionTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionToolCall"
  ADD CONSTRAINT "SessionToolCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionToolCall"
  ADD CONSTRAINT "SessionToolCall_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "SessionTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceSnapshot"
  ADD CONSTRAINT "WorkspaceSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunCheckpoint"
  ADD CONSTRAINT "RunCheckpoint_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
