-- Reingeniería 2 (Fase A-C): trabajo interdepartamental con handoffs explícitos.
-- DepartmentWorkItem = subtarea departamental de un encargo (ExecutionRun).
-- DepartmentHandoff = transferencia trazable entre departamentos.

CREATE TYPE "DepartmentWorkStatus" AS ENUM (
  'planned',
  'active',
  'blocked',
  'waiting_review',
  'completed',
  'cancelled'
);

CREATE TYPE "DepartmentHandoffStatus" AS ENUM (
  'draft',
  'sent',
  'pending_acceptance',
  'accepted',
  'needs_clarification',
  'rejected',
  'completed'
);

CREATE TABLE "DepartmentWorkItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "departmentSlug" TEXT,
  "orgUnitId" TEXT,
  "ownerAgentId" TEXT,
  "ownerAgentName" TEXT,
  "title" TEXT NOT NULL,
  "objective" TEXT,
  "status" "DepartmentWorkStatus" NOT NULL DEFAULT 'planned',
  "businessStatus" TEXT,
  "nextAction" TEXT,
  "blockedReason" TEXT,
  "deliverablePaths" JSONB NOT NULL DEFAULT '[]',
  "dependsOnId" TEXT,
  "lastActivityAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DepartmentWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DepartmentHandoff" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromWorkItemId" TEXT,
  "toWorkItemId" TEXT,
  "fromDepartmentSlug" TEXT,
  "toDepartmentSlug" TEXT,
  "fromOrgUnitId" TEXT,
  "toOrgUnitId" TEXT,
  "status" "DepartmentHandoffStatus" NOT NULL DEFAULT 'draft',
  "message" TEXT NOT NULL,
  "decisions" JSONB NOT NULL DEFAULT '[]',
  "openQuestions" JSONB NOT NULL DEFAULT '[]',
  "artifactPaths" JSONB NOT NULL DEFAULT '[]',
  "requestedClarification" TEXT,
  "rejectionReason" TEXT,
  "acceptedBy" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DepartmentHandoff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DepartmentWorkItem_tenantId_runId_idx" ON "DepartmentWorkItem"("tenantId", "runId");
CREATE INDEX "DepartmentWorkItem_tenantId_departmentSlug_idx" ON "DepartmentWorkItem"("tenantId", "departmentSlug");
CREATE INDEX "DepartmentWorkItem_tenantId_status_idx" ON "DepartmentWorkItem"("tenantId", "status");

CREATE INDEX "DepartmentHandoff_tenantId_status_idx" ON "DepartmentHandoff"("tenantId", "status");
CREATE INDEX "DepartmentHandoff_tenantId_toWorkItemId_idx" ON "DepartmentHandoff"("tenantId", "toWorkItemId");
CREATE INDEX "DepartmentHandoff_tenantId_fromWorkItemId_idx" ON "DepartmentHandoff"("tenantId", "fromWorkItemId");

ALTER TABLE "DepartmentWorkItem" ADD CONSTRAINT "DepartmentWorkItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentWorkItem" ADD CONSTRAINT "DepartmentWorkItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentWorkItem" ADD CONSTRAINT "DepartmentWorkItem_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartmentWorkItem" ADD CONSTRAINT "DepartmentWorkItem_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "DepartmentWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DepartmentHandoff" ADD CONSTRAINT "DepartmentHandoff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentHandoff" ADD CONSTRAINT "DepartmentHandoff_fromWorkItemId_fkey" FOREIGN KEY ("fromWorkItemId") REFERENCES "DepartmentWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartmentHandoff" ADD CONSTRAINT "DepartmentHandoff_toWorkItemId_fkey" FOREIGN KEY ("toWorkItemId") REFERENCES "DepartmentWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartmentHandoff" ADD CONSTRAINT "DepartmentHandoff_fromOrgUnitId_fkey" FOREIGN KEY ("fromOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartmentHandoff" ADD CONSTRAINT "DepartmentHandoff_toOrgUnitId_fkey" FOREIGN KEY ("toOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
