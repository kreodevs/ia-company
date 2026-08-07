import { prisma } from "./prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { assertTenantCanExecute } from "./usage-limits.js";
import { recordProductRun, setFocusProduct } from "./product-registry.js";
import {
  ensureAgentTaskWorkflow,
  ensurePlatformWorkflowOnTenant,
} from "../server/lib/clone-templates.js";
import { productConvergencePromptSection } from "./convergence.js";
import {
  findPresetByIdAsync,
  ensurePresetsForProductSlug,
  discoverVerticalPacks,
  getPresetsForProductSlug,
} from "./vertical-packs.js";
import {
  PRIMARY_PRODUCT_PRESET_IDS,
  PRODUCT_WORK_PRESETS,
  type ProductWorkPreset,
  type ProductWorkPresetCategory,
} from "./product-work-presets.js";
import {
  loadProductProfile,
  productProfileToInitialMemory,
} from "./product-profile.js";
import { loadOrgUnitContext, orgContextToInitialMemory } from "./org-context.js";
import { loadProductConsensusInitialMemory } from "./product-consensus.js";
import {
  attachScopeContract,
  buildProductScopeContract,
} from "./scope-contract.js";
import {
  loadOrRefreshProductWebSnapshots,
  productWebSnapshotMemoryFields,
} from "./product-web-snapshot.js";

export type { ProductWorkPreset, ProductWorkPresetCategory };
export { PRIMARY_PRODUCT_PRESET_IDS, PRODUCT_WORK_PRESETS };

export async function presetConvergencePromptSectionAsync(
  presetId?: string,
  productSlug?: string | null,
): Promise<string> {
  const base = productConvergencePromptSection();
  if (!presetId) return base;
  const preset = await findPresetByIdAsync(presetId, productSlug);
  if (!preset) return base;
  return `${base}

## Preset deliverables (${preset.id})
${preset.deliverableHint}
- Do not finish with discussion-only output — every agent must leave a file under their \`docs/{role}/\` folder or a structured handoff block.`;
}

export function presetConvergencePromptSection(
  presetId?: string,
  productSlug?: string | null,
): string {
  const base = productConvergencePromptSection();
  if (!presetId) return base;
  const preset = findPresetByIdSync(presetId, productSlug);
  if (!preset) return base;
  return `${base}

## Preset deliverables (${preset.id})
${preset.deliverableHint}
- Do not finish with discussion-only output — every agent must leave a file under their \`docs/{role}/\` folder or a structured handoff block.`;
}

function findPresetByIdSync(presetId: string, productSlug?: string | null): ProductWorkPreset | null {
  if (productSlug) {
    const fromPack = getPresetsForProductSlug(productSlug).find((p) => p.id === presetId);
    if (fromPack) return fromPack;
  }
  return PRODUCT_WORK_PRESETS.find((p) => p.id === presetId) ?? null;
}

export function resolvePresetTask(
  presetId: string,
  productName: string,
  productSlug?: string | null,
): string | null {
  const preset = findPresetByIdSync(presetId, productSlug);
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
  productSlug?: string,
): Promise<{ id: string; name: string } | null> {
  if (input.workflowId) {
    return prisma.workflow.findFirst({
      where: { id: input.workflowId, tenantId },
      select: { id: true, name: true },
    });
  }

  if (input.presetId) {
    const preset = await findPresetByIdAsync(input.presetId, productSlug);
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
    select: { id: true, slug: true },
  });
  if (!product) return null;

  await discoverVerticalPacks();
  const presetSource = await ensurePresetsForProductSlug(product.slug);

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
    presetSource.map(async (preset) => {
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
    const aPrimary = presetSource.find((p) => p.id === a.id)?.primary ?? false;
    const bPrimary = presetSource.find((p) => p.id === b.id)?.primary ?? false;
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
      websiteUrl: true,
      pricingPageUrl: true,
      metadata: true,
      orgUnitId: true,
    },
  });
  if (!product) {
    throw new Error("Product not found");
  }

  await discoverVerticalPacks();

  const workflow = await resolveWorkflowForLaunch(tenantId, input, product.slug);
  if (!workflow) {
    throw new Error("Workflow not found for launch request");
  }

  await assertTenantCanExecute(tenantId);

  if (input.setFocus !== false) {
    await setFocusProduct(tenantId, product.id);
  }

  const presetForTask = input.presetId
    ? await findPresetByIdAsync(input.presetId, product.slug)
    : null;
  const taskText =
    input.task?.trim() ??
    (presetForTask
      ? presetForTask.taskTemplate.replace(/this product/gi, product.name)
      : null) ??
    undefined;

  const convergenceRules = input.presetId
    ? await presetConvergencePromptSectionAsync(input.presetId, product.slug)
    : presetConvergencePromptSection();

  const profile = await loadProductProfile(product.id);
  const profileMemory = productProfileToInitialMemory(product, profile);

  let webMemory: Record<string, unknown> = {};
  try {
    const snapshots = await loadOrRefreshProductWebSnapshots(tenantId, product.id);
    webMemory = productWebSnapshotMemoryFields(snapshots);
  } catch {
    // Non-fatal
  }

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
    convergenceRules,
    focusProductSlug: product.slug,
    focusProductName: product.name,
    productId: product.id,
    ...profileMemory,
    ...webMemory,
  });

  let orgMemory: Record<string, unknown> = input.orgContext ?? {};
  if (!input.orgContext && product.orgUnitId) {
    const orgCtx = await loadOrgUnitContext(tenantId, product.orgUnitId);
    if (orgCtx) orgMemory = orgContextToInitialMemory(orgCtx);
  }

  const initialMemory = attachScopeContract(
    { ...consensusMemory, ...orgMemory },
    buildProductScopeContract({
      productId: product.id,
      productSlug: product.slug,
      orgUnitId: product.orgUnitId,
      intent: "deliver",
    }),
  );

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
