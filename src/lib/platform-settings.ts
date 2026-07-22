import type { AgentProvider, PlatformSettings } from "@prisma/client";
import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";

export const PLATFORM_SETTINGS_ID = "platform";

export const PLATFORM_SETTINGS_DEFAULTS = {
  publicUrl: "http://localhost:5173",
  defaultProvider: "tokenlab" as AgentProvider,
  defaultModel: "claude-3-5-sonnet-20241022",
  defaultTemperature: 0.7,
  tokenlabBaseUrl: "https://api.lemondata.io/v1",
  openrouterBaseUrl: "https://openrouter.ai/api/v1",
  openrouterReferer: "https://auto-company.local",
  customBaseUrl: "",
  emailFrom: "onboarding@resend.dev",
  executeRateLimitMax: 10,
  authRateLimitMax: 30,
  shellTimeoutMs: 30_000,
  schedulerTickMs: 60_000,
};

export interface ResolvedPlatformSettings {
  publicUrl: string;
  defaultProvider: AgentProvider;
  defaultModel: string;
  defaultTemperature: number;
  executeRateLimitMax: number;
  authRateLimitMax: number;
  shellTimeoutMs: number;
  schedulerTickMs: number;
  emailFrom: string;
  openrouterReferer: string;
  providers: {
    tokenlab: { apiKey: string; baseURL: string };
    openrouter: { apiKey: string; baseURL: string };
    custom: { apiKey: string; baseURL: string };
  };
  resendApiKey: string;
  githubApiKey: string;
}

export type PlatformSettingsPublic = Omit<
  PlatformSettings,
  "tokenlabApiKey" | "openrouterApiKey" | "customApiKey" | "resendApiKey" | "githubApiKey"
> & {
  tokenlabApiKey: string | null;
  openrouterApiKey: string | null;
  customApiKey: string | null;
  resendApiKey: string | null;
  githubApiKey: string | null;
};

let cache: ResolvedPlatformSettings | null = null;

function envFallbackImport(): Partial<PlatformSettings> {
  const data: Partial<PlatformSettings> = {};

  if (process.env.PUBLIC_URL) data.publicUrl = process.env.PUBLIC_URL;
  else if (process.env.CORS_ORIGIN) data.publicUrl = process.env.CORS_ORIGIN;

  if (process.env.DEFAULT_PROVIDER) {
    data.defaultProvider = process.env.DEFAULT_PROVIDER as AgentProvider;
  }
  if (process.env.DEFAULT_MODEL) data.defaultModel = process.env.DEFAULT_MODEL;
  if (process.env.DEFAULT_TEMPERATURE) {
    data.defaultTemperature = parseFloat(process.env.DEFAULT_TEMPERATURE);
  }
  if (process.env.TOKENLAB_BASE_URL) data.tokenlabBaseUrl = process.env.TOKENLAB_BASE_URL;
  if (process.env.OPENROUTER_BASE_URL) data.openrouterBaseUrl = process.env.OPENROUTER_BASE_URL;
  if (process.env.OPENROUTER_REFERER) data.openrouterReferer = process.env.OPENROUTER_REFERER;
  if (process.env.CUSTOM_BASE_URL) data.customBaseUrl = process.env.CUSTOM_BASE_URL;
  if (process.env.EMAIL_FROM) data.emailFrom = process.env.EMAIL_FROM;
  if (process.env.EXECUTE_RATE_LIMIT_MAX) {
    data.executeRateLimitMax = Number(process.env.EXECUTE_RATE_LIMIT_MAX);
  }
  if (process.env.AUTH_RATE_LIMIT_MAX) {
    data.authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX);
  }
  if (process.env.SHELL_TIMEOUT_MS) {
    data.shellTimeoutMs = Number(process.env.SHELL_TIMEOUT_MS);
  }
  if (process.env.SCHEDULER_TICK_MS) {
    data.schedulerTickMs = Number(process.env.SCHEDULER_TICK_MS);
  }

  if (process.env.TOKENLAB_API_KEY) {
    data.tokenlabApiKey = encryptSecret(process.env.TOKENLAB_API_KEY);
  }
  if (process.env.OPENROUTER_API_KEY) {
    data.openrouterApiKey = encryptSecret(process.env.OPENROUTER_API_KEY);
  }
  if (process.env.CUSTOM_API_KEY) {
    data.customApiKey = encryptSecret(process.env.CUSTOM_API_KEY);
  }
  if (process.env.RESEND_API_KEY) {
    data.resendApiKey = encryptSecret(process.env.RESEND_API_KEY);
  }
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) {
    data.githubApiKey = encryptSecret(process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN!);
  }

  return data;
}

