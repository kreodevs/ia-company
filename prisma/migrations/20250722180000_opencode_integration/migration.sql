-- AlterEnum
ALTER TYPE "ExecutionStatus" ADD VALUE 'DELEGATED';
ALTER TYPE "ExecutionStatus" ADD VALUE 'AWAITING_USER';

-- CreateEnum
CREATE TYPE "OpencodeDelegationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED');
CREATE TYPE "OpencodeGateDecision" AS ENUM ('proceed_local', 'cancel');

-- CreateTable
CREATE TABLE "TenantOpencodeConfig" (
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "baseUrl" TEXT,
    "username" TEXT DEFAULT 'opencode',
    "password" TEXT,
    "defaultAgent" TEXT,
    "defaultModel" TEXT,
    "projectPath" TEXT,
    "pollIntervalMs" INTEGER NOT NULL DEFAULT 5000,
    "maxWaitMs" INTEGER NOT NULL DEFAULT 3600000,
    "autoApprovePermissions" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantOpencodeConfig_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE "OpencodeDelegation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT,
    "opencodeSessionId" TEXT NOT NULL,
    "status" "OpencodeDelegationStatus" NOT NULL DEFAULT 'PENDING',
    "promptSummary" TEXT,
    "resultSummary" TEXT,
    "diffJson" JSONB,
    "resumeFromStepOrder" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpencodeDelegation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpencodeRunGate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "decision" "OpencodeGateDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "OpencodeRunGate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpencodeDelegation_runId_key" ON "OpencodeDelegation"("runId");
CREATE INDEX "OpencodeDelegation_tenantId_status_idx" ON "OpencodeDelegation"("tenantId", "status");
CREATE INDEX "OpencodeDelegation_opencodeSessionId_idx" ON "OpencodeDelegation"("opencodeSessionId");

CREATE UNIQUE INDEX "OpencodeRunGate_runId_key" ON "OpencodeRunGate"("runId");
CREATE INDEX "OpencodeRunGate_tenantId_idx" ON "OpencodeRunGate"("tenantId");

ALTER TABLE "TenantOpencodeConfig" ADD CONSTRAINT "TenantOpencodeConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpencodeDelegation" ADD CONSTRAINT "OpencodeDelegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpencodeDelegation" ADD CONSTRAINT "OpencodeDelegation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpencodeDelegation" ADD CONSTRAINT "OpencodeDelegation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpencodeRunGate" ADD CONSTRAINT "OpencodeRunGate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpencodeRunGate" ADD CONSTRAINT "OpencodeRunGate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
