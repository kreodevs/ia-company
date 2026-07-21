-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "publicUrl" TEXT NOT NULL DEFAULT 'http://localhost:5173',
    "defaultProvider" "AgentProvider" NOT NULL DEFAULT 'tokenlab',
    "defaultModel" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    "defaultTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "tokenlabApiKey" TEXT,
    "tokenlabBaseUrl" TEXT NOT NULL DEFAULT 'https://api.lemondata.io/v1',
    "openrouterApiKey" TEXT,
    "openrouterBaseUrl" TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
    "openrouterReferer" TEXT NOT NULL DEFAULT 'https://auto-company.local',
    "customApiKey" TEXT,
    "customBaseUrl" TEXT NOT NULL DEFAULT '',
    "resendApiKey" TEXT,
    "emailFrom" TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
    "executeRateLimitMax" INTEGER NOT NULL DEFAULT 10,
    "authRateLimitMax" INTEGER NOT NULL DEFAULT 30,
    "shellTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "schedulerTickMs" INTEGER NOT NULL DEFAULT 60000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default row (legacy env values imported on first API read if present)
INSERT INTO "PlatformSettings" ("id", "updatedAt") VALUES ('platform', CURRENT_TIMESTAMP);
