-- Product Desk + Agent I/O contracts

ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "contractInputs" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Agent" ADD COLUMN IF NOT EXISTS "contractOutputs" JSONB NOT NULL DEFAULT '[]';

-- Extend ArtifactType enum (Postgres: add values if not exists)
ALTER TYPE "ArtifactType" ADD VALUE IF NOT EXISTS 'spec';
ALTER TYPE "ArtifactType" ADD VALUE IF NOT EXISTS 'adr';
ALTER TYPE "ArtifactType" ADD VALUE IF NOT EXISTS 'task';

CREATE TYPE "DeskItemType" AS ENUM (
  'spec',
  'adr',
  'copy',
  'design',
  'code',
  'report',
  'social_post',
  'task',
  'other'
);

CREATE TYPE "DeskItemStatus" AS ENUM (
  'draft',
  'approved',
  'in_progress',
  'consumed',
  'archived'
);

CREATE TYPE "DeskItemSourceKind" AS ENUM (
  'agent',
  'mcp',
  'webhook',
  'human',
  'run'
);

CREATE TABLE "ProductDeskItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "DeskItemType" NOT NULL DEFAULT 'other',
  "status" "DeskItemStatus" NOT NULL DEFAULT 'draft',
  "title" TEXT NOT NULL,
  "previewText" TEXT,
  "body" JSONB NOT NULL DEFAULT '{}',
  "sourceKind" "DeskItemSourceKind" NOT NULL DEFAULT 'run',
  "sourceMeta" JSONB NOT NULL DEFAULT '{}',
  "runId" TEXT,
  "createdByAgent" TEXT,
  "suggestedNextRole" TEXT,
  "approvedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "consumedByRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductDeskItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductDeskItem_tenantId_productId_status_idx" ON "ProductDeskItem"("tenantId", "productId", "status");
CREATE INDEX "ProductDeskItem_productId_type_status_idx" ON "ProductDeskItem"("productId", "type", "status");
CREATE INDEX "ProductDeskItem_productId_createdAt_idx" ON "ProductDeskItem"("productId", "createdAt");

ALTER TABLE "ProductDeskItem" ADD CONSTRAINT "ProductDeskItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
