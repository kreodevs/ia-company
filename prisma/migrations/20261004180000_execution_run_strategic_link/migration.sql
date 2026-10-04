-- Fase F (P6): vincular encargos a objetivos e iniciativas
ALTER TABLE "ExecutionRun" ADD COLUMN "companyGoalId" TEXT;
ALTER TABLE "ExecutionRun" ADD COLUMN "initiativeId" TEXT;

CREATE INDEX "ExecutionRun_tenantId_companyGoalId_idx" ON "ExecutionRun"("tenantId", "companyGoalId");
CREATE INDEX "ExecutionRun_tenantId_initiativeId_idx" ON "ExecutionRun"("tenantId", "initiativeId");

ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_companyGoalId_fkey" FOREIGN KEY ("companyGoalId") REFERENCES "CompanyGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
