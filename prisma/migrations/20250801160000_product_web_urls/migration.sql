-- Product public URLs for agent context (website + pricing page)
ALTER TABLE "TenantProduct" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "TenantProduct" ADD COLUMN "pricingPageUrl" TEXT;
