import type { CompanyPhase, GoNoGoDecision } from "@prisma/client";
import type { SharedMemory } from "../types/index.js";
import { persistCompanyConsensusFromRun } from "./consensus.js";
import { prisma } from "./prisma.js";
import {
  buildRationaleFromMemory,
  createDecisionProposal,
} from "./decision-proposals.js";
import { appendProductHandoff, extractHandoffFromAgentOutput } from "./product-consensus.js";
import { persistHandoffAsAgentDoc, shouldSkipHandoffDocPersist } from "./agent-deliverables.js";
import { persistOrgUnitHandoffsFromRun } from "./org-artifacts.js";
import { resolveProductWorkspaceRoot } from "./product-workspace.js";
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
import {
  formatInterestsPromptSection,
  getTenantInterestCategories,
  scoreIdeaAgainstInterests,
} from "./tenant-interests.js";
import { slugifyProductName } from "./product-workspace.js";
import {
  asString,
  asStringArray,
  enrichSharedMemoryFromAgentOutputs,
} from "./structured-memory.js";
import {
  buildStuckPivotNextAction,
  isStuckPivotNextAction,
  unwrapStuckNextAction,
} from "./stuck-action.js";
import { WORKFLOW_NAMES } from "./workflow-names.js";
import { isCompanyScopedMemory, resolveRunScopeMeta } from "./scope-contract.js";

function parseGoNoGo(value: unknown): GoNoGoDecision | null {
  const raw = asString(value)?.toUpperCase();
  if (raw === "GO") return "go";
  if (raw === "NO-GO" || raw === "NO_GO" || raw === "NOGO") return "no_go";
  return null;
}

