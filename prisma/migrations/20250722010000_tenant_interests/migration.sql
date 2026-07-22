-- Tenant interests: tag-based preferences to align opportunity discovery
-- and pipeline idea scoring with the tenant's domains.

ALTER TABLE "PipelineIdea" ADD COLUMN "interestScore" DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE INDEX "PipelineIdea_tenantId_interestScore_idx" ON "PipelineIdea"("tenantId", "interestScore");

CREATE TABLE "TenantInterest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantInterest_tenantId_category_key" ON "TenantInterest"("tenantId", "category");
CREATE INDEX "TenantInterest_tenantId_idx" ON "TenantInterest"("tenantId");

ALTER TABLE "TenantInterest" ADD CONSTRAINT "TenantInterest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;