import type { ExecutionStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { assertTenantCanExecute, getTenantMonthlyUsage } from "./usage-limits.js";
import {
  ensureAgentTaskWorkflow,
  ensurePlatformWorkflowOnTenant,
  ensureTeamTaskWorkflow,
} from "../server/lib/clone-templates.js";
import { launchProductWork } from "./product-work-launcher.js";
import { WORKFLOW_NAMES, type WorkflowName } from "./workflow-names.js";
import { listTenantProducts } from "./product-registry.js";
import { loadOrgUnitContext, orgContextToInitialMemory, selectOrgAgentsForTask } from "./org-context.js";
import { launchOrgUnitWork } from "./org-launcher.js";
import { selectOfficeAgentsWithLlm } from "./office-coordinator-llm.js";
import {
  extractGitHubUrlFromText,
  fetchGitHubRepoContext,
  formatGitHubContextForAgents,
} from "./github-repo.js";
import { resolveTenantGithubToken } from "./tenant-integrations.js";
import { buildOfficeDepartmentRooms, type OfficeDepartmentRoom } from "./office-departments.js";
import { enrichDepartmentProcedureCounts } from "./office-procedures.js";
import { encargoActivityFields } from "./office-encargos.js";
import {
  agentNamesFromWorkflowSteps,
  officeLaunchMemoryFields,
} from "./office-run-department.js";

export type OfficeServiceCategory =
  | "research"
  | "build"
  | "launch"
  | "marketing"
  | "business"
  | "ops";

export interface OfficeServiceTemplate {
  id: string;
  category: OfficeServiceCategory;
  emoji: string;
  labelKey: string;
  descKey: string;
  examplePromptKey: string;
  workflowName?: WorkflowName;
  presetId?: string;
  agentNames: string[];
  deliverableKey: string;
  costPerAgentUsd: number;
  minutesPerAgent: number;
}

export interface OfficeTaskAgent {
  id: string;
  name: string;
  role: string;
  reasonKey: string;
}

export interface OfficeMissingAgentRole {
  name: string;
  suggestedBrief: string;
}

export interface OfficeTaskPlan {
  planId: string;
  request: string;
  summary: string;
  coordinatorNoteKey: string;
  agents: OfficeTaskAgent[];
  missingAgentRoles: OfficeMissingAgentRole[];
  workflowId: string | null;
  workflowName: string | null;
  presetId: string | null;
  productId: string | null;
  productName: string | null;
  deliverableKey: string;
  estimatedCostUsd: { min: number; max: number };
  estimatedMinutes: { min: number; max: number };
  mode: "workflow" | "team" | "single";
  serviceId: string | null;
}

export interface OfficeActivityItem {
  id: string;
  type: "run_active" | "run_completed" | "run_failed" | "decision_pending" | "schedule_upcoming";
  title: string;
  subtitle: string;
  timestamp: string;
  href: string | null;
  status?: ExecutionStatus | "pending_review";
  costUsd?: number;
  procedureLabel?: string | null;
  departmentSlug?: string | null;
  orgUnitName?: string | null;
}

export interface OfficeRoiProduct {
  id: string;
  name: string;
  slug: string;
  phase: string;
  revenueUsd: number;
  investedUsd: number;
  roiPct: number | null;
  runsCount: number;
}

export interface OfficeDashboard {
  mode: "on_demand" | "scheduled" | "autonomous";
  autonomyEnabled: boolean;
  usage: Awaited<ReturnType<typeof getTenantMonthlyUsage>>;
  stats: {
    activeRuns: number;
    pendingDecisions: number;
    agentsTotal: number;
    productsActive: number;
    totalInvestedUsd: number;
    totalRevenueUsd: number;
  };
  activity: OfficeActivityItem[];
  roi: OfficeRoiProduct[];
  agents: Array<{ id: string; name: string; role: string; status: "idle" | "busy" }>;
  services: OfficeServiceTemplate[];
  departments: OfficeDepartmentRoom[];
}

const COST_PER_AGENT = { min: 0.12, max: 0.45 };
const MINUTES_PER_AGENT = { min: 4, max: 12 };

export const OFFICE_SERVICES: OfficeServiceTemplate[] = [
  {
    id: "market-scan",
    category: "research",
    emoji: "🔍",
    labelKey: "office.serviceTemplates.marketScan.label",
    descKey: "office.serviceTemplates.marketScan.desc",
    examplePromptKey: "office.serviceTemplates.marketScan.example",
    workflowName: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY,
    agentNames: ["research-thompson", "ceo-bezos"],
    deliverableKey: "office.deliverables.marketReport",
    costPerAgentUsd: 0.25,
    minutesPerAgent: 8,
  },
  {
    id: "idea-validation",
    category: "research",
    emoji: "🎯",
    labelKey: "office.serviceTemplates.ideaValidation.label",
    descKey: "office.serviceTemplates.ideaValidation.desc",
    examplePromptKey: "office.serviceTemplates.ideaValidation.example",
    workflowName: WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION,
    agentNames: ["research-thompson", "ceo-bezos", "critic-munger", "cfo-campbell"],
    deliverableKey: "office.deliverables.goNoGo",
    costPerAgentUsd: 0.3,
    minutesPerAgent: 10,
  },
  {
    id: "feature-sprint",
    category: "build",
    emoji: "💻",
    labelKey: "office.serviceTemplates.featureSprint.label",
    descKey: "office.serviceTemplates.featureSprint.desc",
    examplePromptKey: "office.serviceTemplates.featureSprint.example",
    presetId: "feature-development",
    workflowName: WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
    agentNames: ["interaction-cooper", "ui-duarte", "fullstack-dhh", "qa-bach"],
    deliverableKey: "office.deliverables.featureShipped",
    costPerAgentUsd: 0.35,
    minutesPerAgent: 12,
  },
  {
    id: "product-launch",
    category: "launch",
    emoji: "🚀",
    labelKey: "office.serviceTemplates.productLaunch.label",
    descKey: "office.serviceTemplates.productLaunch.desc",
    examplePromptKey: "office.serviceTemplates.productLaunch.example",
    presetId: "product-launch",
    workflowName: WORKFLOW_NAMES.PRODUCT_LAUNCH,
    agentNames: ["qa-bach", "devops-hightower", "marketing-godin", "sales-ross"],
    deliverableKey: "office.deliverables.launchPack",
    costPerAgentUsd: 0.28,
    minutesPerAgent: 9,
  },
  {
    id: "pricing-review",
    category: "business",
    emoji: "💰",
    labelKey: "office.serviceTemplates.pricingReview.label",
    descKey: "office.serviceTemplates.pricingReview.desc",
    examplePromptKey: "office.serviceTemplates.pricingReview.example",
    presetId: "pricing-and-monetization",
    workflowName: WORKFLOW_NAMES.PRICING_MONETIZATION,
    agentNames: ["cfo-campbell", "sales-ross", "research-thompson"],
    deliverableKey: "office.deliverables.pricingModel",
    costPerAgentUsd: 0.28,
    minutesPerAgent: 9,
  },
  {
    id: "marketing-sprint",
    category: "marketing",
    emoji: "📣",
    labelKey: "office.serviceTemplates.marketingSprint.label",
    descKey: "office.serviceTemplates.marketingSprint.desc",
    examplePromptKey: "office.serviceTemplates.marketingSprint.example",
    presetId: "marketing-sprint",
    workflowName: WORKFLOW_NAMES.MARKETING_SPRINT,
    agentNames: ["marketing-godin", "research-thompson", "sales-ross"],
    deliverableKey: "office.deliverables.marketingPlan",
    costPerAgentUsd: 0.22,
    minutesPerAgent: 7,
  },
  {
    id: "weekly-review",
    category: "ops",
    emoji: "📊",
    labelKey: "office.serviceTemplates.weeklyReview.label",
    descKey: "office.serviceTemplates.weeklyReview.desc",
    examplePromptKey: "office.serviceTemplates.weeklyReview.example",
    presetId: "weekly-review",
    workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
    agentNames: ["operations-pg", "cfo-campbell", "qa-bach"],
    deliverableKey: "office.deliverables.opsReport",
    costPerAgentUsd: 0.2,
    minutesPerAgent: 6,
  },
  {
    id: "seo-audit",
    category: "marketing",
    emoji: "🔎",
    labelKey: "office.serviceTemplates.seoAudit.label",
    descKey: "office.serviceTemplates.seoAudit.desc",
    examplePromptKey: "office.serviceTemplates.seoAudit.example",
    presetId: "seo-review",
    workflowName: WORKFLOW_NAMES.SEO_REVIEW,
    agentNames: ["marketing-godin"],
    deliverableKey: "office.deliverables.seoReport",
    costPerAgentUsd: 0.15,
    minutesPerAgent: 5,
  },
  {
    id: "repo-analysis",
    category: "build",
    emoji: "📦",
    labelKey: "office.serviceTemplates.repoAnalysis.label",
    descKey: "office.serviceTemplates.repoAnalysis.desc",
    examplePromptKey: "office.serviceTemplates.repoAnalysis.example",
    agentNames: ["cto-vogels", "fullstack-dhh", "qa-bach"],
    deliverableKey: "office.deliverables.repoReport",
    costPerAgentUsd: 0.28,
    minutesPerAgent: 10,
  },
];

interface MatchRule {
  patterns: RegExp[];
  serviceId: string;
  coordinatorNoteKey: string;
  agentReasons: Record<string, string>;
}

const MATCH_RULES: MatchRule[] = [
  {
    patterns: [/investig|mercad|competenc|oportunidad|demand|research|market/i],
    serviceId: "market-scan",
    coordinatorNoteKey: "office.notes.marketScan",
    agentReasons: {
      "research-thompson": "office.reasons.researchMarket",
      "ceo-bezos": "office.reasons.strategicFit",
    },
  },
  {
    patterns: [/validar|evaluar|idea|go.?no.?go|viabil/i],
    serviceId: "idea-validation",
    coordinatorNoteKey: "office.notes.ideaValidation",
    agentReasons: {
      "research-thompson": "office.reasons.researchMarket",
      "ceo-bezos": "office.reasons.strategicFit",
      "critic-munger": "office.reasons.riskCheck",
      "cfo-campbell": "office.reasons.unitEconomics",
    },
  },
  {
    patterns: [/feature|implement|c[oó]dig|mvp|build|desarroll/i],
    serviceId: "feature-sprint",
    coordinatorNoteKey: "office.notes.featureSprint",
    agentReasons: {
      "interaction-cooper": "office.reasons.userFlow",
      "ui-duarte": "office.reasons.visualDesign",
      "fullstack-dhh": "office.reasons.implementation",
      "qa-bach": "office.reasons.quality",
    },
  },
  {
    patterns: [/lanz|launch|deploy|public/i],
    serviceId: "product-launch",
    coordinatorNoteKey: "office.notes.productLaunch",
    agentReasons: {
      "qa-bach": "office.reasons.quality",
      "devops-hightower": "office.reasons.deploy",
      "marketing-godin": "office.reasons.positioning",
      "sales-ross": "office.reasons.conversion",
    },
  },
  {
    patterns: [/precio|pricing|monetiz|mrr|revenue|unit.?economic/i],
    serviceId: "pricing-review",
    coordinatorNoteKey: "office.notes.pricingReview",
    agentReasons: {
      "cfo-campbell": "office.reasons.unitEconomics",
      "sales-ross": "office.reasons.conversion",
      "research-thompson": "office.reasons.competitivePricing",
    },
  },
  {
    patterns: [/marketing|seo|contenido|content|marca|brand|ads/i],
    serviceId: "marketing-sprint",
    coordinatorNoteKey: "office.notes.marketingSprint",
    agentReasons: {
      "marketing-godin": "office.reasons.positioning",
      "research-thompson": "office.reasons.audience",
      "sales-ross": "office.reasons.conversion",
    },
  },
  {
    patterns: [/revisi[oó]n|weekly|semanal|ops|operacion/i],
    serviceId: "weekly-review",
    coordinatorNoteKey: "office.notes.weeklyReview",
    agentReasons: {
      "operations-pg": "office.reasons.growth",
      "cfo-campbell": "office.reasons.unitEconomics",
      "qa-bach": "office.reasons.quality",
    },
  },
  {
    patterns: [
      /repositori|repo\b|github\.com|gitlab|codebase|c[oó]digo.?fuente|analiz.*repo|escane.*repo|audit.*code/i,
    ],
    serviceId: "repo-analysis",
    coordinatorNoteKey: "office.notes.repoAnalysis",
    agentReasons: {
      "cto-vogels": "office.reasons.architecture",
      "fullstack-dhh": "office.reasons.implementation",
      "qa-bach": "office.reasons.quality",
    },
  },
];

function estimateCost(agentCount: number): { min: number; max: number } {
  return {
    min: Math.round(agentCount * COST_PER_AGENT.min * 100) / 100,
    max: Math.round(agentCount * COST_PER_AGENT.max * 100) / 100,
  };
}

function estimateMinutes(agentCount: number): { min: number; max: number } {
  return {
    min: agentCount * MINUTES_PER_AGENT.min,
    max: agentCount * MINUTES_PER_AGENT.max,
  };
}

function matchService(request: string): MatchRule | null {
  for (const rule of MATCH_RULES) {
    if (rule.patterns.some((p) => p.test(request))) return rule;
  }
  return null;
}

function planIdFor(request: string): string {
  let h = 0;
  for (let i = 0; i < request.length; i++) h = (h * 31 + request.charCodeAt(i)) >>> 0;
  return `plan-${h.toString(36)}-${Date.now().toString(36)}`;
}

async function enrichOfficeTaskWithGitHubContext(
  tenantId: string,
  task: string,
  serviceId?: string | null,
): Promise<string> {
  const repoUrl = extractGitHubUrlFromText(task);
  if (!repoUrl && serviceId !== "repo-analysis") return task;

  const targetUrl = repoUrl;
  if (!targetUrl) {
    return `${task}\n\n[Include a GitHub repository URL in your request for a richer analysis.]`;
  }

  const token = await resolveTenantGithubToken(tenantId);
  if (!token) {
    return `${task}\n\n[GitHub token not configured — add one in Settings → Integrations for private repos and richer metadata.]`;
  }

  try {
    const ctx = await fetchGitHubRepoContext(token, targetUrl);
    return `${task}\n\n---\n${formatGitHubContextForAgents(ctx)}\n---\nAnalyze the repository using this context. Produce architecture notes, code quality findings, and prioritized recommendations.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `${task}\n\n[GitHub context fetch failed: ${msg}]`;
  }
}

export async function planOfficeTask(
  tenantId: string,
  request: string,
  options: { productId?: string; serviceId?: string; orgUnitId?: string } = {},
): Promise<OfficeTaskPlan> {
  const trimmed = request.trim();
  if (!trimmed) throw new Error("Task request is required");

  const [agents, products] = await Promise.all([
    prisma.agent.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    listTenantProducts(tenantId),
  ]);

  const agentByName = new Map(agents.map((a) => [a.name, a]));
  let scopedProducts = products;
  const orgCtx = options.orgUnitId
    ? await loadOrgUnitContext(tenantId, options.orgUnitId)
    : null;
  if (options.orgUnitId) {
    scopedProducts = products.filter((p) => p.orgUnitId === options.orgUnitId);
  }

  const orgAgentCatalog = orgCtx?.suggestedAgentNames.length
    ? agents.filter((agent) => orgCtx.suggestedAgentNames.includes(agent.name))
    : agents;

  let service: OfficeServiceTemplate | undefined;

  if (options.serviceId) {
    service = OFFICE_SERVICES.find((s) => s.id === options.serviceId);
  }
  if (!service) {
    const matched = matchService(trimmed);
    if (matched) service = OFFICE_SERVICES.find((s) => s.id === matched.serviceId);
  }
  if (!service) {
    service = OFFICE_SERVICES[0];
  }

  const match = matchService(trimmed);
  const coordinatorNoteKey = match?.coordinatorNoteKey ?? "office.notes.default";
  const agentReasons = match?.agentReasons ?? {};

  let missingAgentRoles: OfficeMissingAgentRole[] = [];
  let selectedAgents: OfficeTaskAgent[] = [];
  let summaryOverride: string | undefined;

  const useLlmPlan = process.env.OFFICE_PLAN_USE_LLM !== "false" && orgAgentCatalog.length > 0;
  if (useLlmPlan) {
    const llmPick = await selectOfficeAgentsWithLlm(
      tenantId,
      trimmed,
      orgAgentCatalog.map((a) => ({ name: a.name, role: a.role })),
      {
        preferredNames: orgCtx?.suggestedAgentNames,
        maxAgents: 5,
        departmentRoster: orgCtx?.suggestedAgentNames,
      },
    );
    if (llmPick) {
      summaryOverride = llmPick.summary;
      missingAgentRoles = llmPick.missingRoles;
      for (const name of llmPick.agentNames) {
        const agent = agentByName.get(name);
        if (!agent) continue;
        selectedAgents.push({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          reasonKey: agentReasons[name] ?? "office.reasons.contributes",
        });
      }
    }
  }

  if (selectedAgents.length === 0) {
    const fallbackAgentNames = orgCtx?.suggestedAgentNames.length
      ? orgCtx.suggestedAgentNames
      : service.agentNames;
    for (const name of fallbackAgentNames) {
      const agent = agentByName.get(name);
      if (!agent) {
        if (!missingAgentRoles.some((m) => m.name === name)) {
          missingAgentRoles.push({
            name,
            suggestedBrief: `Agente ${name.replace(/-/g, " ")} para: ${trimmed.slice(0, 120)}`,
          });
        }
        continue;
      }
      selectedAgents.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        reasonKey: agentReasons[name] ?? "office.reasons.contributes",
      });
    }
  }

  if (orgCtx?.suggestedAgentNames.length && orgAgentCatalog.length > 0) {
    const usesOnlyOrgAgents = selectedAgents.every((agent) =>
      orgCtx.suggestedAgentNames.includes(agent.name),
    );
    if (!usesOnlyOrgAgents) {
      selectedAgents = selectOrgAgentsForTask(
        orgAgentCatalog,
        trimmed,
        orgCtx.orgUnitType,
        4,
      ).map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        reasonKey: agentReasons[agent.name] ?? "office.reasons.contributes",
      }));
    }
  }

  if (orgCtx?.suggestedAgentNames.length && selectedAgents.length === 0) {
    for (const name of orgCtx.suggestedAgentNames) {
      const agent = agentByName.get(name);
      if (!agent) continue;
      selectedAgents.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        reasonKey: agentReasons[name] ?? "office.reasons.contributes",
      });
    }
  }

  if (selectedAgents.length === 0 && agents.length > 0) {
    const fallback = agents.find((a) => a.name === "research-thompson") ?? agents[0];
    selectedAgents.push({
      id: fallback.id,
      name: fallback.name,
      role: fallback.role,
      reasonKey: "office.reasons.contributes",
    });
  }

  let workflowId: string | null = null;
  let workflowName: string | null = service.workflowName ?? null;

  if (service.workflowName) {
    const wf =
      (await ensurePlatformWorkflowOnTenant(tenantId, service.workflowName)) ??
      (await prisma.workflow.findFirst({
        where: { tenantId, name: service.workflowName },
        select: { id: true, name: true },
      }));
    workflowId = wf?.id ?? null;
    workflowName = wf?.name ?? service.workflowName;
  }

  const product = options.productId
    ? (scopedProducts.find((p) => p.id === options.productId) ??
        products.find((p) => p.id === options.productId) ??
        null)
    : null;

  const agentCount = selectedAgents.length;
  const mode: OfficeTaskPlan["mode"] =
    agentCount === 1 ? "single" : workflowId ? "workflow" : "team";

  return {
    planId: planIdFor(trimmed),
    request: trimmed,
    summary: summaryOverride ?? trimmed.slice(0, 160),
    coordinatorNoteKey,
    agents: selectedAgents,
    missingAgentRoles,
    workflowId,
    workflowName,
    presetId: service.presetId ?? null,
    productId: product?.id ?? null,
    productName: product?.name ?? null,
    deliverableKey: service.deliverableKey,
    estimatedCostUsd: estimateCost(agentCount),
    estimatedMinutes: estimateMinutes(agentCount),
    mode,
    serviceId: service.id,
  };
}

export interface ExecuteOfficeTaskInput {
  request: string;
  productId?: string;
  orgUnitId?: string;
  serviceId?: string;
  agentIds?: string[];
  workflowId?: string;
  presetId?: string;
}

export async function executeOfficeTask(
  tenantId: string,
  input: ExecuteOfficeTaskInput,
): Promise<{ runId: string; workflowId: string; workflowName: string; productId: string | null }> {
  await assertTenantCanExecute(tenantId);

  const plan = await planOfficeTask(tenantId, input.request, {
    productId: input.productId,
    serviceId: input.serviceId,
    orgUnitId: input.orgUnitId,
  });

  const task = await enrichOfficeTaskWithGitHubContext(
    tenantId,
    input.request.trim(),
    input.serviceId ?? plan.serviceId,
  );
  const orgCtx = input.orgUnitId ? await loadOrgUnitContext(tenantId, input.orgUnitId) : null;

  if (orgCtx && !input.workflowId && !input.agentIds?.length) {
    return launchOrgUnitWork(tenantId, input.orgUnitId!, {
      task,
      productId: input.productId,
      presetId: input.presetId ?? plan.presetId ?? undefined,
    });
  }

  const productId = input.productId ?? plan.productId ?? undefined;
  const orgMemory = orgCtx ? orgContextToInitialMemory(orgCtx) : {};
  const withOrgMemory = (mem: Record<string, unknown>) => ({ ...mem, ...orgMemory });

  const withProduct = (result: { runId: string; workflowId: string; workflowName: string }) => ({
    ...result,
    productId: productId ?? null,
  });

  if (input.presetId ?? plan.presetId) {
    if (!productId) {
      throw new Error("A product is required for preset workflows. Create or select a product first.");
    }
    return withProduct(
      await launchProductWork(tenantId, productId, {
        presetId: input.presetId ?? plan.presetId ?? undefined,
        task,
        mergeConsensus: true,
        setFocus: true,
        orgContext: orgMemory,
      }),
    );
  }

  if (input.workflowId ?? plan.workflowId) {
    const workflowId = input.workflowId ?? plan.workflowId!;
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      include: {
        steps: {
          include: { agent: { select: { name: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    });
    if (!workflow) throw new Error("Workflow not found");
    const teamAgentNames = agentNamesFromWorkflowSteps(workflow.steps);

    if (productId) {
      return withProduct(
        await launchProductWork(tenantId, productId, {
          workflowId: workflow.id,
          task,
          mergeConsensus: true,
          setFocus: true,
          orgContext: {
            ...orgMemory,
            teamAgents: teamAgentNames,
          },
        }),
      );
    }

    const runId = await executeWorkflowInBackground(workflow.id, {
      tenantId,
      workflowName: workflow.name,
      mergeConsensus: true,
      syncConsensus: true,
      initialMemory: withOrgMemory(
        officeLaunchMemoryFields({
          task,
          teamAgentNames,
          coordinatorNote: "Task dispatched from Office dashboard",
        }),
      ),
    });
    return withProduct({ runId, workflowId: workflow.id, workflowName: workflow.name });
  }

  const agentIds = input.agentIds?.length
    ? input.agentIds
    : plan.agents.map((a) => a.id);

  if (agentIds.length === 1) {
    const wf = await ensureAgentTaskWorkflow(tenantId, agentIds[0]!);
    if (!wf) throw new Error("Agent not found");

    if (productId) {
      return withProduct(
        await launchProductWork(tenantId, productId, {
          agentId: agentIds[0],
          task,
          mergeConsensus: true,
          orgContext: orgMemory,
        }),
      );
    }

    const runId = await executeWorkflowInBackground(wf.id, {
      tenantId,
      workflowName: wf.name,
      mergeConsensus: true,
      syncConsensus: true,
      initialMemory: withOrgMemory(
        officeLaunchMemoryFields({
          task,
          teamAgentNames: plan.agents
            .filter((agent) => agent.id === agentIds[0])
            .map((agent) => agent.name),
        }),
      ),
    });
    return withProduct({ runId, workflowId: wf.id, workflowName: wf.name });
  }

  const teamWf = await ensureTeamTaskWorkflow(tenantId, agentIds, task.slice(0, 80));
  if (!teamWf) throw new Error("Could not assemble team workflow");

  if (productId) {
    const runId = await executeWorkflowInBackground(teamWf.id, {
      tenantId,
      productId,
      productSlug: (
        await prisma.tenantProduct.findUnique({
          where: { id: productId },
          select: { slug: true },
        })
      )?.slug,
      workflowName: teamWf.name,
      mergeConsensus: true,
      syncConsensus: true,
      initialMemory: withOrgMemory(
        officeLaunchMemoryFields({
          task,
          teamAgentNames: plan.agents.map((a) => a.name),
        }),
      ),
    });
    return withProduct({ runId, workflowId: teamWf.id, workflowName: teamWf.name });
  }

  const runId = await executeWorkflowInBackground(teamWf.id, {
    tenantId,
    workflowName: teamWf.name,
    mergeConsensus: true,
    syncConsensus: true,
    initialMemory: withOrgMemory(
      officeLaunchMemoryFields({
        task,
        teamAgentNames: plan.agents.map((a) => a.name),
      }),
    ),
  });
  return withProduct({ runId, workflowId: teamWf.id, workflowName: teamWf.name });
}

export async function getOfficeDashboard(tenantId: string): Promise<OfficeDashboard> {
  const activeStatuses: ExecutionStatus[] = ["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"];

  const [
    usage,
    agents,
    products,
    activeRuns,
    recentRuns,
    pendingDecisions,
    schedules,
    allProductRuns,
    orgUnits,
  ] = await Promise.all([
    getTenantMonthlyUsage(tenantId),
    prisma.agent.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    listTenantProducts(tenantId),
    prisma.executionRun.findMany({
      where: { tenantId, status: { in: activeStatuses } },
      orderBy: { createdAt: "desc" },
      include: {
        workflow: {
          select: {
            name: true,
            steps: {
              select: { agent: { select: { name: true } } },
              orderBy: { stepOrder: "asc" },
            },
          },
        },
      },
    }),
    prisma.executionRun.findMany({
      where: { tenantId, status: { in: ["COMPLETED", "FAILED"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { workflow: { select: { name: true } } },
    }),
    prisma.decisionProposal.count({
      where: { tenantId, status: { in: ["pending_review", "drilling"] } },
    }),
    prisma.autonomousSchedule.findMany({
      where: { tenantId, enabled: true },
      orderBy: { nextRunAt: "asc" },
      take: 3,
    }),
    prisma.executionRun.findMany({
      where: {
        tenantId,
        OR: [
          { sharedMemory: { path: ["productId"], not: Prisma.JsonNull } },
          { sharedMemory: { path: ["focusProductSlug"], not: Prisma.JsonNull } },
        ],
      },
      select: { id: true, totalCostUsd: true, sharedMemory: true },
      take: 500,
    }),
    prisma.orgUnit.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  const orgUnitNameById = new Map(orgUnits.map((org) => [org.id, org.name]));

  const busyAgentIds = new Set<string>();
  for (const run of activeRuns) {
    const memory = run.sharedMemory as { currentAgentId?: string } | null;
    if (memory?.currentAgentId) busyAgentIds.add(memory.currentAgentId);
  }

  const scheduledOnly = schedules.some((s) => s.enabled);
  const autonomyEnabled = schedules.some((s) => s.orchestrationMode === "meta_dynamic");
  const mode: OfficeDashboard["mode"] = autonomyEnabled
    ? "autonomous"
    : scheduledOnly
      ? "scheduled"
      : "on_demand";

  const activity: OfficeActivityItem[] = [];

  for (const run of activeRuns) {
    const fields = encargoActivityFields({
      workflowName: run.workflow?.name ?? "task",
      sharedMemory: (run.sharedMemory ?? {}) as import("../types/index.js").SharedMemory,
      orgUnitNameById,
    });
    activity.push({
      id: `run-active-${run.id}`,
      type: "run_active",
      title: fields.title,
      subtitle: run.status,
      timestamp: (run.startedAt ?? run.createdAt).toISOString(),
      href: `/office/encargos/${run.id}`,
      status: run.status,
      procedureLabel: fields.procedureLabel,
      departmentSlug: fields.departmentSlug,
      orgUnitName: fields.orgUnitName,
    });
  }

  for (const run of recentRuns.slice(0, 5)) {
    const fields = encargoActivityFields({
      workflowName: run.workflow?.name ?? "task",
      sharedMemory: (run.sharedMemory ?? {}) as import("../types/index.js").SharedMemory,
      orgUnitNameById,
    });
    activity.push({
      id: `run-${run.id}`,
      type: run.status === "FAILED" ? "run_failed" : "run_completed",
      title: fields.title,
      subtitle: run.status,
      timestamp: (run.completedAt ?? run.createdAt).toISOString(),
      href: `/office/encargos/${run.id}`,
      status: run.status,
      costUsd: run.totalCostUsd,
      procedureLabel: fields.procedureLabel,
      departmentSlug: fields.departmentSlug,
      orgUnitName: fields.orgUnitName,
    });
  }

  if (pendingDecisions > 0) {
    activity.push({
      id: "decisions-pending",
      type: "decision_pending",
      title: "decisions",
      subtitle: String(pendingDecisions),
      timestamp: new Date().toISOString(),
      href: "/office/pendientes",
      status: "pending_review",
    });
  }

  for (const schedule of schedules) {
    if (!schedule.nextRunAt) continue;
    activity.push({
      id: `schedule-${schedule.id}`,
      type: "schedule_upcoming",
      title: schedule.name,
      subtitle: schedule.orchestrationMode,
      timestamp: schedule.nextRunAt.toISOString(),
      href: "/settings",
    });
  }

  activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const roi: OfficeRoiProduct[] = products
    .filter((p) => p.phase !== "archived")
    .map((p) => {
      const runs = allProductRuns.filter((run) => {
        const mem = run.sharedMemory as { productId?: string; focusProductSlug?: string } | null;
        return mem?.productId === p.id || mem?.focusProductSlug === p.slug;
      });
      const investedUsd = runs.reduce((sum, r) => sum + (r.totalCostUsd ?? 0), 0);
      const revenueUsd = p.revenueUsd ?? 0;
      const roiPct =
        investedUsd > 0 ? Math.round(((revenueUsd - investedUsd) / investedUsd) * 100) : null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        phase: p.phase,
        revenueUsd,
        investedUsd: Math.round(investedUsd * 100) / 100,
        roiPct,
        runsCount: runs.length,
      };
    });

  const totalInvestedUsd = roi.reduce((s, p) => s + p.investedUsd, 0);
  const totalRevenueUsd = roi.reduce((s, p) => s + p.revenueUsd, 0);

  const agentStatuses = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    status: busyAgentIds.has(a.id) ? ("busy" as const) : ("idle" as const),
  }));

  const departments = await enrichDepartmentProcedureCounts(
    tenantId,
    await buildOfficeDepartmentRooms(tenantId, agentStatuses, activeRuns),
  );

  return {
    mode,
    autonomyEnabled,
    usage,
    stats: {
      activeRuns: activeRuns.length,
      pendingDecisions,
      agentsTotal: agents.length,
      productsActive: products.filter((p) => p.phase !== "archived").length,
      totalInvestedUsd: Math.round(totalInvestedUsd * 100) / 100,
      totalRevenueUsd,
    },
    activity: activity.slice(0, 12),
    roi: roi.sort((a, b) => b.investedUsd - a.investedUsd).slice(0, 6),
    agents: agentStatuses,
    services: OFFICE_SERVICES,
    departments,
  };
}
