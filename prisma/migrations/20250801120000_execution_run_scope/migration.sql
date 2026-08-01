-- Denormalized scope columns for indexed department/product run queries
ALTER TABLE "ExecutionRun" ADD COLUMN "orgUnitId" TEXT;
ALTER TABLE "ExecutionRun" ADD COLUMN "productId" TEXT;

CREATE INDEX "ExecutionRun_tenantId_status_idx" ON "ExecutionRun"("tenantId", "status");
CREATE INDEX "ExecutionRun_tenantId_orgUnitId_idx" ON "ExecutionRun"("tenantId", "orgUnitId");
CREATE INDEX "ExecutionRun_tenantId_productId_idx" ON "ExecutionRun"("tenantId", "productId");
CREATE INDEX "ExecutionRun_tenantId_orgUnitId_status_idx" ON "ExecutionRun"("tenantId", "orgUnitId", "status");
CREATE INDEX "ExecutionRun_tenantId_productId_status_idx" ON "ExecutionRun"("tenantId", "productId", "status");

ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_orgUnitId_fkey"
  FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
