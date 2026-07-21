-- AlterTable: track platform template lineage on tenant copies (enables rename-safe sync)
ALTER TABLE "Agent" ADD COLUMN "platformSourceId" TEXT;
CREATE INDEX "Agent_tenantId_platformSourceId_idx" ON "Agent"("tenantId", "platformSourceId");

ALTER TABLE "Skill" ADD COLUMN "platformSourceId" TEXT;
CREATE INDEX "Skill_tenantId_platformSourceId_idx" ON "Skill"("tenantId", "platformSourceId");

ALTER TABLE "Workflow" ADD COLUMN "platformSourceId" TEXT;
CREATE INDEX "Workflow_tenantId_platformSourceId_idx" ON "Workflow"("tenantId", "platformSourceId");
