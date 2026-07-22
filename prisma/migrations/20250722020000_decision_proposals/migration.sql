-- Decision proposals: pause autonomous go/no-go for human review
-- with optional drill-down re-research.

CREATE TYPE "DecisionStatus" AS ENUM ('pending_review', 'drilling', 'approved', 'rejected', 'cancelled');

CREATE TABLE "DecisionProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "runId" TEXT,
    "workflowName" TEXT NOT NULL,
    "recommended" "GoNoGoDecision" NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "pivotPrompt" TEXT,
    "status" "DecisionStatus" NOT NULL DEFAULT 'pending_review',
    "drilldownRunId" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DecisionProposal_tenantId_status_idx" ON "DecisionProposal"("tenantId", "status");
CREATE INDEX "DecisionProposal_ideaId_idx" ON "DecisionProposal"("ideaId");

ALTER TABLE "DecisionProposal" ADD CONSTRAINT "DecisionProposal_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "PipelineIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;