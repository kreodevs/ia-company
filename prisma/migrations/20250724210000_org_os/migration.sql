-- Org OS: departments, artifacts, business templates

CREATE TYPE "OrgUnitType" AS ENUM ('product_studio', 'marketing_agency', 'department', 'custom');
CREATE TYPE "WorkItemKind" AS ENUM ('product', 'client', 'campaign', 'project');
CREATE TYPE "ArtifactType" AS ENUM ('copy', 'social_post', 'design', 'report', 'code', 'other');
CREATE TYPE "ArtifactStatus" AS ENUM ('draft', 'approved', 'published', 'archived');

CREATE TABLE "BusinessTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orgUnitType" "OrgUnitType" NOT NULL,
    "definition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessTemplate_slug_key" ON "BusinessTemplate"("slug");

CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrgUnitType" NOT NULL DEFAULT 'custom',
    "templateId" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "configSchema" JSONB NOT NULL DEFAULT '{}',
    "tokens" JSONB NOT NULL DEFAULT '{}',
    "designMd" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgUnit_tenantId_slug_key" ON "OrgUnit"("tenantId", "slug");
CREATE INDEX "OrgUnit_tenantId_type_idx" ON "OrgUnit"("tenantId", "type");

CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "productId" TEXT,
    "runId" TEXT,
    "type" "ArtifactType" NOT NULL DEFAULT 'other',
    "status" "ArtifactStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL DEFAULT '{}',
    "previewText" TEXT,
    "createdByAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Artifact_tenantId_orgUnitId_idx" ON "Artifact"("tenantId", "orgUnitId");
CREATE INDEX "Artifact_orgUnitId_type_idx" ON "Artifact"("orgUnitId", "type");
CREATE INDEX "Artifact_productId_idx" ON "Artifact"("productId");

ALTER TABLE "TenantProduct" ADD COLUMN "orgUnitId" TEXT;
ALTER TABLE "TenantProduct" ADD COLUMN "workItemKind" "WorkItemKind" NOT NULL DEFAULT 'product';
CREATE INDEX "TenantProduct_tenantId_orgUnitId_idx" ON "TenantProduct"("tenantId", "orgUnitId");

ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BusinessTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantProduct" ADD CONSTRAINT "TenantProduct_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
