ALTER TABLE "EncargoDelivery" ADD COLUMN "contentSnapshot" JSONB;
ALTER TABLE "EncargoDelivery" ADD COLUMN "firstViewedAt" TIMESTAMP(3);
ALTER TABLE "EncargoDelivery" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EncargoDelivery" ADD COLUMN "recipientEmail" TEXT;
ALTER TABLE "EncargoDelivery" ADD COLUMN "emailedAt" TIMESTAMP(3);

CREATE TABLE "TenantDeliveryBranding" (
    "tenantId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "footerText" TEXT,
    "confidentialityNotice" TEXT,
    "contactEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDeliveryBranding_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "TenantDeliveryBranding" ADD CONSTRAINT "TenantDeliveryBranding_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
