import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { generateText, type LanguageModel } from "ai";
import { prisma } from "./prisma.js";
import { createLanguageModel, estimateCostUsd, providerConfigFromResolved } from "../core/providers.js";
import { resolveChatLlmConfig, tenantLlmFromRecord } from "./tenant-llm.js";
import { getTenantMonthlyUsage } from "./usage-limits.js";
import { planOfficeTask, type OfficeTaskPlan } from "./office-coordinator.js";
import { loadOrgUnitContext } from "./org-context.js";
import { listTenantProducts } from "./product-registry.js";

const REPO_ROOT =
  process.env.NODE_ENV === "production" ? process.cwd() : resolve(import.meta.dirname, "../..");

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

async function loadCoordinatorSystemPrompt(tenantId: string): Promise<string> {
  const tenantAgent = await prisma.agent.findFirst({
    where: { tenantId, name: "coordinator-chief", isActive: true },
    select: { systemPrompt: true },
  });
  if (tenantAgent?.systemPrompt) return tenantAgent.systemPrompt;

  const platformAgent = await prisma.agent.findFirst({
    where: { tenantId: null, name: "coordinator-chief" },
    select: { systemPrompt: true },
  });
  if (platformAgent?.systemPrompt) return platformAgent.systemPrompt;

  try {
    const raw = await readFile(join(REPO_ROOT, "claude/agents/coordinator-chief.md"), "utf-8");
    const body = raw.replace(/^---[\s\S]*?---\r?\n/, "").trim();
    return body;
  } catch {
    return "Eres el Coordinador de la oficina virtual Auto-Company.";
  }
}

function buildChatContextBlock(usage: Awaited<ReturnType<typeof getTenantMonthlyUsage>>): string {
  const limit = usage.limits.maxCostUsdPerMonth;
  const spendLine = limit
    ? `$${usage.totalCostUsd.toFixed(2)} de $${limit.toFixed(0)} este mes`
    : `$${usage.totalCostUsd.toFixed(2)} este mes`;
  return [
    "## Contexto actual",
    `- Gasto: ${spendLine}`,
    `- Ejecuciones del mes: ${usage.runs}`,
    `- Modo: bajo demanda (nada corre sin aprobación del fundador)`,
  ].join("\n");
}

async function buildScopeBlock(
  tenantId: string,
  productId: string | undefined,
  orgUnitId: string | undefined,
  products: Array<{ id: string; name: string; orgUnitId?: string | null }>,
): Promise<string> {
  if (orgUnitId) {
    const orgCtx = await loadOrgUnitContext(tenantId, orgUnitId);
    const orgName = orgCtx?.orgUnitName ?? orgUnitId;
    const lines = [
      "## Alcance del encargo",
      "- Modo: **sala de juntas de departamento**",
      `- Departamento: **${orgName}**`,
    ];

    if (orgCtx?.orgUnitType === "marketing_agency") {
      lines.push(
        "- Tipo: agencia de marketing digital (copy, community/social, diseño, estrategia).",
      );
    } else if (orgCtx?.orgUnitType) {
      lines.push(`- Tipo de departamento: ${orgCtx.orgUnitType.replace(/_/g, " ")}`);
    }

    if (orgCtx?.suggestedAgentNames.length) {
      lines.push(
        `- Roster del departamento (${orgCtx.suggestedAgentNames.length} roles, ampliable sin límite): ${orgCtx.suggestedAgentNames.map((n) => `\`${n}\``).join(", ")}`,
      );
      lines.push(
        "- **No propongas agentes genéricos de plataforma** (p. ej. marketing-godin, research-thompson) si el departamento ya tiene especialistas propios.",
      );
    }

    if (orgCtx?.orgUnitDesignMd) {
      const snippet = orgCtx.orgUnitDesignMd.trim().slice(0, 400);
      lines.push("- Voz y entregables del department (design.md):", snippet);
    }

    if (productId) {
      const product = products.find((p) => p.id === productId);
      lines.push(`- Work item / producto seleccionado: **${product?.name ?? productId}**`);
      lines.push("- Contextualiza entregables a este work item.");
    } else {
      lines.push(
        "- **Sin producto seleccionado** en el selector de alcance: no asumas Alebrije MemorIA ni otro producto salvo que el fundador lo pida explícitamente.",
      );
    }

    return lines.join("\n");
  }

  if (productId) {
    const product = products.find((p) => p.id === productId);
    const name = product?.name ?? productId;
    return [
      "## Alcance del encargo",
      "- Modo: producto específico",
      `- Producto focal: **${name}**`,
      "- Contextualiza propuestas y entregables a este producto.",
    ].join("\n");
  }

  return [
    "## Alcance del encargo",
    "- Modo: exploración general (nivel empresa, sin producto focal)",
    "- No asumas un producto concreto ni lo incluyas en el plan salvo que el fundador lo pida.",
    "- Si la tarea podría aplicar a un producto concreto, **pregunta** si quiere alcance general o ligado a un producto antes de proponer equipo.",
  ].join("\n");
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
  input: {
    messages: CoordinatorChatMessage[];
    productId?: string;
    orgUnitId?: string;
    serviceId?: string;
    requestPlan?: boolean;
  },
): Promise<CoordinatorChatResponse> {
  if (!input.messages.length) {
    throw new Error("At least one message is required");
  }

  const [systemBase, usage, llmConfig, products] = await Promise.all([
    loadCoordinatorSystemPrompt(tenantId),
    getTenantMonthlyUsage(tenantId),
    prisma.tenantLlmConfig.findUnique({ where: { tenantId } }),
    listTenantProducts(tenantId),
  ]);

  const scopeBlock = await buildScopeBlock(tenantId, input.productId, input.orgUnitId, products);

  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const resolved = resolveChatLlmConfig(tenantLlm, { temperature: 0.65 });
  const languageModel = createLanguageModel(providerConfigFromResolved(resolved));

  const system = [
    systemBase,
    "",
    buildChatContextBlock(usage),
    "",
    scopeBlock,
    "",
    "## Modo conversación",
    "Responde en español salvo que el fundador escriba en otro idioma.",
    "Sé breve (2–4 párrafos máximo). Haz preguntas aclaratorias si falta contexto.",
    "Cuando tengas suficiente información para proponer un equipo, describe quién participa, coste estimado, tiempo y entregable.",
    "Nunca digas que ya ejecutaste algo — solo propones; el fundador aprueba en la UI.",
  ].join("\n");

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
