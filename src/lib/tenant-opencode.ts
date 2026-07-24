import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";
import { getPlatformSettingsSync } from "./platform-settings.js";
import { OpencodeClient } from "./opencode-client.js";

export interface TenantOpencodeConfigPublic {
  tenantId: string;
  platformEnabled: boolean;
  enabled: boolean;
  baseUrl: string | null;
  username: string | null;
  password: string | null;
  pollIntervalMs: number;
  maxWaitMs: number;
  autoApprovePermissions: boolean;
  configured: boolean;
}

export interface TenantOpencodeConfigResolved {
  tenantId: string;
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  defaultAgent: string | null;
  defaultModel: string | null;
  projectPath: string | null;
  pollIntervalMs: number;
  maxWaitMs: number;
  autoApprovePermissions: boolean;
}

function toPublic(
  tenantId: string,
  platformEnabled: boolean,
  row: {
    enabled: boolean;
    baseUrl: string | null;
    username: string | null;
    password: string | null;
    pollIntervalMs: number;
    maxWaitMs: number;
    autoApprovePermissions: boolean;
  } | null,
): TenantOpencodeConfigPublic {
  const baseUrl = row?.baseUrl ?? null;
  const password = row?.password ?? null;
  return {
    tenantId,
    platformEnabled,
    enabled: row?.enabled ?? false,
    baseUrl,
    username: row?.username ?? "opencode",
    password: maskSecret(password),
    pollIntervalMs: row?.pollIntervalMs ?? 5000,
    maxWaitMs: row?.maxWaitMs ?? 3_600_000,
    autoApprovePermissions: row?.autoApprovePermissions ?? true,
    configured: Boolean(platformEnabled && row?.enabled && baseUrl && password),
  };
}

export async function getTenantOpencodeConfigPublic(
  tenantId: string,
): Promise<TenantOpencodeConfigPublic> {
  const platform = getPlatformSettingsSync();
  const row = await prisma.tenantOpencodeConfig.findUnique({ where: { tenantId } });
  return toPublic(tenantId, platform.opencodeEnabled, row);
}

export async function resolveTenantOpencodeConfig(
  tenantId: string,
): Promise<TenantOpencodeConfigResolved | null> {
  const platform = getPlatformSettingsSync();
  if (!platform.opencodeEnabled) return null;

  const row = await prisma.tenantOpencodeConfig.findUnique({ where: { tenantId } });
  if (!row?.enabled || !row.baseUrl) return null;

  const password = decryptSecret(row.password);
  if (!password) return null;

  return {
    tenantId,
    enabled: true,
    baseUrl: row.baseUrl.replace(/\/+$/, ""),
    username: row.username ?? "opencode",
    password,
    defaultAgent: null,
    defaultModel: null,
    projectPath: null,
    pollIntervalMs: row.pollIntervalMs,
    maxWaitMs: row.maxWaitMs,
    autoApprovePermissions: row.autoApprovePermissions,
  };
}

export async function upsertTenantOpencodeConfig(
  tenantId: string,
  input: {
    enabled?: boolean;
    baseUrl?: string | null;
    username?: string | null;
    password?: string | null;
    pollIntervalMs?: number;
    maxWaitMs?: number;
    autoApprovePermissions?: boolean;
  },
): Promise<TenantOpencodeConfigPublic> {
  let passwordUpdate: string | null | undefined = undefined;
  if (input.password !== undefined) {
    const trimmed = input.password?.trim();
    if (trimmed && trimmed !== "••••••••") {
      passwordUpdate = encryptSecret(trimmed);
    } else if (trimmed === "" || trimmed === null) {
      passwordUpdate = null;
    }
  }

  const platform = getPlatformSettingsSync();
  const pollDefault = platform.opencodeDefaultPollIntervalMs;
  const waitDefault = platform.opencodeDefaultMaxWaitMs;

  const row = await prisma.tenantOpencodeConfig.upsert({
    where: { tenantId },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl?.trim() || null } : {}),
      ...(input.username !== undefined ? { username: input.username?.trim() || "opencode" } : {}),
      ...(passwordUpdate !== undefined ? { password: passwordUpdate } : {}),
      ...(input.pollIntervalMs !== undefined ? { pollIntervalMs: input.pollIntervalMs } : {}),
      ...(input.maxWaitMs !== undefined ? { maxWaitMs: input.maxWaitMs } : {}),
      ...(input.autoApprovePermissions !== undefined
        ? { autoApprovePermissions: input.autoApprovePermissions }
        : {}),
    },
    create: {
      tenantId,
      enabled: input.enabled ?? false,
      baseUrl: input.baseUrl?.trim() || null,
      username: input.username?.trim() || "opencode",
      password: passwordUpdate ?? null,
      pollIntervalMs: input.pollIntervalMs ?? pollDefault,
      maxWaitMs: input.maxWaitMs ?? waitDefault,
      autoApprovePermissions: input.autoApprovePermissions ?? true,
    },
  });

  const fresh = await prisma.tenantOpencodeConfig.findUnique({ where: { tenantId } });
  return toPublic(tenantId, platform.opencodeEnabled, fresh ?? row);
}

export async function testTenantOpencodeConnection(tenantId: string): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  const config = await resolveTenantOpencodeConfig(tenantId);
  if (!config) {
    const platform = getPlatformSettingsSync();
    if (!platform.opencodeEnabled) {
      return { ok: false, error: "OpenCode is disabled at platform level — contact your superadmin" };
    }
    return { ok: false, error: "OpenCode is not enabled or missing URL/password" };
  }

  try {
    const client = new OpencodeClient(config);
    const health = await client.health();
    return { ok: health.healthy, version: health.version };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function createOpencodeClientForTenant(
  config: TenantOpencodeConfigResolved,
): OpencodeClient {
  return new OpencodeClient(config);
}
