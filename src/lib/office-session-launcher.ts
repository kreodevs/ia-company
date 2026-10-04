/**
 * Office Session Launcher — Fase 0 (camino B).
 * Convierte un encargo de Office en un ExecutionRun(engine=session) con N AgentSession
 * y las encola para ejecución asíncrona vía BullMQ.
 */

import { prisma } from "./prisma.js";
import { executionRunCreateData } from "./run-scope.js";
import { createAgentSession, recordWorkspaceSnapshot } from "./session-store.js";
import { enqueueSessionRun, type SessionJobData } from "../worker/queue.js";
import { resolveTenantWorkspaceRoot } from "./tenant-workspace.js";
import { agentDocsPath } from "./workspace-layout.js";
import { slugifyProductName } from "./product-workspace.js";
import { persistAndPublishRunEvent } from "./run-events.js";
import { ensureSessionWorkspace, snapshotSessionWorkspace } from "./workspace-session.js";
import { assertTenantCanLaunchRun } from "./run-guards.js";
import type { AgentSessionConfig, AcceptanceCriterion, RunContextForSession } from "../core/agent-loop/types.js";
import type { OfficeTaskPlan } from "./office-coordinator.js";
import type { RunEngine } from "@prisma/client";

/** Input para lanzar un encargo con engine=session. */
export interface LaunchOfficeSessionInput {
  tenantId: string;
  plan: OfficeTaskPlan;
  request: string;
  orgUnitId?: string | null;
  productId?: string | null;
  /** Slug real del TenantProduct (obligatorio con productId; se resuelve de BD si falta). */
  productSlug?: string | null;
  parentRunId?: string | null;
  /** Skip active-run guard (p.ej. reanudación de revisión donde el run padre sigue AWAITING_USER). */
  allowActiveRun?: boolean;
  /** Override opcional por agente (role, goal, acceptanceCriteria, budgets, etc.). */
  agentOverrides?: Record<string, Partial<AgentSessionConfig>>;
  /** Memory inicial construida por workflows, consensos o schedulers. */
  initialMemory?: Record<string, unknown>;
  companyGoalId?: string | null;
  initiativeId?: string | null;
}

/** Resultado del lanzamiento. */
export interface LaunchOfficeSessionResult {
  runId: string;
  sessionIds: string[];
  workspacePath: string;
}

/**
 * Construye el workspacePath aislado para una sesión específica.
 * Crea projects/{tenant}/sessions/{sessionId}/ con layout docs/<role>/ y git history.
 */
async function buildWorkspacePath(
  tenantId: string,
  sessionId: string,
): Promise<string> {
  return ensureSessionWorkspace(tenantId, sessionId);
}

/**
 * Path absoluto (relativo al workspace) donde el agente debe dejar su entregable.
 * Usa la convención `docs/<role>/` de workspace-layout (agentDocsPath).
 */
export function deliverablePathForAgent(agentName: string, agentRole: string): string {
  const dir = agentDocsPath(agentName, { companyScoped: false });
  const roleTag = agentRole.split("-")[0] ?? "agent";
  const slug = slugifyProductName(agentName);
  return `${dir}/${roleTag}-${slug}.md`;
}

/**
 * Deriva acceptanceCriteria deterministas para el agente.
 *
 * IMPORTANTE: el verificador (acceptance.ts) infiere el path desde la descripción
 * con regex estrictas, así que el criterio SIEMPRE lleva un path concreto estilo
 * `file "docs/<role>/x.md"` que `inferPathFromDescription` captura. Nunca emitimos
 * kind "custom" con config vacía: ese criterio siempre falla y deadlockea el loop
 * hasta maxTurns.
 */
export function deriveAcceptanceCriteria(plan: OfficeTaskPlan, agent: OfficeTaskPlan["agents"][number]): AcceptanceCriterion[] {
  const relative = deliverablePathForAgent(agent.name, agent.role);
  const base: AcceptanceCriterion[] = [
    {
      id: `ac-${agent.name}-deliverable`,
      description: `file "${relative}" must exist and contain the deliverable for this encargo`,
      kind: "file_exists",
    },
  ];

  // Criterio extra alineado con la clave de entregable del servicio (si hay path).
  if (plan.deliverableKey) {
    base.push({
      id: `ac-${agent.name}-nonempty`,
      description: `The file "${relative}" must be non-empty (no blank report)`,
      kind: "file_contains",
    });
  }

  return base;
}

