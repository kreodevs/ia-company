-- Phases 4-7: signals, kanban, recommendations

ALTER TYPE "DeskItemSourceKind" ADD VALUE IF NOT EXISTS 'recommendation';

CREATE TYPE "KanbanColumn" AS ENUM ('backlog', 'approved', 'in_progress', 'done');
CREATE TYPE "ProductSignalKind" AS ENUM (
  'revenue_received',
  'waitlist_signup',
  'campaign_metric',
  'support_ticket',
  'custom'
);

ALTER TABLE "ProductDeskItem" ADD COLUMN IF NOT EXISTS "kanbanColumn" "KanbanColumn";
ALTER TABLE "ProductDeskItem" ADD COLUMN IF NOT EXISTS "playbookId" TEXT;

CREATE INDEX IF NOT EXISTS "ProductDeskItem_productId_kanbanColumn_idx"
  ON "ProductDeskItem"("productId", "kanbanColumn");

CREATE TABLE "ProductSignal" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "kind" "ProductSignalKind" NOT NULL DEFAULT 'custom',
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "amountUsd" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductSignal_productId_createdAt_idx" ON "ProductSignal"("productId", "createdAt");
CREATE INDEX "ProductSignal_tenantId_productId_kind_idx" ON "ProductSignal"("tenantId", "productId", "kind");

ALTER TABLE "ProductSignal" ADD CONSTRAINT "ProductSignal_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
