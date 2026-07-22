import type { CompanyPhase, GoNoGoDecision } from "@prisma/client";
import type { SharedMemory } from "../types/index.js";
import { persistConsensusFromRun } from "./consensus.js";
import { prisma } from "./prisma.js";
import {
  addPipelineIdeas,
  bootstrapProduct,
  countBuildingProducts,
  ensureTenantCycleState,
  getProductBySlug,
  listPipelineIdeas,
  markIdeaGoNoGo,
  setFocusProduct,
  updateCompanyPhase,
  upsertTenantProduct,
} from "./product-registry.js";
import { slugifyProductName } from "./product-workspace.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

function parseGoNoGo(value: unknown): GoNoGoDecision | null {
  const raw = asString(value)?.toUpperCase();
  if (raw === "GO") return "go";
  if (raw === "NO-GO" || raw === "NO_GO" || raw === "NOGO") return "no_go";
  return null;
}

export function convergencePromptSection(cycleNumber: number, phase: CompanyPhase): string {
  return `
## Autonomous Company Cycle Rules (mandatory)
- Current cycle number: ${cycleNumber}
- Company phase: ${phase}
- Cycle 1: brainstorm; output JSON field \`topIdeas\` (array of 3 short titles)
- Cycle 2: evaluate top pipeline idea; output \`goNoGo\` as "GO" or "NO-GO" with rationale
- Cycle 3+: if GO, produce tangible artifacts (files/commits/deploy). Discussion-only output is forbidden
- If same nextAction repeats, pivot or shrink scope
- Multi-product: do not block existing products in Growing phase (e.g. snapog). New ideas go to pipeline queue
- Optional structured fields in shared memory: topIdeas[], goNoGo, productSlug, productName, productDescription, revenueUsd
`.trim();
}

export async function processConvergenceAfterRun(
  tenantId: string,
  workflowName: string,
  memory: SharedMemory,
  _runId: string,
): Promise<void> {
  await persistConsensusFromRun(tenantId, memory);

  const consensus = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  const cycle = await ensureTenantCycleState(tenantId);
  const nextAction = asString(memory.nextAction) ?? consensus?.nextAction ?? null;

  let stuckCounter = cycle.stuckCounter;
  if (nextAction && cycle.lastNextAction === nextAction) {
    stuckCounter += 1;
  } else {
    stuckCounter = 0;
  }

  const topIdeas = asStringArray(memory.topIdeas);
  if (topIdeas.length > 0) {
    await addPipelineIdeas(
      tenantId,
      topIdeas.slice(0, 3).map((title) => ({ title })),
    );
    await updateCompanyPhase(tenantId, "validating");
  }

  const goNoGo = parseGoNoGo(memory.goNoGo);
  const productSlug = asString(memory.productSlug) ?? slugifyProductName(asString(memory.productName) ?? "");
  const productName = asString(memory.productName);

  if (goNoGo === "go" && productSlug && productName) {
    const building = await countBuildingProducts(tenantId);
    const existing = await getProductBySlug(tenantId, productSlug);
    if (!existing && building < 2) {
      const product = await bootstrapProduct({
        tenantId,
        slug: productSlug,
        name: productName,
        description: asString(memory.productDescription),
      });
      await setFocusProduct(tenantId, product.id);
      await updateCompanyPhase(tenantId, "building");
    } else if (existing) {
      await upsertTenantProduct({
        tenantId,
        slug: productSlug,
        name: productName,
        phase: "building",
        goNoGo: "go",
      });
      await setFocusProduct(tenantId, existing.id);
    }

    const ideas = await listPipelineIdeas(tenantId);
    if (ideas[0]) await markIdeaGoNoGo(ideas[0].id, "go");
  } else if (goNoGo === "no_go") {
    const ideas = await listPipelineIdeas(tenantId);
    if (ideas[0]) await markIdeaGoNoGo(ideas[0].id, "no_go");
    await updateCompanyPhase(tenantId, "exploring");
  }

  if (typeof memory.revenueUsd === "number" && productSlug) {
    await upsertTenantProduct({
      tenantId,
      slug: productSlug,
      name: productName ?? productSlug,
      revenueUsd: memory.revenueUsd,
      phase: "growing",
      goNoGo: "go",
    });
    await updateCompanyPhase(tenantId, "growing");
  }

  if (workflowName === WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY) {
    await updateCompanyPhase(tenantId, topIdeas.length ? "validating" : "exploring");
  } else if (workflowName === WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION) {
    await updateCompanyPhase(tenantId, goNoGo === "go" ? "building" : "validating");
  } else if (workflowName === WORKFLOW_NAMES.FEATURE_DEVELOPMENT) {
    await updateCompanyPhase(tenantId, "building");
  } else if (
    workflowName === WORKFLOW_NAMES.PRODUCT_LAUNCH ||
    workflowName === WORKFLOW_NAMES.PRICING_MONETIZATION
  ) {
    await updateCompanyPhase(tenantId, "growing");
  }

  if (stuckCounter >= 2 && nextAction) {
    memory.nextAction = `STUCK on "${nextAction}" — pivot: ship smallest vertical slice today`;
    await persistConsensusFromRun(tenantId, memory);
    stuckCounter = 0;
  }

  await prisma.tenantCycleState.update({
    where: { tenantId },
    data: {
      cycleNumber: cycle.cycleNumber + 1,
      stuckCounter,
      lastNextAction: nextAction,
    },
  });
}
