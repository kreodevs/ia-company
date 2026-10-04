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

export function appendStrategicContextToTask(task: string, context: ResolvedStrategicContext | null): string {
  if (!context) return task;
  return `${task.trim()}\n\n---\nContexto estratégico\n${context.promptBlock}`;
}

export async function attachStrategicLinkToRun(
  runId: string,
  tenantId: string,
  context: ResolvedStrategicContext | null,
): Promise<void> {
  if (!context) return;
  await prisma.executionRun.updateMany({
    where: { id: runId, tenantId },
    data: {
      companyGoalId: context.companyGoalId,
      initiativeId: context.initiativeId,
    },
  });
}
