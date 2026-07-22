-- Multi-product autonomous company

CREATE TYPE "CompanyPhase" AS ENUM ('exploring', 'validating', 'building', 'launching', 'growing');
CREATE TYPE "ProductPhase" AS ENUM ('queued', 'evaluating', 'building', 'launching', 'growing', 'paused', 'archived');
CREATE TYPE "GoNoGoDecision" AS ENUM ('pending', 'go', 'no_go');
CREATE TYPE "ScheduleKind" AS ENUM ('workflow', 'meta');

ALTER TABLE "TenantConsensus" ADD COLUMN "companyPhase" "CompanyPhase" NOT NULL DEFAULT 'exploring';

ALTER TABLE "AutonomousSchedule" ADD COLUMN "scheduleKind" "ScheduleKind" NOT NULL DEFAULT 'workflow';
ALTER TABLE "AutonomousSchedule" ALTER COLUMN "workflowId" DROP NOT NULL;

ALTER TABLE "PlatformSettings" ADD COLUMN "githubApiKey" TEXT;

CREATE TABLE "TenantCycleState" (
    "tenantId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "phase" "CompanyPhase" NOT NULL DEFAULT 'exploring',
    "stuckCounter" INTEGER NOT NULL DEFAULT 0,
    "lastNextAction" TEXT,
    "focusProductId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCycleState_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE "TenantProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phase" "ProductPhase" NOT NULL DEFAULT 'queued',
    "pipelineRank" INTEGER NOT NULL DEFAULT 0,
    "goNoGo" "GoNoGoDecision" NOT NULL DEFAULT 'pending',
    "revenueUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineIdea" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "goNoGo" "GoNoGoDecision" NOT NULL DEFAULT 'pending',
    "promotedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineIdea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantProduct_tenantId_slug_key" ON "TenantProduct"("tenantId", "slug");
CREATE INDEX "TenantProduct_tenantId_phase_idx" ON "TenantProduct"("tenantId", "phase");
CREATE INDEX "PipelineIdea_tenantId_rank_idx" ON "PipelineIdea"("tenantId", "rank");

ALTER TABLE "TenantCycleState" ADD CONSTRAINT "TenantCycleState_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantCycleState" ADD CONSTRAINT "TenantCycleState_focusProductId_fkey" FOREIGN KEY ("focusProductId") REFERENCES "TenantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantProduct" ADD CONSTRAINT "TenantProduct_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineIdea" ADD CONSTRAINT "PipelineIdea_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
