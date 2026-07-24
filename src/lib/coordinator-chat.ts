import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { generateText } from "ai";
import { prisma } from "./prisma.js";
import { createLanguageModel, estimateCostUsd } from "../core/providers.js";
import { getPlatformSettingsSync } from "./platform-settings.js";
import { resolveEffectiveModel, tenantLlmFromRecord } from "./tenant-llm.js";
import { getTenantMonthlyUsage } from "./usage-limits.js";
import { planOfficeTask, type OfficeTaskPlan } from "./office-coordinator.js";
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

function buildScopeBlock(
  productId: string | undefined,
  products: Array<{ id: string; name: string }>,
): string {
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

function extractTaskRequest(messages: CoordinatorChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.trim());
  if (userMessages.length === 0) return "";
  if (userMessages.length === 1) return userMessages[0]!;
  const last = userMessages[userMessages.length - 1]!;
  if (last.length >= 20) return last;
  return userMessages.slice(-3).join("\n");
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
    /investig|validar|lanzar|implement|marketing|pricing|feature|revis|auditor|analiz/i.test(task);

  return planSignals || (userAction && task.length >= 24);
}

export async function chatWithCoordinator(
  tenantId: string,
  input: {
    messages: CoordinatorChatMessage[];
    productId?: string;
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

  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const platform = getPlatformSettingsSync();
  const { model } = resolveEffectiveModel("inherit", tenantLlm);
  const languageModel = createLanguageModel({
    provider: platform.defaultProvider,
    model,
    temperature: 0.65,
  });

  const system = [
    systemBase,
    "",
    buildChatContextBlock(usage),
    "",
    buildScopeBlock(input.productId, products),
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
  const costUsd = estimateCostUsd(platform.defaultProvider, model, promptTokens, completionTokens);

  let plan: OfficeTaskPlan | null = null;
  if (shouldAttachPlan(input.messages, response.text, input.requestPlan === true)) {
    const taskRequest = extractTaskRequest([
      ...input.messages,
      { role: "assistant", content: response.text },
    ]);
    if (taskRequest.length >= 12) {
      try {
        plan = await planOfficeTask(tenantId, taskRequest, {
          productId: input.productId,
          serviceId: input.serviceId,
        });
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
