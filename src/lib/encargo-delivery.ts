import { randomBytes } from "node:crypto";
import type { EncargoDelivery, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getOfficeEncargoDetail, type OfficeEncargoDetail } from "./office-encargos.js";
import { getPlatformSettingsSync } from "./platform-settings.js";
import { sendRunNotificationEmail } from "./email.js";
import { createTenantNotification } from "./tenant-notifications.js";
import { getTenantDeliveryBranding, type TenantDeliveryBrandingDto } from "./tenant-delivery-branding.js";
import { buildDeliveryExportHtml, buildDeliveryMarkdownBundle } from "./delivery-export.js";

export type { TenantDeliveryBrandingDto };

export interface EncargoDeliverySummary {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  includeFinalReport: boolean;
  documentIds: string[];
  firstViewedAt: string | null;
  viewCount: number;
  recipientEmail: string | null;
  emailedAt: string | null;
  createdAt: string;
  publicUrl: string;
}

export interface PublicDeliveryDocument {
  id: string;
  title: string;
  agentName: string;
  markdown: string;
}

export interface PublicDeliveryBranding {
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  footerText: string | null;
  confidentialityNotice: string | null;
  contactEmail: string | null;
}

export interface PublicDeliveryPayload {
  label: string | null;
  expired: boolean;
  revoked: boolean;
  branding: PublicDeliveryBranding;
  encargo: {
    title: string;
    request: string;
    procedureLabel: string;
    departmentName: string | null;
    productName: string | null;
    phase: string;
    completedAt: string | null;
  };
  finalReport: string | null;
  documents: PublicDeliveryDocument[];
}

export interface DeliveryContentSnapshot {
  encargo: PublicDeliveryPayload["encargo"];
  finalReport: string | null;
  documents: PublicDeliveryDocument[];
}

function deliveryPublicUrl(token: string): string {
  const base = getPlatformSettingsSync().publicUrl.replace(/\/$/, "");
  return `${base}/d/${token}`;
}

function parseDocumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

function isExpired(row: EncargoDelivery): boolean {
  return row.expiresAt != null && row.expiresAt.getTime() <= Date.now();
}

function toBrandingPayload(branding: TenantDeliveryBrandingDto): PublicDeliveryBranding {
  return {
    tenantName: branding.tenantName,
    logoUrl: branding.logoUrl,
    primaryColor: branding.primaryColor,
    footerText: branding.footerText,
    confidentialityNotice: branding.confidentialityNotice,
    contactEmail: branding.contactEmail,
  };
}

function buildSnapshotFromDetail(
  detail: OfficeEncargoDetail,
  includeFinalReport: boolean,
  documentIds: string[],
): DeliveryContentSnapshot {
  const allowedDocIds = documentIds;
  const documents = detail.documents
    .filter((doc) => allowedDocIds.length === 0 || allowedDocIds.includes(doc.id))
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      agentName: doc.agentName,
      markdown: doc.markdown,
    }));

  return {
    encargo: {
      title: detail.title,
      request: detail.request,
      procedureLabel: detail.procedureLabel,
      departmentName: detail.orgUnitName ?? detail.departmentSlug,
      productName: detail.productName,
      phase: detail.phase,
      completedAt: detail.completedAt,
    },
    finalReport: includeFinalReport ? detail.finalReport || null : null,
    documents,
  };
}

function readSnapshot(value: unknown): DeliveryContentSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as DeliveryContentSnapshot;
  if (!row.encargo || typeof row.encargo.title !== "string") return null;
  return row;
}

function toSummary(row: EncargoDelivery): EncargoDeliverySummary {
  return {
    id: row.id,
    token: row.token,
    label: row.label,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    includeFinalReport: row.includeFinalReport,
    documentIds: parseDocumentIds(row.documentIds),
    firstViewedAt: row.firstViewedAt?.toISOString() ?? null,
    viewCount: row.viewCount,
    recipientEmail: row.recipientEmail,
    emailedAt: row.emailedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    publicUrl: deliveryPublicUrl(row.token),
  };
}

async function assertRunInTenant(tenantId: string, runId: string): Promise<void> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    select: { id: true },
  });
  if (!run) throw Object.assign(new Error("Encargo not found"), { statusCode: 404 });
}

export function resolveExpiryDate(preset: string | undefined, customIso?: string | null): Date | null {
  if (customIso) {
    const custom = new Date(customIso);
    if (!Number.isNaN(custom.getTime())) return custom;
  }
  const now = Date.now();
  switch (preset) {
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now + 90 * 24 * 60 * 60 * 1000);
    case "never":
    case "":
    case undefined:
      return null;
    default:
      return null;
  }
}

