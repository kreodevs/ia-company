-- Reingeniería 2, Fase G: revisión de documentos con comentarios anclados.

CREATE TYPE "DocumentReviewStatus" AS ENUM ('pending_review', 'changes_requested', 'approved', 'rejected');

CREATE TYPE "CommentStatus" AS ENUM ('open', 'resolved', 'converted');

CREATE TABLE "DocumentReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "docPath" TEXT,
    "versionSha" TEXT,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'pending_review',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "anchor" JSONB NOT NULL DEFAULT '{}',
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorAgentName" TEXT,
    "versionSha" TEXT,
    "status" "CommentStatus" NOT NULL DEFAULT 'open',
    "linkedWorkItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentReview_tenantId_runId_docKey_versionSha_key" ON "DocumentReview"("tenantId", "runId", "docKey", "versionSha");
CREATE INDEX "DocumentReview_tenantId_runId_idx" ON "DocumentReview"("tenantId", "runId");
CREATE INDEX "DocumentReview_tenantId_status_idx" ON "DocumentReview"("tenantId", "status");
CREATE INDEX "DocumentComment_tenantId_reviewId_idx" ON "DocumentComment"("tenantId", "reviewId");
CREATE INDEX "DocumentComment_tenantId_runId_docKey_idx" ON "DocumentComment"("tenantId", "runId", "docKey");

ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentReview" ADD CONSTRAINT "DocumentReview_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "DocumentReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_linkedWorkItemId_fkey" FOREIGN KEY ("linkedWorkItemId") REFERENCES "DepartmentWorkItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
