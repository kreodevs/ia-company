import { randomBytes } from "node:crypto";
import type { EncargoDelivery } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getOfficeEncargoDetail } from "./office-encargos.js";
import { getPlatformSettingsSync } from "./platform-settings.js";

export interface EncargoDeliverySummary {
  id: string;
  token: string;
  label: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  includeFinalReport: boolean;
  documentIds: string[];
  createdAt: string;
  publicUrl: string;
}

export interface PublicDeliveryDocument {
  id: string;
  title: string;
  agentName: string;
  markdown: string;
}

export interface PublicDeliveryPayload {
  label: string | null;
  expired: boolean;
  revoked: boolean;
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

function deliveryPublicUrl(token: string): string {
  const base = getPlatformSettingsSync().publicUrl.replace(/\/$/, "");
  return `${base}/d/${token}`;
}

function parseDocumentIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
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
    createdAt: row.createdAt.toISOString(),
    publicUrl: deliveryPublicUrl(row.token),
  };
}

function isExpired(row: EncargoDelivery): boolean {
  return row.expiresAt != null && row.expiresAt.getTime() <= Date.now();
}

async function assertRunInTenant(tenantId: string, runId: string): Promise<void> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    select: { id: true },
  });
  if (!run) throw Object.assign(new Error("Encargo not found"), { statusCode: 404 });
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
    includeFinalReport?: boolean;
    documentIds?: string[];
    createdByUserId?: string;
  },
): Promise<EncargoDeliverySummary> {
  await assertRunInTenant(tenantId, runId);

  const expiresAt =
    input.expiresAt === undefined || input.expiresAt === null || input.expiresAt === ""
      ? null
      : new Date(input.expiresAt);
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw Object.assign(new Error("Invalid expiresAt"), { statusCode: 400 });
  }

  const row = await prisma.encargoDelivery.create({
    data: {
      tenantId,
      runId,
      token: randomBytes(24).toString("base64url"),
      label: input.label?.trim() || null,
      expiresAt,
      includeFinalReport: input.includeFinalReport ?? true,
      documentIds: input.documentIds ?? [],
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

export async function getPublicDeliveryByToken(token: string): Promise<PublicDeliveryPayload | null> {
  const row = await prisma.encargoDelivery.findUnique({ where: { token } });
  if (!row) return null;

  const expired = isExpired(row);
  const revoked = row.revokedAt != null;
  const detail = await getOfficeEncargoDetail(row.tenantId, row.runId);
  if (!detail) return null;

  const allowedDocIds = parseDocumentIds(row.documentIds);
  const documents = detail.documents
    .filter((doc) => allowedDocIds.length === 0 || allowedDocIds.includes(doc.id))
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      agentName: doc.agentName,
      markdown: doc.markdown,
    }));

  const includeContent = !expired && !revoked;

  return {
    label: row.label,
    expired,
    revoked,
    encargo: {
      title: detail.title,
      request: detail.request,
      procedureLabel: detail.procedureLabel,
      departmentName: detail.orgUnitName ?? detail.departmentSlug,
      productName: detail.productName,
      phase: detail.phase,
      completedAt: detail.completedAt,
    },
    finalReport: includeContent && row.includeFinalReport ? detail.finalReport || null : null,
    documents: includeContent ? documents : [],
  };
}
