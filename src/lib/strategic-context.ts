import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface StrategicLinkInput {
  companyGoalId?: string | null;
  initiativeId?: string | null;
}

export interface ResolvedStrategicContext {
  companyGoalId: string;
  initiativeId: string | null;
  companyGoalName: string;
  initiativeName: string | null;
  promptBlock: string;
  memoryFields: Record<string, string>;
}

/**
 * Valida y resuelve objetivo/iniciativa del tenant para un encargo.
 */
export async function resolveStrategicContext(
  tenantId: string,
  input: StrategicLinkInput,
): Promise<ResolvedStrategicContext | null> {
  const goalId = input.companyGoalId?.trim() || null;
  const initiativeId = input.initiativeId?.trim() || null;
  if (!goalId && !initiativeId) return null;

  if (initiativeId && !goalId) {
    const initiative = await prisma.initiative.findFirst({
      where: { id: initiativeId, tenantId },
      include: { companyGoal: true },
    });
    if (!initiative) throw new Error("Initiative not found for this tenant");
    return buildContext(initiative.companyGoal, initiative);
  }

  const goal = await prisma.companyGoal.findFirst({ where: { id: goalId!, tenantId } });
  if (!goal) throw new Error("Company goal not found for this tenant");

  if (initiativeId) {
    const initiative = await prisma.initiative.findFirst({
      where: { id: initiativeId, tenantId, companyGoalId: goal.id },
    });
    if (!initiative) throw new Error("Initiative does not belong to the selected goal");
    return buildContext(goal, initiative);
  }

  return buildContext(goal, null);
}

function buildContext(
  goal: { id: string; name: string; description: string | null; targetValue: number | null },
  initiative: { id: string; name: string; description: string | null; status: string | null } | null,
): ResolvedStrategicContext {
  const lines = [
    `Objetivo de empresa: ${goal.name}`,
    goal.description ? `Descripción del objetivo: ${goal.description}` : null,
    goal.targetValue != null ? `Meta del objetivo: ${goal.targetValue}%` : null,
    initiative ? `Iniciativa: ${initiative.name}` : null,
    initiative?.description ? `Descripción de la iniciativa: ${initiative.description}` : null,
    initiative?.status ? `Estado de la iniciativa: ${initiative.status}` : null,
    "Alinea entregables y decisiones con este contexto estratégico.",
  ].filter(Boolean) as string[];

  const promptBlock = lines.join("\n");
  const memoryFields: Record<string, string> = {
    companyGoalId: goal.id,
    companyGoalName: goal.name,
    strategicBrief: promptBlock,
  };
  if (initiative) {
    memoryFields.initiativeId = initiative.id;
    memoryFields.initiativeName = initiative.name;
  }

  return {
    companyGoalId: goal.id,
    initiativeId: initiative?.id ?? null,
    companyGoalName: goal.name,
    initiativeName: initiative?.name ?? null,
    promptBlock,
    memoryFields,
  };
}

const STRATEGIC_MARKER = "\n\n---\nContexto estratégico\n";

export function stripStrategicContextFromTask(task: string): string {
  const idx = task.indexOf(STRATEGIC_MARKER);
  return idx >= 0 ? task.slice(0, idx).trimEnd() : task.trim();
}

export function appendStrategicContextToTask(task: string, context: ResolvedStrategicContext | null): string {
  if (!context) return stripStrategicContextFromTask(task);
  const base = stripStrategicContextFromTask(task);
  return `${base}${STRATEGIC_MARKER}${context.promptBlock}`;
}

