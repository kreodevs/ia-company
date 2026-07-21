-- CreateTable
CREATE TABLE "TenantNotificationConfig" (
    "tenantId" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "slackWebhookUrl" TEXT,
    "emailRecipients" TEXT,
    "notifyOnComplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnFail" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantNotificationConfig_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "TenantUsageLimits" (
    "tenantId" TEXT NOT NULL,
    "maxRunsPerMonth" INTEGER,
    "maxCostUsdPerMonth" DOUBLE PRECISION,
    "maxTokensPerMonth" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantUsageLimits_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tenantUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_tenantUserId_idx" ON "PasswordResetToken"("tenantUserId");

-- AddForeignKey
ALTER TABLE "TenantNotificationConfig" ADD CONSTRAINT "TenantNotificationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantUsageLimits" ADD CONSTRAINT "TenantUsageLimits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
