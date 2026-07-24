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
import { loadProductConsensusInitialMemory } from "./product-consensus.js";

export type ProductWorkPresetCategory = "marketing" | "launch" | "build" | "business" | "ops";

export interface ProductWorkPreset {
  id: string;
  workflowName: WorkflowName | string;
  category: ProductWorkPresetCategory;
  agentCount: number;
}

export const PRODUCT_WORK_PRESETS: ProductWorkPreset[] = [
  {
    id: "seo-review",
    workflowName: WORKFLOW_NAMES.SEO_REVIEW,
    category: "marketing",
    agentCount: 1,
  },
  {
    id: "marketing-sprint",
    workflowName: WORKFLOW_NAMES.MARKETING_SPRINT,
    category: "marketing",
    agentCount: 3,
  },
  {
    id: "product-launch",
    workflowName: WORKFLOW_NAMES.PRODUCT_LAUNCH,
    category: "launch",
    agentCount: 6,
  },
  {
    id: "feature-development",
    workflowName: WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
    category: "build",
    agentCount: 5,
  },
  {
    id: "pricing-and-monetization",
    workflowName: WORKFLOW_NAMES.PRICING_MONETIZATION,
    category: "business",
    agentCount: 5,
  },
  {
    id: "weekly-review",
    workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
    category: "ops",
    agentCount: 5,
  },
];

export interface LaunchProductWorkInput {
  presetId?: string;
  workflowId?: string;
  agentId?: string;
  task?: string;
  mergeConsensus?: boolean;
  setFocus?: boolean;
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

  const taskText = input.task?.trim();
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
    convergenceRules: productConvergencePromptSection(),
    focusProductSlug: product.slug,
    focusProductName: product.name,
    productId: product.id,
    ...profileMemory,
  });

  const initialMemory = consensusMemory;

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