function resolveSettings(row: PlatformSettings | null): ResolvedPlatformSettings {
  const publicUrl = row?.publicUrl ?? PLATFORM_SETTINGS_DEFAULTS.publicUrl;
  const defaultProvider = row?.defaultProvider ?? PLATFORM_SETTINGS_DEFAULTS.defaultProvider;
  const defaultModel = row?.defaultModel ?? PLATFORM_SETTINGS_DEFAULTS.defaultModel;
  const defaultTemperature = row?.defaultTemperature ?? PLATFORM_SETTINGS_DEFAULTS.defaultTemperature;

  return {
    publicUrl,
    defaultProvider,
    defaultModel,
    defaultTemperature,
    executeRateLimitMax: row?.executeRateLimitMax ?? PLATFORM_SETTINGS_DEFAULTS.executeRateLimitMax,
    authRateLimitMax: row?.authRateLimitMax ?? PLATFORM_SETTINGS_DEFAULTS.authRateLimitMax,
    shellTimeoutMs: row?.shellTimeoutMs ?? PLATFORM_SETTINGS_DEFAULTS.shellTimeoutMs,
    schedulerTickMs: row?.schedulerTickMs ?? PLATFORM_SETTINGS_DEFAULTS.schedulerTickMs,
    emailFrom: row?.emailFrom ?? PLATFORM_SETTINGS_DEFAULTS.emailFrom,
    openrouterReferer: row?.openrouterReferer ?? PLATFORM_SETTINGS_DEFAULTS.openrouterReferer,
    resendApiKey: decryptSecret(row?.resendApiKey) ?? "",
    githubApiKey: decryptSecret(row?.githubApiKey) ?? "",
    providers: {
      tokenlab: {
        apiKey: decryptSecret(row?.tokenlabApiKey) ?? "",
        baseURL: row?.tokenlabBaseUrl ?? PLATFORM_SETTINGS_DEFAULTS.tokenlabBaseUrl,
      },
      openrouter: {
        apiKey: decryptSecret(row?.openrouterApiKey) ?? "",
        baseURL: row?.openrouterBaseUrl ?? PLATFORM_SETTINGS_DEFAULTS.openrouterBaseUrl,
      },
      custom: {
        apiKey: decryptSecret(row?.customApiKey) ?? "",
        baseURL: row?.customBaseUrl ?? PLATFORM_SETTINGS_DEFAULTS.customBaseUrl,
      },
    },
  };
}

export function getPlatformSettingsSync(): ResolvedPlatformSettings {
  if (cache) return cache;
  return resolveSettings(null);
}

export async function warmPlatformSettingsCache(): Promise<ResolvedPlatformSettings> {
  const row = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID } });
  cache = resolveSettings(row);
  return cache;
}

export function invalidatePlatformSettingsCache(): void {
  cache = null;
}

export async function ensurePlatformSettings(): Promise<PlatformSettings> {
  const existing = await prisma.platformSettings.findUnique({ where: { id: PLATFORM_SETTINGS_ID } });
  if (existing) return existing;

  const imported = envFallbackImport();
  return prisma.platformSettings.create({
    data: {
      id: PLATFORM_SETTINGS_ID,
      ...PLATFORM_SETTINGS_DEFAULTS,
      ...imported,
    },
  });
}

