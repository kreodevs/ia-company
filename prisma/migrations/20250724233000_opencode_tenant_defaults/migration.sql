-- OpenCode: tenant-wide default agent, model, and project path (overridden per product / run)

ALTER TABLE "TenantOpencodeConfig"
  ADD COLUMN "defaultAgent" TEXT,
  ADD COLUMN "defaultModel" TEXT,
  ADD COLUMN "defaultProjectPath" TEXT;
