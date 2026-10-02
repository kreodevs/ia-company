/**
 * Session deliverables — GAP-009 (dedupe entregables en el runtime de sesiones).
 *
 * El DAG legacy registra en `ExecutionRun.sharedMemory._history` los flags
 * `wroteDocs` / `savedDeliverablePath` (vía `agentWroteDocsInStep` + convergencia),
 * lo que permite a `shouldSkipHandoffDocPersist` evitar duplicar documentos y a
 * `loadRunDocuments` mostrar los entregables reales.
 *
 * El runtime de sesiones escribe los entregables en workspaces aislados
 * (`projects/{tenant}/sessions/{sessionId}/`) y nunca toca `_history`, por lo que
 * los documentos eran invisibles en `/office/encargos/:id` y cualquier convergencia
 * posterior habría persistido duplicados.
 *
 * Este módulo cierra el GAP: extrae los `write_file` bajo `docs/` de la sesión,
 * espeja los archivos al workspace del run (producto o tenant) y hace upsert de una
 * entrada `_history` idempotente (stepId = sessionId) con los mismos flags.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SessionToolCallRecord } from "../core/agent-loop/types.js";
import type { SharedMemory } from "../types/index.js";
import { agentDocsPath } from "./workspace-layout.js";
import { prisma } from "./prisma.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";
import { resolveTenantWorkspaceRoot } from "./tenant-workspace.js";

export interface SessionDocWrite {
  /** Ruta relativa normalizada bajo docs/ (siempre `docs/...`). */
  path: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Extrae, de los tool calls de una sesión, las rutas de `write_file` que caen
 * bajo `docs/` (opcionalmente restringidas al rol del agente). Ignora llamadas
 * con error y normaliza separadores Windows. Determinista y sin duplicados.
 */
export function extractSessionWrites(
  toolCalls: ReadonlyArray<SessionToolCallRecord>,
  agentName?: string | null,
): SessionDocWrite[] {
  const rolePrefix = agentName
    ? `${agentDocsPath(agentName).replace(/\\/g, "/")}/`
    : null;

  const seen = new Set<string>();
  const writes: SessionDocWrite[] = [];

  for (const call of toolCalls) {
    if (call.toolName !== "write_file") continue;
    if (call.status === "error") continue;

    const result = asRecord(call.resultJson);
    const args = asRecord(call.argsJson);
    const raw =
      (typeof result?.path === "string" && result.path) ||
      (typeof args?.path === "string" && args.path) ||
      (typeof args?.file_path === "string" && args.file_path) ||
      "";
    const path = raw.replace(/\\/g, "/");
    if (!path.startsWith("docs/")) continue;
    if (rolePrefix && !path.startsWith(rolePrefix)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    writes.push({ path });
  }

  return writes;
}

/** Boolean wrapper: ¿la sesión escribió algún documento elegible? */
export function sessionWroteDocsInTurn(
  toolCalls: ReadonlyArray<SessionToolCallRecord>,
  agentName?: string | null,
): boolean {
  return extractSessionWrites(toolCalls, agentName).length > 0;
}

/**
 * Copia los archivos escritos en el workspace aislado de la sesión al workspace
 * del run (producto/tenant), preservando la ruta relativa. Devuelve las rutas
 * espejadas (relativas al workspace destino) que efectivamente existían.
 */
export async function mirrorSessionWritesToRunWorkspace(input: {
  sessionWorkspaceRoot: string;
  runWorkspaceRoot: string;
  writes: ReadonlyArray<SessionDocWrite>;
}): Promise<string[]> {
  const mirrored: string[] = [];
  for (const write of input.writes) {
    const source = join(input.sessionWorkspaceRoot, write.path);
    const target = join(input.runWorkspaceRoot, write.path);
    try {
      await mkdir(dirname(target), { recursive: true });
      await copyFile(source, target);
      mirrored.push(write.path);
    } catch {
      // Archivo inexistente/ilegible: se omite sin romper el cierre de sesión.
    }
  }
  return mirrored;
}

function upsertHistoryEntry(memory: SharedMemory, entry: {
  stepId: string;
  agentName: string;
  output: string;
  timestamp: string;
  stepOrder?: number;
  wroteDocs?: boolean;
  savedDeliverablePath?: string;
}): SharedMemory {
  const history = Array.isArray(memory._history) ? [...memory._history] : [];
  const index = history.findIndex((h) => h?.stepId === entry.stepId);
  if (index >= 0) {
    const prev = history[index];
    history[index] = {
      ...prev,
      ...entry,
      // Conservar el primer path persistido; no retroceder flags.
      wroteDocs: entry.wroteDocs || prev?.wroteDocs === true,
      savedDeliverablePath: entry.savedDeliverablePath?.trim() || prev?.savedDeliverablePath,
    };
  } else {
    history.push(entry);
  }
  return { ...memory, _history: history };
}

/**
 * Cierre de entregables de una sesión (best-effort, idempotente):
 * 1. Lee los `SessionToolCall` de la sesión.
 * 2. Extrae y espeja los writes bajo `docs/` al workspace del run.
 * 3. Hace upsert de la entrada `_history` (stepId = sessionId) con `wroteDocs`
 *    y `savedDeliverablePath`, tal como espera la convergencia legacy.
 */
export async function finalizeSessionDeliverables(input: {
  runId: string;
  sessionId: string;
  agentName: string;
  sessionWorkspaceRoot: string;
  tenantId?: string | null;
  productSlug?: string | null;
  finalOutput?: string | null;
}): Promise<{ mirrored: string[]; wroteDocs: boolean }> {
  const toolCalls = await prisma.sessionToolCall.findMany({
    where: { sessionId: input.sessionId },
    select: { toolName: true, argsJson: true, resultJson: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const writes = extractSessionWrites(
    toolCalls.map((tc) => ({
      toolName: tc.toolName,
      argsJson: (tc.argsJson ?? {}) as Record<string, unknown>,
      resultJson: tc.resultJson,
      status: tc.status,
    })),
    input.agentName,
  );

  const runWorkspaceRoot = input.productSlug
    ? resolveProductWorkspaceRoot(input.productSlug)
    : input.tenantId
      ? resolveTenantWorkspaceRoot(input.tenantId)
      : null;

  const mirrored = runWorkspaceRoot
    ? await mirrorSessionWritesToRunWorkspace({
        sessionWorkspaceRoot: input.sessionWorkspaceRoot,
        runWorkspaceRoot,
        writes,
      })
    : [];

  const wroteDocs = writes.length > 0;

  // stepOrder = posición de la sesión dentro del run (orden de creación).
  const session = await prisma.agentSession.findUnique({
    where: { id: input.sessionId },
    select: { createdAt: true },
  });
  let stepOrder: number | undefined;
  if (session) {
    const earlier = await prisma.agentSession.count({
      where: { runId: input.runId, createdAt: { lt: session.createdAt } },
    });
    stepOrder = earlier + 1;
  }

  const run = await prisma.executionRun.findUnique({
    where: { id: input.runId },
    select: { sharedMemory: true },
  });
  if (!run) return { mirrored, wroteDocs };

  const memory = (run.sharedMemory ?? {}) as SharedMemory;
  const updated = upsertHistoryEntry(memory, {
    stepId: input.sessionId,
    agentName: input.agentName,
    output: input.finalOutput?.trim() || "",
    timestamp: new Date().toISOString(),
    stepOrder,
    wroteDocs,
    savedDeliverablePath: mirrored[0],
  });

  await prisma.executionRun.update({
    where: { id: input.runId },
    data: { sharedMemory: updated as never },
  });

  return { mirrored, wroteDocs };
}
