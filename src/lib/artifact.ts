import type { ArtifactStatus, ArtifactType, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export function serializeArtifact(row: {
  id: string;
  tenantId: string;
  orgUnitId: string;
  productId: string | null;
  runId: string | null;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string;
  body: unknown;
  previewText: string | null;
  createdByAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    orgUnitId: row.orgUnitId,
    productId: row.productId,
    runId: row.runId,
    type: row.type,
    status: row.status,
    title: row.title,
    body: row.body,
    previewText: row.previewText,
    createdByAgent: row.createdByAgent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listArtifacts(
  tenantId: string,
  filters: { orgUnitId?: string; productId?: string; type?: ArtifactType; limit?: number },
) {
  const rows = await prisma.artifact.findMany({
    where: {
      tenantId,
      ...(filters.orgUnitId ? { orgUnitId: filters.orgUnitId } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 100,
  });
  return rows.map(serializeArtifact);
}

export async function createArtifact(
  tenantId: string,
  input: {
    orgUnitId: string;
    productId?: string;
    runId?: string;
    type?: ArtifactType;
    status?: ArtifactStatus;
    title: string;
    body?: Record<string, unknown>;
    previewText?: string;
    createdByAgent?: string;
  },
) {
  const org = await prisma.orgUnit.findFirst({
    where: { id: input.orgUnitId, tenantId },
  });
  if (!org) throw new Error("Org unit not found");

  const row = await prisma.artifact.create({
    data: {
      tenantId,
      orgUnitId: input.orgUnitId,
      productId: input.productId ?? null,
      runId: input.runId ?? null,
      type: input.type ?? "other",
      status: input.status ?? "draft",
      title: input.title.trim(),
      body: (input.body ?? {}) as Prisma.InputJsonValue,
      previewText: input.previewText?.slice(0, 2000) ?? null,
      createdByAgent: input.createdByAgent ?? null,
    },
  });
  return serializeArtifact(row);
}

export async function updateArtifactStatus(
  tenantId: string,
  id: string,
  status: ArtifactStatus,
) {
  const row = await prisma.artifact.findFirst({ where: { id, tenantId } });
  if (!row) return null;
  const updated = await prisma.artifact.update({
    where: { id },
    data: { status },
  });
  return serializeArtifact(updated);
}
