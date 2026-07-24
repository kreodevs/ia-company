-- OpenCode: move agent/model/projectPath from tenant to per-product

ALTER TABLE "TenantProduct" ADD COLUMN "opencodeDefaultAgent" TEXT,
ADD COLUMN "opencodeDefaultModel" TEXT,
ADD COLUMN "opencodeProjectPath" TEXT;

UPDATE "TenantProduct" tp
SET
  "opencodeDefaultAgent" = toc."defaultAgent",
  "opencodeDefaultModel" = toc."defaultModel",
  "opencodeProjectPath" = toc."projectPath"
FROM "TenantOpencodeConfig" toc
WHERE tp."tenantId" = toc."tenantId"
  AND (
    toc."defaultAgent" IS NOT NULL
    OR toc."defaultModel" IS NOT NULL
    OR toc."projectPath" IS NOT NULL
  );

ALTER TABLE "TenantOpencodeConfig" DROP COLUMN "defaultAgent",
DROP COLUMN "defaultModel",
DROP COLUMN "projectPath";
