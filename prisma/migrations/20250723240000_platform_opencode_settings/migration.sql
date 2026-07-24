-- Platform OpenCode feature flag + tenant defaults (idempotent)

ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "opencodeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "opencodeDefaultPollIntervalMs" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "opencodeDefaultMaxWaitMs" INTEGER NOT NULL DEFAULT 3600000;
