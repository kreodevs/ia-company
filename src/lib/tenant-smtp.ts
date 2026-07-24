import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "./prisma.js";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto.js";
import {
  assertDailyEmailQuota,
  assertEmailContentLimits,
  parseRecipientList,
  validateOutboundRecipients,
} from "./tenant-email-guardrails.js";

export interface TenantSmtpPublic {
  tenantId: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpEnabled: boolean;
  smtpAllowedRecipients: string | null;
  smtpMaxPerDay: number;
  smtpConfigured: boolean;
}

export interface TenantIntegrationsPublic extends TenantSmtpPublic {
  githubToken: string | null;
  githubUsername: string | null;
  githubConfigured: boolean;
}

function rowToSmtpPublic(
  tenantId: string,
  row: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpFromEmail: string | null;
    smtpFromName: string | null;
    smtpEnabled: boolean;
    smtpAllowedRecipients: string | null;
    smtpMaxPerDay: number;
  } | null,
): TenantSmtpPublic {
  const password = row?.smtpPassword ?? null;
  return {
    tenantId,
    smtpHost: row?.smtpHost ?? null,
    smtpPort: row?.smtpPort ?? null,
    smtpSecure: row?.smtpSecure ?? true,
    smtpUser: row?.smtpUser ?? null,
    smtpPassword: maskSecret(password),
    smtpFromEmail: row?.smtpFromEmail ?? null,
    smtpFromName: row?.smtpFromName ?? null,
    smtpEnabled: row?.smtpEnabled ?? false,
    smtpAllowedRecipients: row?.smtpAllowedRecipients ?? null,
    smtpMaxPerDay: row?.smtpMaxPerDay ?? 20,
    smtpConfigured: Boolean(row?.smtpHost && row?.smtpFromEmail && password && decryptSecret(password)),
  };
}

export async function resolveTenantSmtpConfig(tenantId: string) {
  const row = await prisma.tenantIntegrationConfig.findUnique({ where: { tenantId } });
  if (!row?.smtpEnabled || !row.smtpHost || !row.smtpFromEmail) return null;

  const password = decryptSecret(row.smtpPassword);
  if (!password) return null;

  return {
    host: row.smtpHost,
    port: row.smtpPort ?? (row.smtpSecure ? 465 : 587),
    secure: row.smtpSecure,
    auth: row.smtpUser ? { user: row.smtpUser, pass: password } : undefined,
    fromEmail: row.smtpFromEmail,
    fromName: row.smtpFromName ?? undefined,
    maxPerDay: row.smtpMaxPerDay,
  };
}

function createTransport(config: NonNullable<Awaited<ReturnType<typeof resolveTenantSmtpConfig>>>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

export async function testTenantSmtpConnection(tenantId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const config = await resolveTenantSmtpConfig(tenantId);
  if (!config) {
    return { ok: false, message: "SMTP is not fully configured or not enabled for this tenant" };
  }

  let transport: Transporter | null = null;
  try {
    transport = createTransport(config);
    await transport.verify();
    return { ok: true, message: "SMTP connection verified" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "SMTP verification failed",
    };
  } finally {
    transport?.close();
  }
}

function markdownToSimpleHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!doctype html><html><body>${paragraphs}</body></html>`;
}

export async function sendTenantAgentEmail(input: {
  tenantId: string;
  runId?: string;
  agentId?: string;
  to: string[];
  subject: string;
  body: string;
}): Promise<{ messageId: string; recipients: string[] }> {
  const config = await resolveTenantSmtpConfig(input.tenantId);
  if (!config) {
    throw new Error("Tenant SMTP is not configured or disabled");
  }

  assertEmailContentLimits(input.subject, input.body);
  await assertDailyEmailQuota(input.tenantId, config.maxPerDay);
  const recipients = await validateOutboundRecipients(input.tenantId, input.to);

  const from = config.fromName
    ? `"${config.fromName.replace(/"/g, "")}" <${config.fromEmail}>`
    : config.fromEmail;

  const transport = createTransport(config);
  try {
    const result = await transport.sendMail({
      from,
      to: recipients.join(", "),
      subject: input.subject.trim(),
      text: input.body,
      html: markdownToSimpleHtml(input.body),
    });

    await prisma.tenantEmailSendLog.create({
      data: {
        tenantId: input.tenantId,
        runId: input.runId,
        agentId: input.agentId,
        toRecipients: recipients.join(", "),
        subject: input.subject.trim(),
      },
    });

    return { messageId: result.messageId, recipients };
  } finally {
    transport.close();
  }
}

export function mergeSmtpIntoIntegrationsPublic(
  tenantId: string,
  row: Awaited<ReturnType<typeof prisma.tenantIntegrationConfig.findUnique>>,
  githubPart: { githubToken: string | null; githubUsername: string | null; githubConfigured: boolean },
): TenantIntegrationsPublic {
  return {
    ...rowToSmtpPublic(tenantId, row),
    ...githubPart,
  };
}

export function smtpFieldsFromInput(input: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  smtpEnabled?: boolean;
  smtpAllowedRecipients?: string | null;
  smtpMaxPerDay?: number;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (input.smtpHost !== undefined) data.smtpHost = input.smtpHost?.trim() || null;
  if (input.smtpPort !== undefined) data.smtpPort = input.smtpPort;
  if (input.smtpSecure !== undefined) data.smtpSecure = input.smtpSecure;
  if (input.smtpUser !== undefined) data.smtpUser = input.smtpUser?.trim() || null;
  if (input.smtpFromEmail !== undefined) data.smtpFromEmail = input.smtpFromEmail?.trim() || null;
  if (input.smtpFromName !== undefined) data.smtpFromName = input.smtpFromName?.trim() || null;
  if (input.smtpEnabled !== undefined) data.smtpEnabled = input.smtpEnabled;
  if (input.smtpMaxPerDay !== undefined) data.smtpMaxPerDay = input.smtpMaxPerDay;
  if (input.smtpAllowedRecipients !== undefined) {
    const parsed = parseRecipientList(input.smtpAllowedRecipients);
    data.smtpAllowedRecipients = parsed.length > 0 ? parsed.join(", ") : null;
  }
  if (input.smtpPassword !== undefined) {
    const trimmed = input.smtpPassword?.trim();
    if (trimmed && trimmed !== "••••••••") {
      data.smtpPassword = encryptSecret(trimmed);
    } else if (trimmed === "" || trimmed === null) {
      data.smtpPassword = null;
    }
  }

  return data;
}
