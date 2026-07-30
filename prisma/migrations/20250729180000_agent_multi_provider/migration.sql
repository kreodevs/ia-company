-- Multi-provider per-agent LLM configuration
ALTER TYPE "AgentProvider" ADD VALUE IF NOT EXISTS 'replicate';

CREATE TYPE "AgentModelKind" AS ENUM ('chat', 'image', 'audio');

ALTER TABLE "Agent" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "Agent" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "Agent" ALTER COLUMN "model" DROP NOT NULL;
ALTER TABLE "Agent" ALTER COLUMN "model" DROP DEFAULT;
ALTER TABLE "Agent" ADD COLUMN "modelKind" "AgentModelKind" NOT NULL DEFAULT 'chat';

ALTER TABLE "PlatformSettings" ADD COLUMN IF NOT EXISTS "replicateApiKey" TEXT;
