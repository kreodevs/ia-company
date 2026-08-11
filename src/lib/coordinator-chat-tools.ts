import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { planOfficeTask, type OfficeTaskPlan } from "./office-coordinator.js";
import type { CoordinatorChatScope } from "./coordinator-chat-context.js";

export interface CoordinatorToolContext extends CoordinatorChatScope {
  tenantId: string;
}

const clarifyingQuestionsOutputSchema = z.object({
  questions: z.array(z.string()),
  contextSummary: z.string(),
  delivered: z.boolean(),
});

const officeTaskPlanSchema = z.object({
  planId: z.string(),
  request: z.string(),
  summary: z.string(),
  coordinatorNoteKey: z.string(),
  agents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      reasonKey: z.string(),
    }),
  ),
  missingAgentRoles: z.array(
    z.object({
      name: z.string(),
      suggestedBrief: z.string(),
    }),
  ),
  workflowId: z.string().nullable(),
  workflowName: z.string().nullable(),
  presetId: z.string().nullable(),
  productId: z.string().nullable(),
  productName: z.string().nullable(),
  deliverableKey: z.string(),
  estimatedCostUsd: z.object({ min: z.number(), max: z.number() }),
  estimatedMinutes: z.object({ min: z.number(), max: z.number() }),
  mode: z.enum(["workflow", "team", "single"]),
  serviceId: z.string().nullable(),
  rationale: z.string().optional(),
});

export const askClarifyingQuestionsDef = toolDefinition({
  name: "ask_clarifying_questions",
  description:
    "Formula preguntas aclaratorias cuando el brief del fundador es vago o falta contexto crítico (alcance, producto, entregable, plazo).",
  inputSchema: z.object({
    questions: z.array(z.string().min(4)).min(1).max(4),
    contextSummary: z.string().min(8).describe("Resumen breve de lo que ya se sabe"),
  }),
  outputSchema: clarifyingQuestionsOutputSchema,
});

export const proposeOfficeTaskDef = toolDefinition({
  name: "propose_office_task",
  description:
    "Propone un equipo de agentes, workflow y coste estimado cuando el brief está listo para ejecutarse.",
  inputSchema: z.object({
    taskBrief: z
      .string()
      .min(12)
      .describe("Brief consolidado en markdown; empieza con **Objetivo:**"),
    rationale: z.string().min(8).describe("Por qué este equipo y entregable"),
  }),
  outputSchema: officeTaskPlanSchema,
});

export function createCoordinatorChatTools() {
  const askClarifyingQuestions = askClarifyingQuestionsDef.server(async (input) => ({
    questions: input.questions,
    contextSummary: input.contextSummary,
    delivered: true,
  }));

  const proposeOfficeTask = proposeOfficeTaskDef.server<CoordinatorToolContext>(
    async (input, ctx) => {
      const plan = await planOfficeTask(ctx.context.tenantId, input.taskBrief, {
        productId: ctx.context.productId,
        orgUnitId: ctx.context.orgUnitId,
        serviceId: ctx.context.serviceId,
      });

      const enriched: OfficeTaskPlan & { rationale: string } = {
        ...plan,
        request: input.taskBrief,
        summary: input.taskBrief.slice(0, 160),
        rationale: input.rationale,
      };

      return enriched;
    },
  );

  return [askClarifyingQuestions, proposeOfficeTask];
}
