import type { ProductIntakeStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { executeWorkflowInBackground } from "../core/engine.js";
import { ensurePlatformWorkflowOnTenant } from "../server/lib/clone-templates.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";
import { resolveTenantGithubToken } from "./tenant-integrations.js";
import {
  cloneGitHubRepoToWorkspace,
  fetchGitHubRepoContext,
  formatGitHubContextForAgents,
  parseGitHubRepoUrl,
} from "./github-repo.js";
import {
  buildProductProfilePromptSection,
  extractProductProfileFromMemory,
  loadProductProfile,
  productProfileToInitialMemory,
  saveProductProfile,
  syncProductProfileFile,
  type ProductProfile,
} from "./product-profile.js";
import {
  DEFAULT_PRODUCT_CONSENSUS_CONTENT,
  ensureProductConsensus,
  syncProductConsensusToWorkspace,
} from "./product-consensus.js";
import { productConvergencePromptSection } from "./convergence.js";
import { recordProductRun } from "./product-registry.js";
import type { SharedMemory } from "../types/index.js";

export { buildProductProfilePromptSection, loadProductProfile, productProfileToInitialMemory };

const INTAKE_PROFILE_JSON_SCHEMA = `
End your final reply with a fenced JSON block (ceo-bezos or last agent) containing the consolidated product profile:
\`\`\`json
{
  "productProfile": {
    "summary": "2-3 sentence product overview",
    "valueProposition": "one line",
    "targetAudience": "who pays and why",
    "problemStatement": "pain being solved",
    "businessModel": "how it makes money",
    "competitors": ["..."],
    "techStack": ["..."],
    "monetizationHypothesis": "...",
    "suggestedPhase": "building|launching|growing|queued",
    "nextAction": "single concrete next step for the team",
    "sources": ["github readme", "..."]
  }
}
\`\`\`
`.trim();

export async function prepareGitHubForProduct(input: {
  tenantId: string;
  productSlug: string;
  githubRepoUrl: string;
  hasExistingCode: boolean;
  cloneIfEmpty?: boolean;
}): Promise<{ contextText: string; defaultBranch: string | null }> {
  const parsed = parseGitHubRepoUrl(input.githubRepoUrl);
  if (!parsed) throw new Error("Invalid GitHub repository URL");

  const token = await resolveTenantGithubToken(input.tenantId);
  if (!token) {
    throw new Error(
      "GitHub token required. Configure it in Settings → Integrations for private repos.",
    );
  }

  if (input.cloneIfEmpty !== false && !input.hasExistingCode) {
    await cloneGitHubRepoToWorkspace(token, input.githubRepoUrl, input.productSlug);
  }

  const ctx = await fetchGitHubRepoContext(token, input.githubRepoUrl);
  return {
    contextText: formatGitHubContextForAgents(ctx),
    defaultBranch: ctx.defaultBranch,
  };
}

export async function startProductIntake(
  tenantId: string,
  productId: string,
  options: {
    githubContextText?: string;
    userDescription?: string;
  } = {},
): Promise<{ runId: string; workflowName: string }> {
  const product = await prisma.tenantProduct.findFirst({
    where: { id: productId, tenantId },
  });
  if (!product) throw new Error("Product not found");

  const wf =
    (await ensurePlatformWorkflowOnTenant(tenantId, WORKFLOW_NAMES.PRODUCT_INTAKE)) ??
    (await prisma.workflow.findFirst({
      where: { tenantId, name: WORKFLOW_NAMES.PRODUCT_INTAKE },
      select: { id: true, name: true },
    }));
  if (!wf) throw new Error("product-intake workflow not found — re-seed platform workflows");

  const taskParts = [
    `Build a complete product intake profile for "${product.name}" (slug: ${product.slug}).`,
    options.userDescription?.trim()
      ? `Founder notes: ${options.userDescription.trim()}`
      : null,
    product.githubRepoUrl ? `GitHub: ${product.githubRepoUrl}` : null,
    options.githubContextText ? `\n${options.githubContextText}` : null,
    "\nProduce a factual profile the whole agent team can reuse. Do not invent code that is not in the repo context.",
    INTAKE_PROFILE_JSON_SCHEMA,
  ].filter(Boolean);

  const initialMemory: SharedMemory = {
    task: taskParts.join("\n"),
    nextAction: taskParts[0]!,
    officeRequest: "Product intake — build shared product profile",
    launchContext: `Product intake: ${product.name}`,
    focusProductSlug: product.slug,
    focusProductName: product.name,
    productId: product.id,
    githubRepoUrl: product.githubRepoUrl,
    convergenceRules: productConvergencePromptSection(),
    intakeMode: true,
    ...(options.githubContextText ? { githubContext: options.githubContextText } : {}),
  };

  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: { intakeStatus: "running" },
  });

  const runId = await executeWorkflowInBackground(wf.id, {
    tenantId,
    productId: product.id,
    productSlug: product.slug,
    workflowName: wf.name,
    mergeConsensus: true,
    syncConsensus: true,
    initialMemory,
  });

  await recordProductRun(product.id, runId);
  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: { intakeRunId: runId },
  });

  return { runId, workflowName: wf.name };
}

