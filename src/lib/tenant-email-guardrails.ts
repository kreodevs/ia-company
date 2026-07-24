import { prisma } from "./prisma.js";

const MAX_RECIPIENTS = 5;
const MAX_SUBJECT_LEN = 200;
const MAX_BODY_LEN = 100_000;

const BLOCKED_RECIPIENT_PATTERNS = [
  /@(?:tempmail|guerrillamail|mailinator)\./i,
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseRecipientList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(/[,;\n]+/).map(normalizeEmail).filter(Boolean))];
}

export async function resolveTenantEmailAllowlist(tenantId: string): Promise<Set<string>> {
  const [config, users] = await Promise.all([
    prisma.tenantIntegrationConfig.findUnique({ where: { tenantId } }),
    prisma.tenantUser.findMany({
      where: { tenantId, isActive: true },
      select: { email: true },
    }),
  ]);

  const allowed = new Set<string>();
  for (const user of users) {
    allowed.add(normalizeEmail(user.email));
  }
  for (const email of parseRecipientList(config?.smtpAllowedRecipients)) {
    allowed.add(email);
  }
  return allowed;
}

export async function countTenantEmailsSentToday(tenantId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.tenantEmailSendLog.count({
    where: { tenantId, sentAt: { gte: start } },
  });
}

export function assertEmailContentLimits(subject: string, body: string): void {
  if (!subject.trim()) throw new Error("Email subject is required");
  if (subject.length > MAX_SUBJECT_LEN) {
    throw new Error(`Email subject exceeds ${MAX_SUBJECT_LEN} characters`);
  }
  if (!body.trim()) throw new Error("Email body is required");
  if (body.length > MAX_BODY_LEN) {
    throw new Error(`Email body exceeds ${MAX_BODY_LEN} characters`);
  }
}

export async function validateOutboundRecipients(
  tenantId: string,
  recipients: string[],
): Promise<string[]> {
  const normalized = [...new Set(recipients.map(normalizeEmail).filter(Boolean))];
  if (normalized.length === 0) throw new Error("At least one recipient is required");
  if (normalized.length > MAX_RECIPIENTS) {
    throw new Error(`Maximum ${MAX_RECIPIENTS} recipients per email`);
  }

  for (const email of normalized) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    if (BLOCKED_RECIPIENT_PATTERNS.some((re) => re.test(email))) {
      throw new Error(`Recipient domain is not allowed: ${email}`);
    }
  }

  const allowlist = await resolveTenantEmailAllowlist(tenantId);
  if (allowlist.size === 0) {
    throw new Error(
      "No allowed email recipients configured. Add addresses in Settings → Integrations → SMTP.",
    );
  }

  const blocked = normalized.filter((email) => !allowlist.has(email));
  if (blocked.length > 0) {
    throw new Error(
      `Recipients not on allowlist: ${blocked.join(", ")}. Configure allowed addresses in tenant settings.`,
    );
  }

  return normalized;
}

export async function assertDailyEmailQuota(tenantId: string, maxPerDay: number): Promise<void> {
  const sentToday = await countTenantEmailsSentToday(tenantId);
  if (sentToday >= maxPerDay) {
    throw new Error(`Daily email limit reached (${maxPerDay}/day). Try again tomorrow.`);
  }
}
