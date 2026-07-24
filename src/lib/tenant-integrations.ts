import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";
import { getPlatformSettingsSync } from "./platform-settings.js";

export interface TenantIntegrationsPublic {
  tenantId: string;
  githubToken: string | null;
  githubUsername: string | null;
  githubConfigured: boolean;
}

export async function getTenantIntegrationsPublic(
  tenantId: string,
): Promise<TenantIntegrationsPublic> {
  const row = await prisma.tenantIntegrationConfig.findUnique({ where: { tenantId } });
  const token = row?.githubToken ?? null;
  return {
    tenantId,
    githubToken: maskSecret(token),
    githubUsername: row?.githubUsername ?? null,
    githubConfigured: Boolean(token && decryptSecret(token)),
  };
}

export async function resolveTenantGithubToken(tenantId: string): Promise<string | undefined> {
  const row = await prisma.tenantIntegrationConfig.findUnique({ where: { tenantId } });
  const tenantToken = decryptSecret(row?.githubToken);
  if (tenantToken) return tenantToken;

  try {
    const platform = getPlatformSettingsSync();
    if (platform.githubApiKey) return platform.githubApiKey;
  } catch {
    // platform settings not loaded
  }

  return process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
}

export async function upsertTenantIntegrations(
  tenantId: string,
  input: {
    githubToken?: string | null;
    githubUsername?: string | null;
  },
): Promise<TenantIntegrationsPublic> {
  let githubTokenUpdate: string | null | undefined = undefined;
  if (input.githubToken !== undefined) {
    const trimmed = input.githubToken?.trim();
    if (trimmed && trimmed !== "••••••••") {
      githubTokenUpdate = encryptSecret(trimmed);
    } else if (trimmed === "" || trimmed === null) {
      githubTokenUpdate = null;
    }
  }

  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId },
    update: {
      ...(githubTokenUpdate !== undefined ? { githubToken: githubTokenUpdate } : {}),
      ...(input.githubUsername !== undefined ? { githubUsername: input.githubUsername } : {}),
    },
    create: {
      tenantId,
      githubToken: githubTokenUpdate ?? null,
      githubUsername: input.githubUsername ?? null,
    },
  });

  return getTenantIntegrationsPublic(tenantId);
}

export async function testTenantGithubConnection(tenantId: string): Promise<{
  ok: boolean;
  login?: string;
  message: string;
}> {
  const token = await resolveTenantGithubToken(tenantId);
  if (!token) {
    return { ok: false, message: "No GitHub token configured for this tenant" };
  }

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "auto-company",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, message: `GitHub API ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = (await res.json()) as { login?: string };
  if (data.login) {
    await upsertTenantIntegrations(tenantId, { githubUsername: data.login });
  }
  return { ok: true, login: data.login, message: `Connected as ${data.login ?? "unknown"}` };
}
