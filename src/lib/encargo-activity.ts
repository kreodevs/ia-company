/**
 * Reingeniería 2, Fase A — timeline unificado del encargo.
 * Une eventos técnicos (ExecutionRunEvent), checkpoints (gobernanza) y
 * transiciones empresariales (handoffs) en una única línea de tiempo.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface EncargoActivityItem {
  id: string;
  /** category técnica | gobernanza | empresarial */
  category: "technical" | "governance" | "business";
  kind: string;
  title: string;
  detail: string | null;
  actor: string | null;
  runId: string;
  refId: string | null;
  href: string | null;
  createdAt: string;
}

function iso(value: Date): string {
  return value.toISOString();
}

/** Payload seguro: devuelve string de un campo si existe. */
function payloadString(payload: Prisma.JsonValue, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

const TECHNICAL_LABELS: Record<string, string> = {
  status: "Estado del run",
  log: "Registro",
  step_start: "Paso iniciado",
  step_complete: "Paso completado",
  error: "Error",
  done: "Ejecución finalizada",
  veto: "Veto registrado",
  session_started: "Sesión iniciada",
  turn_started: "Turno iniciado",
  tool_call: "Uso de herramienta",
  tool_result: "Resultado de herramienta",
  file_changed: "Archivo modificado",
  need_input: "Input requerido",
};

const GOVERNANCE_KINDS = new Set([
  "approval",
  "veto",
  "go_no_go",
  "opencode",
  "custom",
  "need_input",
  "tool_approval",
  "budget_exceeded",
]);

export async function getEncargoActivity(
  tenantId: string,
  runId: string,
  options: { limit?: number } = {},
): Promise<EncargoActivityItem[] | null> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    select: { id: true },
  });
  if (!run) return null;
  const limit = Math.min(200, Math.max(20, options.limit ?? 80));

  const [events, checkpoints, handoffs, reviews] = await Promise.all([
    prisma.executionRunEvent.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.runCheckpoint.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.departmentHandoff.findMany({
      where: { tenantId, OR: [{ fromWorkItem: { runId } }, { toWorkItem: { runId } }] },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.documentReview.findMany({
      where: { tenantId, runId },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const items: EncargoActivityItem[] = [];

  for (const event of events) {
    const isGovernance = GOVERNANCE_KINDS.has(event.type);
    items.push({
      id: `evt-${event.id}`,
      category: isGovernance ? "governance" : "technical",
      kind: event.type,
      title: TECHNICAL_LABELS[event.type] ?? event.type,
      detail:
        payloadString(event.payload, "message") ??
        payloadString(event.payload, "title") ??
        payloadString(event.payload, "path") ??
        payloadString(event.payload, "toolName") ??
        payloadString(event.payload, "status"),
      actor: payloadString(event.payload, "agentName") ?? payloadString(event.payload, "agent"),
      runId,
      refId: event.id,
      href: null,
      createdAt: iso(event.createdAt),
    });
  }

  for (const checkpoint of checkpoints) {
    items.push({
      id: `chk-${checkpoint.id}`,
      category: "governance",
      kind: checkpoint.kind,
      title:
        checkpoint.status === "resolved"
          ? "Checkpoint resuelto"
          : checkpoint.status === "expired"
            ? "Checkpoint expirado"
            : "Checkpoint pendiente",
      detail: checkpoint.title ?? payloadString(checkpoint.payload, "question") ?? null,
      actor: payloadString(checkpoint.resolution ?? {}, "resolvedBy"),
      runId,
      refId: checkpoint.id,
      href: null,
      createdAt: iso(checkpoint.updatedAt),
    });
  }

  for (const handoff of handoffs) {
    items.push({
      id: `hnd-${handoff.id}`,
      category: "business",
      kind: `handoff_${handoff.status}`,
      title: `Handoff ${handoff.fromDepartmentSlug ?? "?"} → ${handoff.toDepartmentSlug ?? "?"}`,
      detail: handoff.message,
      actor: handoff.acceptedBy,
      runId,
      refId: handoff.id,
      href: null,
      createdAt: iso(handoff.createdAt),
    });
  }

  for (const review of reviews) {
    items.push({
      id: `rev-${review.id}`,
      category: "governance",
      kind: `doc_review_${review.status}`,
      title: `Revisión de documento: ${review.docKey}`,
      detail: null,
      actor: review.resolvedBy,
      runId,
      refId: review.id,
      href: null,
      createdAt: iso(review.updatedAt),
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items.slice(0, limit);
}
