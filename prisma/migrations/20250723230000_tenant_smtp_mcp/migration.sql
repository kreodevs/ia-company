-- Tenant SMTP + MCP registry (idempotent — safe to re-run on deploy / partial apply)

ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpHost" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpPort" INTEGER;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpSecure" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpUser" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpPassword" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpFromEmail" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpFromName" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpAllowedRecipients" TEXT;
ALTER TABLE "TenantIntegrationConfig" ADD COLUMN IF NOT EXISTS "smtpMaxPerDay" INTEGER NOT NULL DEFAULT 20;

DO $$ BEGIN
  CREATE TYPE "McpTransport" AS ENUM ('stdio', 'sse');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TenantMcpServer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "transport" "McpTransport" NOT NULL DEFAULT 'stdio',
    "command" TEXT,
    "argsJson" TEXT,
    "url" TEXT,
    "envJson" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "readOnly" BOOLEAN NOT NULL DEFAULT true,
    "maxCallsPerRun" INTEGER NOT NULL DEFAULT 30,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMcpServer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantMcpTool" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchemaJson" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TenantMcpTool_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AgentMcpGrant" (
    "agentId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "allowedToolNames" TEXT,

    CONSTRAINT "AgentMcpGrant_pkey" PRIMARY KEY ("agentId","serverId")
);

CREATE TABLE IF NOT EXISTS "TenantEmailSendLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT,
    "agentId" TEXT,
    "toRecipients" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantEmailSendLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantMcpServer_tenantId_slug_key" ON "TenantMcpServer"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "TenantMcpServer_tenantId_enabled_idx" ON "TenantMcpServer"("tenantId", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "TenantMcpTool_serverId_name_key" ON "TenantMcpTool"("serverId", "name");
CREATE INDEX IF NOT EXISTS "TenantEmailSendLog_tenantId_sentAt_idx" ON "TenantEmailSendLog"("tenantId", "sentAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantMcpServer_tenantId_fkey'
  ) THEN
    ALTER TABLE "TenantMcpServer"
      ADD CONSTRAINT "TenantMcpServer_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantMcpTool_serverId_fkey'
  ) THEN
    ALTER TABLE "TenantMcpTool"
      ADD CONSTRAINT "TenantMcpTool_serverId_fkey"
      FOREIGN KEY ("serverId") REFERENCES "TenantMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentMcpGrant_agentId_fkey'
  ) THEN
    ALTER TABLE "AgentMcpGrant"
      ADD CONSTRAINT "AgentMcpGrant_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentMcpGrant_serverId_fkey'
  ) THEN
    ALTER TABLE "AgentMcpGrant"
      ADD CONSTRAINT "AgentMcpGrant_serverId_fkey"
      FOREIGN KEY ("serverId") REFERENCES "TenantMcpServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantEmailSendLog_tenantId_fkey'
  ) THEN
    ALTER TABLE "TenantEmailSendLog"
      ADD CONSTRAINT "TenantEmailSendLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
