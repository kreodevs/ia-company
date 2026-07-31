import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prisma } from "./prisma.js";
import { getTenantMonthlyUsage } from "./usage-limits.js";
import { loadOrgUnitContext } from "./org-context.js";
import { listTenantProducts } from "./product-registry.js";

const REPO_ROOT =
  process.env.NODE_ENV === "production" ? process.cwd() : resolve(import.meta.dirname, "../..");

export async function loadCoordinatorSystemPrompt(tenantId: string): Promise<string> {
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

export function buildChatContextBlock(usage: Awaited<ReturnType<typeof getTenantMonthlyUsage>>): string {
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

export async function buildScopeBlock(
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

export interface CoordinatorChatScope {
  productId?: string;
  orgUnitId?: string;
  serviceId?: string;
  requestPlan?: boolean;
}

function buildStreamToolsBlock(requestPlan?: boolean): string {
  const lines = [
    "## Herramientas",
    "- `ask_clarifying_questions`: úsala cuando falte contexto (1–4 preguntas concretas). No propongas equipo hasta tener respuestas.",
    "- `propose_office_task`: úsala cuando el brief esté listo. Incluye un taskBrief consolidado (markdown breve con **Objetivo:**).",
    "- Nunca digas que ya ejecutaste algo — solo propones; el fundador aprueba en la UI.",
  ];
  if (requestPlan) {
    lines.push(
      "- El fundador pidió explícitamente un **plan de equipo**: prioriza `propose_office_task` si el brief es suficiente; si no, `ask_clarifying_questions` primero.",
    );
  }
  return lines.join("\n");
}

export async function buildCoordinatorSystemPrompt(
  tenantId: string,
  scope: CoordinatorChatScope,
): Promise<string> {
  const [systemBase, usage, products] = await Promise.all([
    loadCoordinatorSystemPrompt(tenantId),
    getTenantMonthlyUsage(tenantId),
    listTenantProducts(tenantId),
  ]);

  const scopeBlock = await buildScopeBlock(tenantId, scope.productId, scope.orgUnitId, products);

  return [
    systemBase,
    "",
    buildChatContextBlock(usage),
    "",
    scopeBlock,
    "",
    "## Modo conversación",
    "Responde en español salvo que el fundador escriba en otro idioma.",
    "Sé breve (2–4 párrafos máximo).",
    "Cuando propongas un equipo, describe quién participa, coste estimado, tiempo y entregable en tu mensaje antes o después de llamar a la herramienta.",
    "",
    buildStreamToolsBlock(scope.requestPlan),
  ].join("\n");
}

export function parseCoordinatorStreamScope(
  forwardedProps: Record<string, unknown>,
): CoordinatorChatScope {
  return {
    productId:
      typeof forwardedProps.productId === "string" && forwardedProps.productId.trim()
        ? forwardedProps.productId
        : undefined,
    orgUnitId:
      typeof forwardedProps.orgUnitId === "string" && forwardedProps.orgUnitId.trim()
        ? forwardedProps.orgUnitId
        : undefined,
    serviceId:
      typeof forwardedProps.serviceId === "string" && forwardedProps.serviceId.trim()
        ? forwardedProps.serviceId
        : undefined,
    requestPlan: forwardedProps.requestPlan === true,
  };
}
