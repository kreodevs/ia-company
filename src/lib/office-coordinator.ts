import type { ExecutionStatus } from "@prisma/client";
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

export interface OfficeTaskPlan {
  planId: string;
  request: string;
  summary: string;
  coordinatorNoteKey: string;
  agents: OfficeTaskAgent[];
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

export async function planOfficeTask(
  tenantId: string,
  request: string,
  options: { productId?: string; serviceId?: string } = {},
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

  const selectedAgents: OfficeTaskAgent[] = [];
  for (const name of service.agentNames) {
    const agent = agentByName.get(name);
    if (!agent) continue;
    selectedAgents.push({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      reasonKey: agentReasons[name] ?? "office.reasons.contributes",
    });
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
    ? (products.find((p) => p.id === options.productId) ?? null)
    : null;

  const agentCount = selectedAgents.length;
  const mode: OfficeTaskPlan["mode"] =
    agentCount === 1 ? "single" : workflowId ? "workflow" : "team";

  return {
    planId: planIdFor(trimmed),
    request: trimmed,
    summary: trimmed.slice(0, 160),
    coordinatorNoteKey,
    agents: selectedAgents,
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
  serviceId?: string;
  agentIds?: string[];
  workflowId?: string;
  presetId?: string;
}

export async function executeOfficeTask(
  tenantId: string,
  input: ExecuteOfficeTaskInput,
): Promise<{ runId: string; workflowId: string; workflowName: string }> {
  await assertTenantCanExecute(tenantId);

  const plan = await planOfficeTask(tenantId, input.request, {
    productId: input.productId,
    serviceId: input.serviceId,
  });

  const task = input.request.trim();
  const productId = input.productId ?? plan.productId ?? undefined;

  if (input.presetId ?? plan.presetId) {
    if (!productId) {
      throw new Error("A product is required for preset workflows. Create or select a product first.");
    }
    return launchProductWork(tenantId, productId, {
      presetId: input.presetId ?? plan.presetId ?? undefined,
      task,
      mergeConsensus: true,
      setFocus: true,
    });
  }

  if (input.workflowId ?? plan.workflowId) {
    const workflowId = input.workflowId ?? plan.workflowId!;
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      select: { id: true, name: true },
    });
    if (!workflow) throw new Error("Workflow not found");

    if (productId) {
      return launchProductWork(tenantId, productId, {
        workflowId: workflow.id,
        task,
        mergeConsensus: true,
        setFocus: true,
      });
    }

    const runId = await executeWorkflowInBackground(workflow.id, {
      tenantId,
      workflowName: workflow.name,
      mergeConsensus: true,
      syncConsensus: true,
      initialMemory: {
        task,
        nextAction: task,
        officeRequest: task,
        coordinatorNote: "Task dispatched from Office dashboard",
      },
    });
    return { runId, workflowId: workflow.id, workflowName: workflow.name };
  }

  const agentIds = input.agentIds?.length
    ? input.agentIds
    : plan.agents.map((a) => a.id);

  if (agentIds.length === 1) {
    const wf = await ensureAgentTaskWorkflow(tenantId, agentIds[0]!);
    if (!wf) throw new Error("Agent not found");

    if (productId) {
      return launchProductWork(tenantId, productId, {
        agentId: agentIds[0],
        task,
        mergeConsensus: true,
      });
    }

    const runId = await executeWorkflowInBackground(wf.id, {
      tenantId,
      workflowName: wf.name,
      mergeConsensus: true,
      syncConsensus: true,
      initialMemory: { task, nextAction: task, officeRequest: task },
    });
    return { runId, workflowId: wf.id, workflowName: wf.name };
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
      initialMemory: {
        task,
        nextAction: task,
        officeRequest: task,
        teamAgents: plan.agents.map((a) => a.name),
      },
    });
    return { runId, workflowId: teamWf.id, workflowName: teamWf.name };
  }

  const runId = await executeWorkflowInBackground(teamWf.id, {
    tenantId,
    workflowName: teamWf.name,
    mergeConsensus: true,
    syncConsensus: true,
    initialMemory: {
      task,
      nextAction: task,
      officeRequest: task,
      teamAgents: plan.agents.map((a) => a.name),
    },
  });
  return { runId, workflowId: teamWf.id, workflowName: teamWf.name };
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
      take: 5,
      include: { workflow: { select: { name: true } } },
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
      where: { tenantId },
      select: { id: true, totalCostUsd: true, sharedMemory: true },
    }),
  ]);

  const busyAgentIds = new Set<string>();
  for (const run of activeRuns) {
    const memory = run.sharedMemory as { currentAgentId?: string } | null;
    if (memory?.currentAgentId) busyAgentIds.add(memory.currentAgentId);
  }

  const autonomyEnabled = schedules.some((s) => s.orchestrationMode === "meta_dynamic" && s.enabled);
  const scheduledOnly =
    schedules.some((s) => s.enabled) && !autonomyEnabled;
  const mode: OfficeDashboard["mode"] = autonomyEnabled
    ? "autonomous"
    : scheduledOnly
      ? "scheduled"
      : "on_demand";

  const activity: OfficeActivityItem[] = [];

  for (const run of activeRuns) {
    activity.push({
      id: `run-active-${run.id}`,
      type: "run_active",
      title: run.workflow?.name ?? "Workflow",
      subtitle: run.status,
      timestamp: (run.startedAt ?? run.createdAt).toISOString(),
      href: `/office/encargos/${run.id}`,
      status: run.status,
    });
  }

  for (const run of recentRuns.slice(0, 5)) {
    activity.push({
      id: `run-${run.id}`,
      type: run.status === "FAILED" ? "run_failed" : "run_completed",
      title: run.workflow?.name ?? "Workflow",
      subtitle: run.status,
      timestamp: (run.completedAt ?? run.createdAt).toISOString(),
      href: `/office/encargos/${run.id}`,
      status: run.status,
      costUsd: run.totalCostUsd,
    });
  }

  if (pendingDecisions > 0) {
    activity.push({
      id: "decisions-pending",
      type: "decision_pending",
      title: "decisions",
      subtitle: String(pendingDecisions),
      timestamp: new Date().toISOString(),
      href: "/decisions",
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
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: busyAgentIds.has(a.id) ? "busy" : "idle",
    })),
    services: OFFICE_SERVICES,
  };
}
