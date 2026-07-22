-- Per-product consensus (primary memory per product) + append-only revision log

CREATE TABLE "ProductConsensus" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "nextAction" TEXT,
    "cycleNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductConsensus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductConsensusRevision" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "runId" TEXT,
    "stepId" TEXT,
    "agentName" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "nextAction" TEXT,
    "decisions" JSONB NOT NULL DEFAULT '[]',
    "openQuestions" JSONB NOT NULL DEFAULT '[]',
    "veto" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductConsensusRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductConsensus_productId_key" ON "ProductConsensus"("productId");
CREATE INDEX "ProductConsensus_tenantId_idx" ON "ProductConsensus"("tenantId");
CREATE INDEX "ProductConsensusRevision_productId_createdAt_idx" ON "ProductConsensusRevision"("productId", "createdAt");
CREATE INDEX "ProductConsensusRevision_runId_idx" ON "ProductConsensusRevision"("runId");

ALTER TABLE "ProductConsensus" ADD CONSTRAINT "ProductConsensus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductConsensusRevision" ADD CONSTRAINT "ProductConsensusRevision_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductConsensus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bootstrap: create one ProductConsensus row per existing TenantProduct,
-- and seed a first revision that mirrors the current tenant consensus (if any)
-- so existing tenants keep their history under the focus / first product.
INSERT INTO "ProductConsensus" ("id", "productId", "tenantId", "content", "nextAction", "cycleNumber", "createdAt", "updatedAt")
SELECT
  'pc_bootstrap_' || tp."id",
  tp."id",
  tp."tenantId",
  COALESCE(
    tc."content",
    '# ' || tp."name" || E'\n\nProduct-scoped consensus memory. Each agent handoff appends a revision here.'
  ),
  tc."nextAction",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TenantProduct" tp
LEFT JOIN "TenantConsensus" tc ON tc."tenantId" = tp."tenantId";