export async function listEncargoDeliveries(
  tenantId: string,
  runId: string,
): Promise<EncargoDeliverySummary[]> {
  await assertRunInTenant(tenantId, runId);
  const rows = await prisma.encargoDelivery.findMany({
    where: { tenantId, runId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toSummary);
}

export async function createEncargoDelivery(
  tenantId: string,
  runId: string,
  input: {
    label?: string;
    expiresAt?: string | null;
    expiryPreset?: string;
    includeFinalReport?: boolean;
    documentIds?: string[];
    createdByUserId?: string;
  },
): Promise<EncargoDeliverySummary> {
  await assertRunInTenant(tenantId, runId);
  const detail = await getOfficeEncargoDetail(tenantId, runId);
  if (!detail) throw Object.assign(new Error("Encargo not found"), { statusCode: 404 });

  const expiresAt =
    input.expiresAt !== undefined && input.expiresAt !== null && input.expiresAt !== ""
      ? new Date(input.expiresAt)
      : resolveExpiryDate(input.expiryPreset);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw Object.assign(new Error("Invalid expiresAt"), { statusCode: 400 });
  }

  const documentIds = input.documentIds ?? [];
  const includeFinalReport = input.includeFinalReport ?? true;
  const snapshot = buildSnapshotFromDetail(detail, includeFinalReport, documentIds);

  const row = await prisma.encargoDelivery.create({
    data: {
      tenantId,
      runId,
      token: randomBytes(24).toString("base64url"),
      label: input.label?.trim() || null,
      expiresAt,
      includeFinalReport,
      documentIds,
      contentSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      createdByUserId: input.createdByUserId ?? null,
    },
  });
  return toSummary(row);
}

export async function revokeEncargoDelivery(
  tenantId: string,
  runId: string,
  deliveryId: string,
): Promise<EncargoDeliverySummary | null> {
  const existing = await prisma.encargoDelivery.findFirst({
    where: { id: deliveryId, tenantId, runId },
  });
  if (!existing) return null;
  if (existing.revokedAt) return toSummary(existing);

  const row = await prisma.encargoDelivery.update({
    where: { id: deliveryId },
    data: { revokedAt: new Date() },
  });
  return toSummary(row);
}

export async function rotateEncargoDeliveryToken(
  tenantId: string,
  runId: string,
  deliveryId: string,
): Promise<EncargoDeliverySummary | null> {
  const existing = await prisma.encargoDelivery.findFirst({
    where: { id: deliveryId, tenantId, runId },
  });
  if (!existing || existing.revokedAt) return null;

  const row = await prisma.encargoDelivery.update({
    where: { id: deliveryId },
    data: {
      token: randomBytes(24).toString("base64url"),
      firstViewedAt: null,
      viewCount: 0,
    },
  });
  return toSummary(row);
}

export async function sendEncargoDeliveryEmail(
  tenantId: string,
  runId: string,
  deliveryId: string,
  input: { to: string; subject?: string; message?: string },
): Promise<EncargoDeliverySummary | null> {
  const row = await prisma.encargoDelivery.findFirst({
    where: { id: deliveryId, tenantId, runId },
  });
  if (!row || row.revokedAt || isExpired(row)) return null;

  const summary = toSummary(row);
  const branding = await getTenantDeliveryBranding(tenantId);
  const subject =
    input.subject?.trim() ||
    `${branding.tenantName}: ${summary.label ?? "Entrega de encargo"}`;
  const intro = input.message?.trim() || "Te compartimos la entrega solicitada.";
  const html = `<p>${intro}</p><p><strong>${branding.tenantName}</strong></p><p><a href="${summary.publicUrl}">${summary.publicUrl}</a></p><p style="font-size:12px;color:#64748b;">Este enlace es de solo lectura${summary.expiresAt ? ` y caduca el ${new Date(summary.expiresAt).toLocaleDateString()}` : ""}.</p>`;

  await sendRunNotificationEmail({ to: [input.to.trim()], subject, html });

  const updated = await prisma.encargoDelivery.update({
    where: { id: deliveryId },
    data: { recipientEmail: input.to.trim(), emailedAt: new Date() },
  });
  return toSummary(updated);
}

async function recordDeliveryView(row: EncargoDelivery): Promise<void> {
  const firstView = row.firstViewedAt == null;
  await prisma.encargoDelivery.update({
    where: { id: row.id },
    data: {
      viewCount: { increment: 1 },
      firstViewedAt: row.firstViewedAt ?? new Date(),
    },
  });

  if (firstView) {
    await createTenantNotification({
      tenantId: row.tenantId,
      type: "delivery_viewed",
      title: "Cliente abrió la entrega",
      body: `Primera visita al enlace «${row.label ?? "sin nombre"}».`,
      href: `/office/encargos/${row.runId}`,
      runId: row.runId,
    }).catch(() => undefined);
  }
}

function buildPayloadFromRow(
  row: EncargoDelivery,
  branding: PublicDeliveryBranding,
  includeContent: boolean,
  snapshotOverride?: DeliveryContentSnapshot | null,
): PublicDeliveryPayload {
  const snapshot = snapshotOverride ?? readSnapshot(row.contentSnapshot);
  const encargo =
    snapshot?.encargo ??
    ({
      title: "",
      request: "",
      procedureLabel: "",
      departmentName: null,
      productName: null,
      phase: "delivered",
      completedAt: null,
    } satisfies PublicDeliveryPayload["encargo"]);

  return {
    label: row.label,
    expired: isExpired(row),
    revoked: row.revokedAt != null,
    branding,
    encargo,
    finalReport: includeContent ? (snapshot?.finalReport ?? null) : null,
    documents: includeContent ? (snapshot?.documents ?? []) : [],
  };
}

export async function getPublicDeliveryByToken(token: string): Promise<PublicDeliveryPayload | null> {
  const row = await prisma.encargoDelivery.findUnique({ where: { token } });
  if (!row) return null;

  const branding = toBrandingPayload(await getTenantDeliveryBranding(row.tenantId));
  const expired = isExpired(row);
  const revoked = row.revokedAt != null;
  const includeContent = !expired && !revoked;

  let snapshot = readSnapshot(row.contentSnapshot);
  if (!snapshot && includeContent) {
    const detail = await getOfficeEncargoDetail(row.tenantId, row.runId);
    if (!detail) return null;
    snapshot = buildSnapshotFromDetail(
      detail,
      row.includeFinalReport,
      parseDocumentIds(row.documentIds),
    );
  }

  if (includeContent) {
    await recordDeliveryView(row);
  }

  return buildPayloadFromRow(row, branding, includeContent, snapshot);
}

async function resolveDeliveryPayloadForExport(token: string): Promise<{
  payload: PublicDeliveryPayload;
  branding: TenantDeliveryBrandingDto;
} | null> {
  const row = await prisma.encargoDelivery.findUnique({ where: { token } });
  if (!row || row.revokedAt || isExpired(row)) return null;

  let snapshot = readSnapshot(row.contentSnapshot);
  if (!snapshot) {
    const detail = await getOfficeEncargoDetail(row.tenantId, row.runId);
    if (!detail) return null;
    snapshot = buildSnapshotFromDetail(
      detail,
      row.includeFinalReport,
      parseDocumentIds(row.documentIds),
    );
  }

  const branding = await getTenantDeliveryBranding(row.tenantId);
  const payload = buildPayloadFromRow(
    row,
    toBrandingPayload(branding),
    true,
    snapshot,
  );
  return { payload, branding };
}

export async function getDeliveryExportHtml(token: string): Promise<string | null> {
  const resolved = await resolveDeliveryPayloadForExport(token);
  if (!resolved) return null;
  return buildDeliveryExportHtml(resolved.payload, resolved.branding);
}

export async function getDeliveryMarkdownExport(token: string): Promise<string | null> {
  const resolved = await resolveDeliveryPayloadForExport(token);
  if (!resolved) return null;
  return buildDeliveryMarkdownBundle(resolved.payload);
}

export function previewDeliveryPayload(
  detail: OfficeEncargoDetail,
  branding: TenantDeliveryBrandingDto,
  input: {
    label?: string;
    includeFinalReport?: boolean;
    documentIds?: string[];
  },
): PublicDeliveryPayload {
  const snapshot = buildSnapshotFromDetail(
    detail,
    input.includeFinalReport ?? true,
    input.documentIds ?? [],
  );
  return {
    label: input.label?.trim() || null,
    expired: false,
    revoked: false,
    branding: toBrandingPayload(branding),
    encargo: snapshot.encargo,
    finalReport: snapshot.finalReport,
    documents: snapshot.documents,
  };
}
