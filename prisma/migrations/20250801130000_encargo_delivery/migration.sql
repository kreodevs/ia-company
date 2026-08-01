CREATE TABLE "EncargoDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "includeFinalReport" BOOLEAN NOT NULL DEFAULT true,
    "documentIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncargoDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EncargoDelivery_token_key" ON "EncargoDelivery"("token");
CREATE INDEX "EncargoDelivery_tenantId_runId_idx" ON "EncargoDelivery"("tenantId", "runId");

ALTER TABLE "EncargoDelivery" ADD CONSTRAINT "EncargoDelivery_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