export async function finalizeProductIntake(
  tenantId: string,
  runId: string,
  memory: SharedMemory,
  productSlug?: string,
): Promise<ProductProfile | null> {
  const product = productSlug
    ? await prisma.tenantProduct.findUnique({
        where: { tenantId_slug: { tenantId, slug: productSlug } },
      })
    : await prisma.tenantProduct.findFirst({
        where: { tenantId, intakeRunId: runId },
      });

  if (!product) return null;

  let profile = extractProductProfileFromMemory(memory);
  if (!profile && product.githubRepoUrl) {
    profile = {
      summary: product.description ?? product.name,
      valueProposition: "",
      targetAudience: "",
      problemStatement: "",
      businessModel: "",
      competitors: [],
      techStack: [],
      monetizationHypothesis: "",
      nextAction: "Review intake consensus and launch first workflow",
      githubRepoUrl: product.githubRepoUrl,
      githubFullName: parseGitHubRepoUrl(product.githubRepoUrl)?.fullName ?? null,
      sources: ["intake workflow"],
    };
  }

  if (!profile) {
    await prisma.tenantProduct.update({
      where: { id: product.id },
      data: { intakeStatus: "failed" },
    });
    return null;
  }

  await saveProductProfile(product.id, product.slug, profile, { runId });

  const consensus = await ensureProductConsensus(product.id);
  const intakeSection = [
    `# ${product.name} — Product intake`,
    "",
    profile.summary,
    "",
    buildProductProfilePromptSection(profile),
    "",
    "## Next Action",
    profile.nextAction || consensus.nextAction || "Execute first product workflow",
  ].join("\n");

  await prisma.productConsensus.update({
    where: { productId: product.id },
    data: {
      content: intakeSection,
      nextAction: profile.nextAction || consensus.nextAction,
    },
  });

  await syncProductConsensusToWorkspace(product.id, product.slug);
  await syncProductProfileFile(product.slug, profile);

  await prisma.tenantProduct.update({
    where: { id: product.id },
    data: { intakeStatus: "completed" },
  });

  return profile;
}

export async function registerProductWithIntake(input: {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  phase?: import("@prisma/client").ProductPhase;
  githubRepoUrl?: string;
  runIntake?: boolean;
  cloneRepo?: boolean;
}): Promise<{
  product: Awaited<ReturnType<typeof import("./product-registry.js").registerExistingProduct>>["product"];
  hasExistingCode: boolean;
  workspacePath: string;
  intakeRunId: string | null;
  intakeStatus: ProductIntakeStatus;
}> {
  const { registerExistingProduct } = await import("./product-registry.js");

  const githubRepoUrl = input.githubRepoUrl?.trim() || undefined;
  if (githubRepoUrl && !parseGitHubRepoUrl(githubRepoUrl)) {
    throw new Error("Invalid GitHub repository URL");
  }

  const result = await registerExistingProduct({
    tenantId: input.tenantId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    phase: input.phase,
    githubRepoUrl,
  });

  let githubContextText: string | undefined;
  let defaultBranch: string | null = null;

  if (githubRepoUrl) {
    const gh = await prepareGitHubForProduct({
      tenantId: input.tenantId,
      productSlug: result.product.slug,
      githubRepoUrl,
      hasExistingCode: result.hasExistingCode,
      cloneIfEmpty: input.cloneRepo !== false,
    });
    githubContextText = gh.contextText;
    defaultBranch = gh.defaultBranch;
    await prisma.tenantProduct.update({
      where: { id: result.product.id },
      data: { githubDefaultBranch: defaultBranch },
    });
  }

  await syncProductConsensusToWorkspace(result.product.id, result.product.slug);

  if (!input.runIntake) {
    return {
      ...result,
      intakeRunId: null,
      intakeStatus: "skipped",
    };
  }

  await prisma.tenantProduct.update({
    where: { id: result.product.id },
    data: { intakeStatus: "pending" },
  });

  const intake = await startProductIntake(input.tenantId, result.product.id, {
    githubContextText,
    userDescription: input.description,
  });

  return {
    ...result,
    intakeRunId: intake.runId,
    intakeStatus: "running",
  };
}

export function buildInitialConsensusWithDescription(
  productName: string,
  description?: string | null,
): string {
  if (!description?.trim()) return DEFAULT_PRODUCT_CONSENSUS_CONTENT(productName);
  return `# ${productName}\n\n${description.trim()}\n\n## Next Action\nComplete product intake or define the first cycle focus.\n`;
}
