-- Raise default API rate limits for SPA polling + product file browsing
UPDATE "PlatformSettings"
SET
  "authRateLimitMax" = GREATEST("authRateLimitMax", 150),
  "executeRateLimitMax" = GREATEST("executeRateLimitMax", 30)
WHERE "id" = 'platform';

ALTER TABLE "PlatformSettings" ALTER COLUMN "authRateLimitMax" SET DEFAULT 150;
ALTER TABLE "PlatformSettings" ALTER COLUMN "executeRateLimitMax" SET DEFAULT 30;
