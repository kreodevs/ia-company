-- In-app notifications + coordinator chat support
ALTER TABLE "TenantNotificationConfig" ADD COLUMN "notifyInApp" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "TenantNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "runId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantNotification_tenantId_createdAt_idx" ON "TenantNotification"("tenantId", "createdAt");
CREATE INDEX "TenantNotification_tenantId_readAt_idx" ON "TenantNotification"("tenantId", "readAt");

ALTER TABLE "TenantNotification" ADD CONSTRAINT "TenantNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