/** Re-sincroniza officeRequest/task del encargo tras editar vínculo estratégico (Fase F). */
export async function resyncEncargoTaskWithStrategicLink(
  tenantId: string,
  runId: string,
  context: ResolvedStrategicContext | null,
): Promise<void> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    select: { sharedMemory: true },
  });
  if (!run) return;

  const memory = { ...((run.sharedMemory ?? {}) as Record<string, unknown>) };
  const raw =
    (typeof memory.officeTaskBase === "string" && memory.officeTaskBase) ||
    (typeof memory.officeRequest === "string" && memory.officeRequest) ||
    (typeof memory.task === "string" && memory.task) ||
    null;
  if (!raw) return;

  const base = stripStrategicContextFromTask(raw);
  memory.officeTaskBase = base;
  const next = context ? appendStrategicContextToTask(base, context) : base;
  memory.officeRequest = next;
  memory.task = next;

  await prisma.executionRun.update({
    where: { id: runId },
    data: { sharedMemory: memory as Prisma.InputJsonValue },
  });
}

export interface StrategicContextFields {
  companyGoalId: string | null;
  companyGoalName: string | null;
  initiativeId: string | null;
  initiativeName: string | null;
}

/** Lee vínculo estratégico desde FK o sharedMemory (war room, entregas). */
export function readStrategicContextFromRun(run: {
  companyGoalId?: string | null;
  initiativeId?: string | null;
  sharedMemory?: unknown;
  companyGoal?: { id: string; name: string } | null;
  initiative?: { id: string; name: string } | null;
}): StrategicContextFields {
  const memory = (run.sharedMemory ?? {}) as Record<string, unknown>;
  const companyGoalId =
    run.companyGoalId ??
    (typeof memory.companyGoalId === "string" ? memory.companyGoalId : null);
  const initiativeId =
    run.initiativeId ??
    (typeof memory.initiativeId === "string" ? memory.initiativeId : null);
  const companyGoalName =
    run.companyGoal?.name ??
    (typeof memory.companyGoalName === "string" ? memory.companyGoalName : null);
  const initiativeName =
    run.initiative?.name ??
    (typeof memory.initiativeName === "string" ? memory.initiativeName : null);
  return { companyGoalId, companyGoalName, initiativeId, initiativeName };
}

export async function attachStrategicLinkToRun(
  runId: string,
  tenantId: string,
  context: ResolvedStrategicContext | null,
): Promise<void> {
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    select: { sharedMemory: true },
  });
  if (!run) throw new Error("Encargo not found");

  const memory = { ...((run.sharedMemory ?? {}) as Record<string, unknown>) };
  if (!context) {
    delete memory.companyGoalId;
    delete memory.companyGoalName;
    delete memory.initiativeId;
    delete memory.initiativeName;
    delete memory.strategicBrief;
    await prisma.executionRun.update({
      where: { id: runId },
      data: { companyGoalId: null, initiativeId: null, sharedMemory: memory as Prisma.InputJsonValue },
    });
    return;
  }

  Object.assign(memory, context.memoryFields);
  const taskRaw =
    (typeof memory.officeRequest === "string" && memory.officeRequest) ||
    (typeof memory.task === "string" && memory.task) ||
    null;
  if (taskRaw) {
    memory.officeTaskBase = stripStrategicContextFromTask(taskRaw);
  }
  await prisma.executionRun.update({
    where: { id: runId },
    data: {
      companyGoalId: context.companyGoalId,
      initiativeId: context.initiativeId,
      sharedMemory: memory as Prisma.InputJsonValue,
    },
  });
}

/** Actualiza vínculo estratégico de un encargo existente (Fase F). */
export async function updateEncargoStrategicLink(
  tenantId: string,
  runId: string,
  input: StrategicLinkInput,
): Promise<StrategicContextFields> {
  const hasLink =
    Boolean(input.companyGoalId?.trim()) || Boolean(input.initiativeId?.trim());
  const context = hasLink ? await resolveStrategicContext(tenantId, input) : null;
  await attachStrategicLinkToRun(runId, tenantId, context);
  await resyncEncargoTaskWithStrategicLink(tenantId, runId, context);
  const run = await prisma.executionRun.findFirst({
    where: { id: runId, tenantId },
    include: {
      companyGoal: { select: { id: true, name: true } },
      initiative: { select: { id: true, name: true } },
    },
  });
  if (!run) throw new Error("Encargo not found");
  return readStrategicContextFromRun(run);
}
