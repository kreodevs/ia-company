-- Product revenue events (Stripe idempotency) and waitlist signups

CREATE TABLE "ProductRevenueEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRevenueEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductWaitlistSignup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductWaitlistSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductRevenueEvent_stripeEventId_key" ON "ProductRevenueEvent"("stripeEventId");
CREATE INDEX "ProductRevenueEvent_productId_createdAt_idx" ON "ProductRevenueEvent"("productId", "createdAt");

CREATE UNIQUE INDEX "ProductWaitlistSignup_productId_email_key" ON "ProductWaitlistSignup"("productId", "email");
CREATE INDEX "ProductWaitlistSignup_productId_createdAt_idx" ON "ProductWaitlistSignup"("productId", "createdAt");

ALTER TABLE "ProductRevenueEvent" ADD CONSTRAINT "ProductRevenueEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductWaitlistSignup" ADD CONSTRAINT "ProductWaitlistSignup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
