import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";
import { OpencodeClient } from "./opencode-client.js";

export interface TenantOpencodeConfigPublic {
  tenantId: string;
  enabled: boolean;
  baseUrl: string | null;
  username: string | null;
  password: string | null;
  defaultAgent: string | null;
  defaultModel: string | null;
  projectPath: string | null;
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
  row: {
    enabled: boolean;
    baseUrl: string | null;
    username: string | null;
    password: string | null;
    defaultAgent: string | null;
    defaultModel: string | null;
    projectPath: string | null;
    pollIntervalMs: number;
    maxWaitMs: number;
    autoApprovePermissions: boolean;
  } | null,
): TenantOpencodeConfigPublic {
  const baseUrl = row?.baseUrl ?? null;
  const password = row?.password ?? null;
  return {
    tenantId,
    enabled: row?.enabled ?? false,
    baseUrl,
    username: row?.username ?? "opencode",
    password: maskSecret(password),
    defaultAgent: row?.defaultAgent ?? null,
    defaultModel: row?.defaultModel ?? null,
    projectPath: row?.projectPath ?? null,
    pollIntervalMs: row?.pollIntervalMs ?? 5000,
    maxWaitMs: row?.maxWaitMs ?? 3_600_000,
    autoApprovePermissions: row?.autoApprovePermissions ?? true,
    configured: Boolean(row?.enabled && baseUrl && password),
  };
}

export async function getTenantOpencodeConfigPublic(
  tenantId: string,
): Promise<TenantOpencodeConfigPublic> {
  const row = await prisma.tenantOpencodeConfig.findUnique({ where: { tenantId } });
  return toPublic(tenantId, row);
}

export async function resolveTenantOpencodeConfig(
  tenantId: string,
): Promise<TenantOpencodeConfigResolved | null> {
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
    defaultAgent: row.defaultAgent,
    defaultModel: row.defaultModel,
    projectPath: row.projectPath,
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
    defaultAgent?: string | null;
    defaultModel?: string | null;
    projectPath?: string | null;
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

  const row = await prisma.tenantOpencodeConfig.upsert({
    where: { tenantId },
    update: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl?.trim() || null } : {}),
      ...(input.username !== undefined ? { username: input.username?.trim() || "opencode" } : {}),
      ...(passwordUpdate !== undefined ? { password: passwordUpdate } : {}),
      ...(input.defaultAgent !== undefined ? { defaultAgent: input.defaultAgent } : {}),
      ...(input.defaultModel !== undefined ? { defaultModel: input.defaultModel } : {}),
      ...(input.projectPath !== undefined ? { projectPath: input.projectPath?.trim() || null } : {}),
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
      defaultAgent: input.defaultAgent ?? null,
      defaultModel: input.defaultModel ?? null,
      projectPath: input.projectPath?.trim() || null,
      pollIntervalMs: input.pollIntervalMs ?? 5000,
      maxWaitMs: input.maxWaitMs ?? 3_600_000,
      autoApprovePermissions: input.autoApprovePermissions ?? true,
    },
  });

  const fresh = await prisma.tenantOpencodeConfig.findUnique({ where: { tenantId } });
  return toPublic(tenantId, fresh ?? row);
}

export async function testTenantOpencodeConnection(tenantId: string): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  const config = await resolveTenantOpencodeConfig(tenantId);
  if (!config) {
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