export async function getPlatformSettings(): Promise<ResolvedPlatformSettings> {
  await ensurePlatformSettings();
  return warmPlatformSettingsCache();
}

export function toPublicPlatformSettings(row: PlatformSettings): PlatformSettingsPublic {
  return {
    ...row,
    tokenlabApiKey: maskSecret(row.tokenlabApiKey),
    openrouterApiKey: maskSecret(row.openrouterApiKey),
    customApiKey: maskSecret(row.customApiKey),
    resendApiKey: maskSecret(row.resendApiKey),
    githubApiKey: maskSecret(row.githubApiKey),
  };
}

export type PlatformSettingsUpdateInput = {
  publicUrl?: string;
  defaultProvider?: AgentProvider;
  defaultModel?: string;
  defaultTemperature?: number;
  tokenlabApiKey?: string;
  tokenlabBaseUrl?: string;
  openrouterApiKey?: string;
  openrouterBaseUrl?: string;
  openrouterReferer?: string;
  customApiKey?: string;
  customBaseUrl?: string;
  resendApiKey?: string;
  githubApiKey?: string;
  emailFrom?: string;
  executeRateLimitMax?: number;
  authRateLimitMax?: number;
  shellTimeoutMs?: number;
  schedulerTickMs?: number;
};

function mergeSecretField(
  incoming: string | undefined,
  existing: string | null | undefined,
): string | null | undefined {
  if (incoming === undefined) return undefined;
  if (!incoming || incoming === "••••••••") return existing ?? null;
  return encryptSecret(incoming);
}

export async function updatePlatformSettings(
  input: PlatformSettingsUpdateInput,
): Promise<PlatformSettingsPublic> {
  await ensurePlatformSettings();
  const existing = await prisma.platformSettings.findUniqueOrThrow({
    where: { id: PLATFORM_SETTINGS_ID },
  });

  const updated = await prisma.platformSettings.update({
    where: { id: PLATFORM_SETTINGS_ID },
    data: {
      publicUrl: input.publicUrl,
      defaultProvider: input.defaultProvider,
      defaultModel: input.defaultModel,
      defaultTemperature: input.defaultTemperature,
      tokenlabBaseUrl: input.tokenlabBaseUrl,
      openrouterBaseUrl: input.openrouterBaseUrl,
      openrouterReferer: input.openrouterReferer,
      customBaseUrl: input.customBaseUrl,
      emailFrom: input.emailFrom,
      executeRateLimitMax: input.executeRateLimitMax,
      authRateLimitMax: input.authRateLimitMax,
      shellTimeoutMs: input.shellTimeoutMs,
      schedulerTickMs: input.schedulerTickMs,
      tokenlabApiKey: mergeSecretField(input.tokenlabApiKey, existing.tokenlabApiKey),
      openrouterApiKey: mergeSecretField(input.openrouterApiKey, existing.openrouterApiKey),
      customApiKey: mergeSecretField(input.customApiKey, existing.customApiKey),
      resendApiKey: mergeSecretField(input.resendApiKey, existing.resendApiKey),
      githubApiKey: mergeSecretField(input.githubApiKey, existing.githubApiKey),
    },
  });

  invalidatePlatformSettingsCache();
  const resolved = await warmPlatformSettingsCache();
  const activeProvider = resolved.defaultProvider;
  const activeKey = resolved.providers[activeProvider]?.apiKey;
  if (!activeKey) {
    throw new Error(
      `Missing API key for platform provider "${activeProvider}". Configure it before saving.`,
    );
  }

  await syncAgentsToPlatformLlmSettings(resolved);

  return toPublicPlatformSettings(updated);
}

export async function syncAgentsToPlatformLlmSettings(
  settings?: Pick<ResolvedPlatformSettings, "defaultProvider" | "defaultModel">,
): Promise<number> {
  const resolved = settings ?? (await warmPlatformSettingsCache());
  const result = await prisma.agent.updateMany({
    data: {
      provider: resolved.defaultProvider,
      model: resolved.defaultModel,
    },
  });
  return result.count;
}