/**
 * Deriva goal específico para cada agente combinando el request global con su rol.
 * El goal ordena explícitamente escribir el entregable en `docs/<role>/` para que
 * el verificador de acceptance tenga evidencia real en el sistema de archivos.
 */
function deriveAgentGoal(agent: OfficeTaskPlan["agents"][number], request: string): string {
  const relative = deliverablePathForAgent(agent.name, agent.role);
  const roleContext = agent.role ? ` (role: ${agent.role})` : "";
  return [
    request,
    "",
    `Your role${roleContext}: contribute your expertise toward the shared objective.`,
    "",
    `Deliverable: write your report to file "${relative}" inside the workspace.`,
    "Use the write_file tool to create it; include concrete findings, decisions and next actions.",
  ].join("\n");
}

/**
 * Lanza un encargo de Office usando el runtime de sesiones (engine=session).
 * Crea ExecutionRun, N AgentSession (PENDING) y las encola.
 */
export async function launchOfficeSession(input: LaunchOfficeSessionInput): Promise<LaunchOfficeSessionResult> {
  const { tenantId, plan, request, orgUnitId, parentRunId, agentOverrides = {} } = input;
  const productId = input.productId ?? null;

  // 0. Guard dedicado de runs activos por tenant. El chokepoint del engine
  // (executeWorkflowInBackground) ya lo aplica, pero launchOfficeSession también
  // se invoca directo desde el coordinador de Oficina sin pasar por ahí.
  // allowActiveRun salta el guard solo en reanudaciones intencionadas.
  await assertTenantCanLaunchRun(tenantId, { allowActiveRun: input.allowActiveRun });

  // 1. Resolver slugs reales: productId sin slug explícito se consulta al TenantProduct.
  let productSlug: string | null = input.productSlug ?? null;
  if (productId && !productSlug) {
    productSlug = (
      await prisma.tenantProduct.findUnique({
        where: { id: productId },
        select: { slug: true },
      })
    )?.slug ?? null;
  }

  // 2. Crear ExecutionRun con engine=session
  const baseMemory = input.initialMemory ?? {};
  const plannedBudgetTokens = plan.agents.reduce(
    (sum, agent) => sum + (agent.budgets?.budgetTokens ?? 150_000),
    0,
  );
  const plannedBudgetUsd = plan.agents.reduce(
    (sum, agent) => sum + (agent.budgets?.budgetUsd ?? 5.0),
    0,
  );
  const runMemory: Record<string, unknown> = {
    ...baseMemory,
    budgetTokens: typeof baseMemory.budgetTokens === "number" ? baseMemory.budgetTokens : plannedBudgetTokens,
    budgetUsd: typeof baseMemory.budgetUsd === "number" ? baseMemory.budgetUsd : plannedBudgetUsd,
  };
  const run = await prisma.executionRun.create({
    data: executionRunCreateData({
      workflowId: plan.workflowId ?? null,
      tenantId,
      sharedMemory: {
        ...runMemory,
        task: runMemory.task ?? request,
        nextAction: runMemory.nextAction ?? request,
        officeRequest: runMemory.officeRequest ?? request,
        teamAgents: runMemory.teamAgents ?? plan.agents.map((a) => a.name),
        coordinatorNote:
          runMemory.coordinatorNote ?? "Launched via Office Session Launcher (engine=session)",
        ...(parentRunId ? { parentRunId } : {}),
        ...(productId ? { productId } : {}),
        ...(productSlug ? { focusProductSlug: productSlug } : {}),
        ...(orgUnitId ? { orgUnitId } : {}),
      },
      productId: productId ?? null,
      orgUnitId: orgUnitId ?? null,
      companyGoalId: input.companyGoalId ?? null,
      initiativeId: input.initiativeId ?? null,
      status: "PENDING",
      engine: "session" as RunEngine,
    }),
  });

  // 3. Para cada agente del plan, crear AgentSession PENDING con workspace aislado y encolar
  const sessionIds: string[] = [];
  let sessionWorkspacePath: string | null = null;

  for (const agent of plan.agents) {
    const override = agentOverrides[agent.name] ?? {};

    // Acceptance criteria: override > plan > derivación determinista.
    const acceptanceCriteria =
      override.acceptanceCriteria ?? agent.acceptanceCriteria ?? deriveAcceptanceCriteria(plan, agent);

    // Goal: del override o derivado (ordena escribir en docs/<role>/)
    const goal = override.goal ?? deriveAgentGoal(agent, request);

    // Budgets: override > plan > valores por defecto razonables.
    const maxTurns = override.maxTurns ?? agent.budgets?.maxTurns ?? 25;
    const budgetTokens = override.budgetTokens ?? agent.budgets?.budgetTokens ?? 150_000;
    const budgetUsd = override.budgetUsd ?? agent.budgets?.budgetUsd ?? 5.0;

    // Provider/model: del override o del agente (se resuelve en loop)
    const provider = override.provider ?? null;
    const model = override.model ?? null;
    const modelKind = override.modelKind ?? null;

    const session = await createAgentSession({
      config: {
        runId: run.id,
        tenantId,
        agentId: agent.id,
        role: agent.role,
        goal,
        acceptanceCriteria,
        workspacePath: "/__pending__", // real session workspace is built below with the session id
        provider,
        model,
        modelKind,
        maxTurns,
        budgetTokens,
        budgetUsd,
        ...override,
      },
      status: "PENDING",
    });
    sessionIds.push(session.id);

    // Workspace aislado de la sesión: projects/{tenant}/sessions/{sessionId}/
    const workspacePath = await buildWorkspacePath(tenantId, session.id);
    sessionWorkspacePath = workspacePath;
    await prisma.agentSession.update({
    where: { id: session.id },
    data: { workspacePath },
    });
    
    // Snapshot versionado inicial (git commit si hay cambios) — persistido para árbol API inmediato
    const initialSnapshot = await snapshotSessionWorkspace(workspacePath);
    await recordWorkspaceSnapshot({
      sessionId: session.id,
      runId: run.id,
      filesChanged: initialSnapshot.filesChanged,
      manifest: initialSnapshot.manifest as unknown as Record<string, unknown>,
      totalBytes: initialSnapshot.totalBytes,
      commitSha: initialSnapshot.commitSha ?? null,
    });
    
    // Publicar evento session_started con el workspace real (vía gateway/SSE)
    await persistAndPublishRunEvent(
    {
    type: "log",
    runId: run.id,
    timestamp: new Date().toISOString(),
    data: {
    sessionEvent: "session_workspace_ready",
    sessionId: session.id,
    workspacePath,
    agentName: agent.name,
    },
    },
    tenantId,
    );

    // 4. Enqueue solo la primera onda cuando el planner topológico está activo.
    // Las ondas posteriores se liberan por el processor cuando termina el join.
    const planner = baseMemory.sessionPlanner as { waves?: Array<{ wave: number; agentIds: string[] }> } | undefined;
    const firstWave = planner?.waves?.find((wave) => wave.wave === 0);
    const shouldEnqueue = !firstWave || firstWave.agentIds.includes(agent.id);
    if (shouldEnqueue) {
      const jobData: SessionJobData = {
      sessionId: session.id,
      runId: run.id,
      tenantId,
      ...(productSlug ? { productSlug } : {}),
      ...(productId ? { productId } : {}),
      };
      await enqueueSessionRun(jobData);
    }
  }

  // 5. Actualizar run a RUNNING (el worker lo confirmará al reclamar la primera sesión)
  await prisma.executionRun.update({
    where: { id: run.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  return { runId: run.id, sessionIds, workspacePath: sessionWorkspacePath ?? resolveTenantWorkspaceRoot(tenantId) };
}

/**
 * Reanuda una sesión específica (tras checkpoint need_input / tool_approval).
 * Útil para endpoint /office/sessions/:sessionId/resume.
 */
export async function resumeOfficeSession(
  sessionId: string,
  humanInput: string,
): Promise<void> {
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    select: { runId: true, tenantId: true },
  });
  if (!session?.runId) throw new Error(`Session ${sessionId} has no run`);
  const jobData: SessionJobData = {
    sessionId,
    runId: session.runId,
    tenantId: session.tenantId ?? undefined,
    resume: true,
    humanInput,
  };
  await enqueueSessionRun(jobData);
}

/**
 * Obtiene el contexto de ejecución (RunContextForSession) para pasar al loop.
 * Usado por el worker o tests.
 */
export function buildRunContextForSession(input: {
  runId: string;
  tenantId: string;
  productSlug?: string | null;
  productId?: string | null;
  githubToken?: string | null;
  sharedMemory?: Record<string, unknown>;
}): RunContextForSession {
  return {
    runId: input.runId,
    tenantId: input.tenantId,
    productSlug: input.productSlug ?? null,
    productId: input.productId ?? null,
    githubToken: input.githubToken ?? null,
    sharedMemory: input.sharedMemory ?? {},
  };
}