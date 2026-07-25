import { prisma } from "./prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { assertTenantCanExecute } from "./usage-limits.js";
import { recordProductRun, setFocusProduct } from "./product-registry.js";
import {
  ensureAgentTaskWorkflow,
  ensurePlatformWorkflowOnTenant,
} from "../server/lib/clone-templates.js";
import { WORKFLOW_NAMES, type WorkflowName } from "./workflow-names.js";
import { productConvergencePromptSection } from "./convergence.js";
import {
  loadProductProfile,
  productProfileToInitialMemory,
} from "./product-profile.js";
import { loadOrgUnitContext, orgContextToInitialMemory } from "./org-context.js";
import { loadProductConsensusInitialMemory } from "./product-consensus.js";

export type ProductWorkPresetCategory = "marketing" | "launch" | "build" | "business" | "ops";

export interface ProductWorkPreset {
  id: string;
  workflowName: WorkflowName | string;
  category: ProductWorkPresetCategory;
  agentCount: number;
  /** Shown to coordinator / launcher — concrete outcome */
  taskTemplate: string;
  deliverableHint: string;
  /** Primary presets surfaced first in product UI */
  primary?: boolean;
}

export const PRIMARY_PRODUCT_PRESET_IDS = [
  "seo-review",
  "pricing-and-monetization",
  "product-launch",
  "marketing-sprint",
] as const;

export const PRODUCT_WORK_PRESETS: ProductWorkPreset[] = [
  {
    id: "seo-review",
    workflowName: WORKFLOW_NAMES.SEO_REVIEW,
    category: "marketing",
    agentCount: 1,
    primary: true,
    taskTemplate:
      "Audit SEO for this product landing page. Deliver a prioritized fix list (title, meta, H1, schema, internal links) with copy-ready snippets.",
    deliverableHint:
      "Save audit as markdown in docs/research/ with at least 5 actionable fixes and before/after copy.",
  },
  {
    id: "marketing-sprint",
    workflowName: WORKFLOW_NAMES.MARKETING_SPRINT,
    category: "marketing",
    agentCount: 3,
    primary: true,
    taskTemplate:
      "Run a 3-agent marketing sprint: positioning angle, channel plan, and one publish-ready asset for this product.",
    deliverableHint:
      "Each agent saves deliverables under docs/{role}/ — final asset must be ready to post (not outline-only).",
  },
  {
    id: "content-sprint",
    workflowName: WORKFLOW_NAMES.CONTENT_SPRINT,
    category: "marketing",
    agentCount: 3,
    taskTemplate:
      "Produce content sprint: topic brief, draft article/landing section, and QA checklist for this product.",
    deliverableHint: "At least one full draft markdown file in docs/copy-manager/ or docs/marketing-godin/.",
  },
  {
    id: "campaign-launch",
    workflowName: WORKFLOW_NAMES.CAMPAIGN_LAUNCH,
    category: "marketing",
    agentCount: 4,
    taskTemplate:
      "Plan and draft a multi-channel launch campaign (email + social + landing hooks) for this product.",
    deliverableHint: "Campaign brief + 2 channel-ready copies saved under docs/marketing-godin/.",
  },
  {
    id: "product-launch",
    workflowName: WORKFLOW_NAMES.PRODUCT_LAUNCH,
    category: "launch",
    agentCount: 6,
    primary: true,
    taskTemplate:
      "Execute product launch checklist: positioning, landing copy, launch channels, and success metrics for this product.",
    deliverableHint:
      "Launch brief in docs/product-norman/, copy in docs/marketing-godin/, checklist with owners in docs/operations-pg/.",
  },
  {
    id: "feature-development",
    workflowName: WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
    category: "build",
    agentCount: 5,
    taskTemplate:
      "Ship one vertical feature slice for this product — spec, implementation plan, and QA acceptance criteria.",
    deliverableHint: "Spec in docs/product-norman/, implementation notes in docs/fullstack-dhh/.",
  },
  {
    id: "pricing-and-monetization",
    workflowName: WORKFLOW_NAMES.PRICING_MONETIZATION,
    category: "business",
    agentCount: 5,
    primary: true,
    taskTemplate:
      "Build pricing and monetization package: tiers, unit economics, competitive anchors, and landing pricing copy.",
    deliverableHint:
      "Pricing model table in docs/cfo-campbell/, sales playbook snippet in docs/sales-ross/, copy in docs/marketing-godin/.",
  },
  {
    id: "weekly-review",
    workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
    category: "ops",
    agentCount: 5,
    taskTemplate: "Weekly review for this product: metrics, blockers, and one prioritized next experiment.",
    deliverableHint: "CEO summary + ops metrics in docs/operations-pg/ and docs/ceo-bezos/.",
  },
];

export function presetConvergencePromptSection(presetId?: string): string {
  const base = productConvergencePromptSection();
  if (!presetId) return base;
  const preset = PRODUCT_WORK_PRESETS.find((p) => p.id === presetId);
  if (!preset) return base;
  return `${base}

## Preset deliverables (${preset.id})
${preset.deliverableHint}
- Do not finish with discussion-only output — every agent must leave a file under their \`docs/{role}/\` folder or a structured handoff block.`;
}

export function resolvePresetTask(presetId: string, productName: string): string | null {
  const preset = PRODUCT_WORK_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return preset.taskTemplate.replace(/this product/gi, productName);
}