function extractVetoFromText(
  text: string,
): Array<{ by: string; reason: string }> {
  const out: Array<{ by: string; reason: string }> = [];
  const re = /"veto"\s*:\s*\{[\s\S]*?"by"\s*:\s*"([^"]+)"[\s\S]*?"reason"\s*:\s*"([^"]+)"/g;
  for (const match of text.matchAll(re)) {
    out.push({ by: match[1], reason: match[2] });
  }
  return out;
}

export function productConvergencePromptSection(): string {
  return `
## Product Workflow Rules (mandatory)
- Produce tangible deliverables: pricing models, briefs, copy, specs — not discussion-only output.
- Save your primary deliverable with \`write_file\` under your role folder in \`docs/{role}/\`.
- End every reply with the fenced JSON handoff block below (parsed per step into product consensus).

## Consensus Handoff (mandatory structured output)
End your reply with a fenced JSON block. Omit fields you cannot fill:
\`\`\`json
{
  "consensusUpdate": "<markdown summary of YOUR step only — key findings, numbers, recommendations>",
  "nextAction": "<single concrete sentence for the NEXT agent>",
  "decisions": [{"by": "your-agent-name", "what": "...", "why": "..."}],
  "openQuestions": ["..."],
  "veto": null
}
\`\`\`
- \`consensusUpdate\` should be a self-contained markdown section (headings, bullets, tables) — not empty.
- If you are Charlie Munger and want to block, set \`"veto": {"by": "critic-munger", "reason": "..."}\`.
`.trim();
}

export function convergencePromptSection(
  cycleNumber: number,
  phase: CompanyPhase,
  interests: string[] = [],
): string {
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
${formatInterestsPromptSection(interests)}

## Consensus Handoff (mandatory structured output)
This is a per-PRODUCT memory. End your reply with a fenced JSON block that will be parsed and stored as one consensus revision per step. Omit fields you cannot fill:
\`\`\`json
{
  "consensusUpdate": "<optional full markdown to replace this step's entry>",
  "nextAction": "<single concrete sentence>",
  "decisions": [{"by": "ceo-bezos", "what": "...", "why": "..."}],
  "openQuestions": ["..."],
  "veto": null
}
\`\`\`
- If you are Charlie Munger and want to block a decision, set "veto": {"by": "critic-munger", "reason": "..."}.
- If you do not fill the block, the system still records your prose output as the revision — but you lose the structured trace. Always include the block.
`.trim();
}

export async function persistDiscoveryPipelineIdeas(
  tenantId: string,
  topIdeas: string[],
): Promise<void> {
  if (topIdeas.length === 0) return;
  const interestCategories = await getTenantInterestCategories(tenantId);
  const ideasWithScores = topIdeas.slice(0, 3).map((title) => ({
    title,
    interestScore: scoreIdeaAgainstInterests(title, null, interestCategories),
  }));
  await addPipelineIdeas(tenantId, ideasWithScores);
  await updateCompanyPhase(tenantId, "validating");
}

export async function processConvergenceAfterRun(
  tenantId: string,
  workflowName: string,
  memory: SharedMemory,
  runId: string,
  productSlug?: string,
  runStatus: "COMPLETED" | "FAILED" | "CANCELLED" = "COMPLETED",
): Promise<void> {
  const enriched = enrichSharedMemoryFromAgentOutputs(memory);
  const stoppedByVeto = memory._stoppedByVeto === true;

  // 1. Per-product handoffs (one revision per step) — only when a product is in scope.
  if (productSlug && !isCompanyScopedMemory(memory as Record<string, unknown>)) {
    const product = await getProductBySlug(tenantId, productSlug);
    if (product) {
      const history = Array.isArray(memory._history) ? memory._history : [];
      for (let i = 0; i < history.length; i++) {
        const h = history[i];
        if (!h?.agentName) continue;
        const stepOutput =
          typeof h.output === "string" && h.output.trim()
            ? h.output
            : typeof memory[h.agentName] === "string"
              ? String(memory[h.agentName])
              : "";
        const handoff = extractHandoffFromAgentOutput(
          stepOutput,
          h.agentName,
          h.stepOrder ?? i + 1,
        );
        handoff.stepId = h.stepId;
        handoff.runId = runId;
        handoff.stepOrder = h.stepOrder ?? i + 1;
        await appendProductHandoff({
          productId: product.id,
          productSlug: product.slug,
          tenantId: product.tenantId,
          ...handoff,
        });
        const docBody = handoff.content.trim() || stepOutput.trim();
        if (docBody && !shouldSkipHandoffDocPersist(h)) {
          await persistHandoffAsAgentDoc({
            workspaceRoot: resolveProductWorkspaceRoot(product.slug),
            agentName: h.agentName,
            workflowName,
            runId,
            content: docBody,
          });
        }
      }

      if (product.orgUnitId) {
        await persistOrgUnitHandoffsFromRun({
          tenantId: product.tenantId,
          productId: product.id,
          orgUnitId: product.orgUnitId,
          runId,
          workflowName,
          history,
        });
      }

      const { finalizeProductRunClosure } = await import("./product-run-closure.js");
      await finalizeProductRunClosure({
        tenantId,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        memory,
        runId,
        workflowName,
        runStatus: stoppedByVeto ? "CANCELLED" : runStatus,
      });
    }
  }

  if (stoppedByVeto) {
    const topIdeas = asStringArray(enriched.topIdeas);
    if (workflowName === WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY && topIdeas.length > 0) {
      await persistDiscoveryPipelineIdeas(tenantId, topIdeas);
    }
    const companyMemory: SharedMemory = {
      ...enriched,
      nextAction: asString(memory.nextAction) ?? undefined,
    };
    await persistCompanyConsensusFromRun(tenantId, companyMemory);
    const cycle = await ensureTenantCycleState(tenantId);
    await prisma.tenantCycleState.update({
      where: { tenantId },
      data: { cycleNumber: cycle.cycleNumber + 1 },
    });
    return;
  }

  // 2. Company-level (tenant) memory: cycle strategy, pipeline, next action, phase.
  //    Only the LAST agent's view is reflected in the tenant consensus; per-step detail
  //    lives in ProductConsensusRevision. Tenant consensus is the company-level baton.
  const companyMemory: SharedMemory = { ...enriched };
  if (productSlug) {
    // Don't let per-product nextAction leak into the company memory.
    companyMemory.nextAction = undefined;
  }
  await persistCompanyConsensusFromRun(tenantId, companyMemory);

  const consensus = await prisma.tenantConsensus.findUnique({ where: { tenantId } });
  const cycle = await ensureTenantCycleState(tenantId);
  const rawNextAction = asString(companyMemory.nextAction) ?? consensus?.nextAction ?? null;
  const nextAction = rawNextAction ? unwrapStuckNextAction(rawNextAction) : null;
  const lastCompared = cycle.lastNextAction ? unwrapStuckNextAction(cycle.lastNextAction) : null;

  let stuckCounter = cycle.stuckCounter;
  if (nextAction && lastCompared === nextAction) {
    stuckCounter += 1;
  } else {
    stuckCounter = 0;
  }

  const topIdeas = asStringArray(enriched.topIdeas);
  if (topIdeas.length > 0) {
    await persistDiscoveryPipelineIdeas(tenantId, topIdeas);
  }

  const goNoGo = parseGoNoGo(enriched.goNoGo);
  const productSlugResolved =
    asString(enriched.productSlug) ?? slugifyProductName(asString(enriched.productName) ?? "");
  const productName = asString(enriched.productName);

  if (goNoGo === "go" && productSlugResolved && productName) {
    const ideas = await listPipelineIdeas(tenantId);
    const candidate = ideas.find(
      (i) => i.goNoGo === "pending" && slugifyProductName(i.title) === productSlugResolved,
    ) ?? ideas[0];

    if (workflowName === WORKFLOW_NAMES.NEW_PRODUCT_EVALUATION) {
      const agentOutputs = Array.isArray(memory._history)
        ? memory._history.map((h) => ({ agentName: h.agentName, output: h.output }))
        : [];
      const veto = agentOutputs
        .flatMap((a) => extractVetoFromText(a.output))
        .find((v) => v.by === "critic-munger");
      const recommended = veto ? ("no_go" as const) : ("go" as const);
      const fallback = asString(enriched.rationale) ?? productName;
      const { rationale, evidence } = buildRationaleFromMemory(
        agentOutputs,
        recommended,
        fallback,
      );
      if (candidate) {
        await createDecisionProposal({
          tenantId,
          ideaId: candidate.id,
          runId,
          workflowName,
          recommended,
          rationale,
          evidence,
        });
        if (ideas[0]) await markIdeaGoNoGo(ideas[0].id, "pending");
      }
    } else {
      const building = await countBuildingProducts(tenantId);
      const existing = await getProductBySlug(tenantId, productSlugResolved);
      if (!existing && building < 2) {
        const product = await bootstrapProduct({
          tenantId,
          slug: productSlugResolved,
          name: productName,
          description: asString(enriched.productDescription),
        });
        await setFocusProduct(tenantId, product.id);
        await updateCompanyPhase(tenantId, "building");
      } else if (existing) {
        await upsertTenantProduct({
          tenantId,
          slug: productSlugResolved,
          name: productName,
          phase: "building",
          goNoGo: "go",
        });
        await setFocusProduct(tenantId, existing.id);
      }
      if (ideas[0]) await markIdeaGoNoGo(ideas[0].id, "go");
    }
  } else if (goNoGo === "no_go") {
    const ideas = await listPipelineIdeas(tenantId);
    if (ideas[0]) await markIdeaGoNoGo(ideas[0].id, "no_go");
    await updateCompanyPhase(tenantId, "exploring");
  }

  if (typeof enriched.revenueUsd === "number" && productSlugResolved) {
    await upsertTenantProduct({
      tenantId,
      slug: productSlugResolved,
      name: productName ?? productSlugResolved,
      revenueUsd: enriched.revenueUsd,
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

  if (stuckCounter >= 2 && nextAction && !isStuckPivotNextAction(rawNextAction ?? "")) {
    const stuckMemory: SharedMemory = {
      ...enriched,
      nextAction: buildStuckPivotNextAction(nextAction),
    };
    await persistCompanyConsensusFromRun(tenantId, stuckMemory);
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

export async function backfillPipelineFromLastDiscovery(tenantId: string): Promise<number> {
  const existing = await listPipelineIdeas(tenantId);
  if (existing.length > 0) return 0;

  const lastRun = await prisma.executionRun.findFirst({
    where: {
      tenantId,
      status: "COMPLETED",
      workflow: { name: WORKFLOW_NAMES.OPPORTUNITY_DISCOVERY },
    },
    orderBy: { createdAt: "desc" },
    select: { sharedMemory: true },
  });

  if (!lastRun?.sharedMemory || typeof lastRun.sharedMemory !== "object") return 0;

  const enriched = enrichSharedMemoryFromAgentOutputs(lastRun.sharedMemory as SharedMemory);
  const topIdeas = asStringArray(enriched.topIdeas);
  if (topIdeas.length === 0) return 0;

  const interestCategories = await getTenantInterestCategories(tenantId);
  await addPipelineIdeas(
    tenantId,
    topIdeas.slice(0, 3).map((title) => ({
      title,
      interestScore: scoreIdeaAgainstInterests(title, null, interestCategories),
    })),
  );
  await updateCompanyPhase(tenantId, "validating");
  return topIdeas.length;
}
