import { generateText, type LanguageModel } from "ai";
import { prisma } from "./prisma.js";
import { createLanguageModel, estimateCostUsd, providerConfigFromResolved } from "../core/providers.js";
import { resolveChatLlmConfig, tenantLlmFromRecord } from "./tenant-llm.js";
import { planOfficeTask, type OfficeTaskPlan } from "./office-coordinator.js";
import {
  buildCoordinatorSystemPrompt,
  type CoordinatorChatScope,
} from "./coordinator-chat-context.js";

export interface CoordinatorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoordinatorChatResponse {
  reply: string;
  plan: OfficeTaskPlan | null;
  tokensUsed: number;
  costUsd: number;
}

/** Last user line — used only for service keyword matching. */
export function extractTaskRequest(messages: CoordinatorChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.trim());
  if (userMessages.length === 0) return "";
  return userMessages[userMessages.length - 1]!;
}

/** Deterministic brief when LLM synthesis is unavailable. */
export function buildTaskBriefFromConversation(messages: CoordinatorChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.trim());
  if (userMessages.length === 0) return "";
  if (userMessages.length === 1) return userMessages[0]!;

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.content.trim().length > 0)
    ?.content.trim();

  const prior = userMessages.slice(0, -1);
  const current = userMessages[userMessages.length - 1]!;

  const sections = [
    prior.length > 0
      ? `Contexto del fundador (mensajes previos):\n${prior.map((line, i) => `${i + 1}. ${line}`).join("\n")}`
      : "",
    `Encargo acordado:\n${current}`,
    lastAssistant
      ? `Acuerdo del coordinador (última respuesta):\n${lastAssistant.slice(0, 2000)}`
      : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

export async function synthesizeOfficeTaskBrief(
  messages: CoordinatorChatMessage[],
  languageModel: LanguageModel,
): Promise<string> {
  const conversation = messages
    .filter((m) => m.content.trim())
    .map((m) => `${m.role === "user" ? "Fundador" : "Coordinador"}: ${m.content.trim()}`)
    .join("\n\n");

  if (!conversation.trim()) return "";

  const result = await generateText({
    model: languageModel,
    system: [
      "Consolida la conversación en un brief único para agentes IA que ejecutarán el encargo.",
      "Incluye: objetivo, alcance, entregables esperados y restricciones mencionadas.",
      "No inventes requisitos que no aparezcan en la conversación.",
      "Escribe en el mismo idioma que el fundador.",
      "Formato: markdown breve; empieza con **Objetivo:**",
    ].join("\n"),
    prompt: conversation,
    maxTokens: 1200,
    temperature: 0.25,
  });

  const brief = result.text.trim();
  return brief.length >= 12 ? brief : buildTaskBriefFromConversation(messages);
}

async function resolveTaskBriefForPlan(
  messages: CoordinatorChatMessage[],
  languageModel: LanguageModel,
): Promise<string> {
  if (messages.filter((m) => m.role === "user").length <= 1) {
    return extractTaskRequest(messages);
  }
  try {
    return await synthesizeOfficeTaskBrief(messages, languageModel);
  } catch {
    return buildTaskBriefFromConversation(messages);
  }
}

function shouldAttachPlan(
  messages: CoordinatorChatMessage[],
  reply: string,
  explicitPlan: boolean,
): boolean {
  if (explicitPlan) return true;
  const task = extractTaskRequest(messages);
  if (task.length < 12) return false;

  const planSignals =
    /equipo|presupuesto|propongo|plan|agentes|coste|entregable|¿apruebas|listo para/i.test(reply);
  const userAction =
    /investig|validar|lanzar|implement|marketing|pricing|feature|revis|auditor|analiz|diseñ|funcional/i.test(
      task,
    );

  return planSignals || (userAction && task.length >= 24);
}

export async function chatWithCoordinator(
  tenantId: string,
  input: CoordinatorChatScope & {
    messages: CoordinatorChatMessage[];
    requestPlan?: boolean;
  },
): Promise<CoordinatorChatResponse> {
  if (!input.messages.length) {
    throw new Error("At least one message is required");
  }

  const scope: CoordinatorChatScope = {
    productId: input.productId,
    orgUnitId: input.orgUnitId,
    serviceId: input.serviceId,
    requestPlan: input.requestPlan,
  };

  const [system, llmConfig] = await Promise.all([
    buildCoordinatorSystemPrompt(tenantId, scope),
    prisma.tenantLlmConfig.findUnique({ where: { tenantId } }),
  ]);

  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const resolved = resolveChatLlmConfig(tenantLlm, { temperature: 0.65 });
  const languageModel = createLanguageModel(providerConfigFromResolved(resolved));

  const response = await generateText({
    model: languageModel,
    system,
    messages: input.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    maxTokens: 900,
    temperature: 0.65,
  });

  const promptTokens = response.usage?.promptTokens ?? 0;
  const completionTokens = response.usage?.completionTokens ?? 0;
  const tokensUsed = promptTokens + completionTokens;
  const costUsd = estimateCostUsd(resolved.provider, resolved.model, promptTokens, completionTokens);

  let plan: OfficeTaskPlan | null = null;
  const allMessages: CoordinatorChatMessage[] = [
    ...input.messages,
    { role: "assistant", content: response.text },
  ];

  if (shouldAttachPlan(input.messages, response.text, input.requestPlan === true)) {
    const matchHint = extractTaskRequest(allMessages);
    const taskBrief = await resolveTaskBriefForPlan(allMessages, languageModel);

    if (taskBrief.length >= 12) {
      try {
        plan = await planOfficeTask(tenantId, matchHint || taskBrief, {
          productId: input.productId,
          orgUnitId: input.orgUnitId,
          serviceId: input.serviceId,
        });
        if (plan) {
          plan = {
            ...plan,
            request: taskBrief,
            summary: taskBrief.slice(0, 160),
          };
        }
      } catch {
        plan = null;
      }
    }
  }

  return {
    reply: response.text.trim(),
    plan,
    tokensUsed,
    costUsd,
  };
}