export interface LaunchProductWorkInput {
  presetId?: string;
  workflowId?: string;
  agentId?: string;
  task?: string;
  mergeConsensus?: boolean;
  setFocus?: boolean;
  orgContext?: Record<string, unknown>;
}

export interface ProductLaunchOptionPreset {
  id: string;
  workflowName: string;
  category: ProductWorkPresetCategory;
  agentCount: number;
  workflowId: string | null;
  available: boolean;
}

export interface ProductLaunchOptionAgent {
  id: string;
  name: string;
  role: string;
}

export interface ProductLaunchOptionWorkflow {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
}

export interface ProductLaunchOptions {
  presets: ProductLaunchOptionPreset[];
  workflows: ProductLaunchOptionWorkflow[];
  agents: ProductLaunchOptionAgent[];
}

async function resolveWorkflowForLaunch(
  tenantId: string,
  input: LaunchProductWorkInput,
): Promise<{ id: string; name: string } | null> {
  if (input.workflowId) {
    return prisma.workflow.findFirst({
      where: { id: input.workflowId, tenantId },
      select: { id: true, name: true },
    });
  }

  if (input.presetId) {
    const preset = PRODUCT_WORK_PRESETS.find((p) => p.id === input.presetId);
    if (!preset) return null;
    const wf =
      (await ensurePlatformWorkflowOnTenant(tenantId, preset.workflowName)) ??
      (await prisma.workflow.findFirst({
        where: { tenantId, name: preset.workflowName },
        select: { id: true, name: true },
      }));
    return wf;
  }

  if (input.agentId) {
    const wf = await ensureAgentTaskWorkflow(tenantId, input.agentId);
    return wf;
  }

  return null;
}

export async function getProductLaunchOptions(
  tenantId: string,
  productId: string,
): Promise<ProductLaunchOptions | null> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: { id: true },
  });
  if (!product) return null;

  const [tenantWorkflows, agents] = await Promise.all([
    prisma.workflow.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { steps: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.agent.findMany({
      where: { tenantId },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const wfByName = new Map(tenantWorkflows.map((w) => [w.name, w.id]));

  const presets: ProductLaunchOptionPreset[] = await Promise.all(
    PRODUCT_WORK_PRESETS.map(async (preset) => {
      let workflowId = wfByName.get(preset.workflowName) ?? null;
      if (!workflowId) {
        const ensured = await ensurePlatformWorkflowOnTenant(tenantId, preset.workflowName);
        workflowId = ensured?.id ?? null;
        if (workflowId) wfByName.set(preset.workflowName, workflowId);
      }
      return {
        id: preset.id,
        workflowName: preset.workflowName,
        category: preset.category,
        agentCount: preset.agentCount,
        workflowId,
        available: workflowId != null,
      };
    }),
  );

  presets.sort((a, b) => {
    const aPrimary = PRODUCT_WORK_PRESETS.find((p) => p.id === a.id)?.primary ?? false;
    const bPrimary = PRODUCT_WORK_PRESETS.find((p) => p.id === b.id)?.primary ?? false;
    if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
    return a.workflowName.localeCompare(b.workflowName);
  });

  return {
    presets,
    workflows: tenantWorkflows
      .filter((w) => !w.name.startsWith("_agent-"))
      .map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        stepCount: w._count.steps,
      })),
    agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
  };
}

export async function launchProductWork(
  tenantId: string,
  productId: string,
  input: LaunchProductWorkInput,
): Promise<{ runId: string; workflowId: string; workflowName: string }> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      phase: true,
      description: true,
      githubRepoUrl: true,
      metadata: true,
      orgUnitId: true,
    },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  const workflow = await resolveWorkflowForLaunch(tenantId, input);
  if (!workflow) {
    throw new Error("Workflow not found for launch request");
  }

  await assertTenantCanExecute(tenantId);

  if (input.setFocus !== false) {
    await setFocusProduct(tenantId, product.id);
  }

  const taskText =
    input.task?.trim() ??
    (input.presetId ? resolvePresetTask(input.presetId, product.name) : null) ??
    undefined;

  const profile = await loadProductProfile(product.id);
  const profileMemory = productProfileToInitialMemory(product, profile);

  const consensusMemory = await loadProductConsensusInitialMemory(tenantId, product.id, {
    ...(taskText
      ? {
          task: taskText,
          nextAction: taskText,
          launchContext: `Product: ${product.name} (${product.slug})`,
        }
      : {
          launchContext: `Product: ${product.name} (${product.slug})`,
        }),
    convergenceRules: presetConvergencePromptSection(input.presetId),
    focusProductSlug: product.slug,
    focusProductName: product.name,
    productId: product.id,
    ...profileMemory,
  });

  let orgMemory: Record<string, unknown> = input.orgContext ?? {};
  if (!input.orgContext && product.orgUnitId) {
    const orgCtx = await loadOrgUnitContext(tenantId, product.orgUnitId);
    if (orgCtx) orgMemory = orgContextToInitialMemory(orgCtx);
  }

  const initialMemory = { ...consensusMemory, ...orgMemory };

  const runId = await executeWorkflowInBackground(workflow.id, {
    tenantId,
    productId: product.id,
    productSlug: product.slug,
    workflowName: workflow.name,
    mergeConsensus: input.mergeConsensus ?? true,
    syncConsensus: true,
    initialMemory,
  });

  await recordProductRun(product.id, runId);

  return { runId, workflowId: workflow.id, workflowName: workflow.name };
}
