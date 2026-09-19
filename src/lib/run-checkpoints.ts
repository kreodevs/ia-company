import type { RunCheckpointKind, RunCheckpointStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function createRunCheckpoint(input: {
  runId: string;
  tenantId?: string | null;
  kind: RunCheckpointKind;
  title?: string | null;
  payload?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const row = await prisma.runCheckpoint.create({
    data: {
      runId: input.runId,
      tenantId: input.tenantId ?? null,
      kind: input.kind,
      title: input.title ?? null,
      payload: (input.payload ?? {}) as object,
      status: "pending",
    },
    select: { id: true },
  });
  return row;
}

export async function resolveRunCheckpoint(input: {
  id: string;
  resolution: Record<string, unknown>;
  status?: RunCheckpointStatus;
}): Promise<void> {
  await prisma.runCheckpoint.update({
    where: { id: input.id },
    data: {
      status: input.status ?? "resolved",
      resolution: input.resolution as object,
      resolvedAt: new Date(),
    },
  });
}

export async function listPendingRunCheckpoints(runId: string) {
  return prisma.runCheckpoint.findMany({
    where: { runId, status: "pending" },
    orderBy: { createdAt: "asc" },
  });
}

export async function resolveCheckpointsForRun(
  runId: string,
  kind: RunCheckpointKind,
  resolution: Record<string, unknown>,
): Promise<void> {
  await prisma.runCheckpoint.updateMany({
    where: { runId, kind, status: "pending" },
    data: {
      status: "resolved",
      resolution: resolution as object,
      resolvedAt: new Date(),
    },
  });
}
