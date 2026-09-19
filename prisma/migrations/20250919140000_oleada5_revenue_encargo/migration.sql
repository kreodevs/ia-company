-- Oleada 5: link revenue events to encargos (runs)
ALTER TABLE "ProductRevenueEvent" ADD COLUMN "runId" TEXT;
CREATE INDEX "ProductRevenueEvent_runId_idx" ON "ProductRevenueEvent"("runId");
