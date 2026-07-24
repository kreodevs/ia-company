-- CreateEnum
CREATE TYPE "ProductIntakeStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

-- AlterTable
ALTER TABLE "TenantProduct" ADD COLUMN "githubRepoUrl" TEXT,
ADD COLUMN "githubDefaultBranch" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "intakeStatus" "ProductIntakeStatus" NOT NULL DEFAULT 'skipped',
ADD COLUMN "intakeRunId" TEXT;

-- CreateTable
CREATE TABLE "TenantIntegrationConfig" (
    "tenantId" TEXT NOT NULL,
    "githubToken" TEXT,
    "githubUsername" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIntegrationConfig_pkey" PRIMARY KEY ("tenantId")
);

-- AddForeignKey
ALTER TABLE "TenantIntegrationConfig" ADD CONSTRAINT "TenantIntegrationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
