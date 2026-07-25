import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import type { OrgStudioProposal } from "./org-os-types.js";
import {
  CATALOG_STUDIO_MAX_TOKENS_MUNGER,
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  generateCatalogJson,
  parseJsonFromLlm,
  tenantLanguageModel,
} from "./catalog-studio-llm.js";

export { parseJsonFromLlm, tenantLanguageModel };

export async function enhanceOrgProposalWithLlm(
  tenantId: string,
  proposal: OrgStudioProposal,
  mission: string,
): Promise<OrgStudioProposal> {
  if (mission.trim().length < 12) return proposal;

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        "You refine virtual department proposals for a multi-agent company OS.",
        "Respond ONLY with a JSON object:",
        '{ "summary": "1-2 sentences", "brandVoice": "string", "niche": "string", "designMdAppend": "markdown section" }',
      ].join("\n"),
      [
        `Template: ${proposal.templateName} (${proposal.orgUnitType})`,
        `Department name: ${proposal.suggestedName}`,
        `Mission: ${mission}`,
        `Current defaults: ${JSON.stringify(proposal.configDefaults).slice(0, 800)}`,
      ].join("\n"),
      CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
    );

    if (!parsed) return proposal;

    const designAppend =
      typeof parsed.designMdAppend === "string" ? parsed.designMdAppend.trim() : "";

    return {
      ...proposal,
      summary: typeof parsed.summary === "string" ? parsed.summary : proposal.summary,
      configDefaults: {
        ...proposal.configDefaults,
        ...(typeof parsed.brandVoice === "string" ? { brandVoice: parsed.brandVoice } : {}),
        ...(typeof parsed.niche === "string" ? { niche: parsed.niche } : {}),
      },
      designMd: designAppend ? `${proposal.designMd}\n\n${designAppend}` : proposal.designMd,
    };
  } catch {
    return proposal;
  }
}

export interface OrgStudioMungerReview {
  approved: boolean;
  notes: string;
  veto?: { by: string; reason: string };
}

export async function reviewOrgProposalWithMunger(
  tenantId: string,
  proposal: OrgStudioProposal,
): Promise<OrgStudioMungerReview> {
  if (!proposal.suggestedAgents.length) {
    return {
      approved: false,
      notes: "No agents proposed.",
      veto: { by: MUNGER_AGENT_NAME, reason: "Department has no agent roles — cannot operate." },
    };
  }

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        `You are Charlie Munger (${MUNGER_AGENT_NAME}). Invert: why would this department fail?`,
        "Respond ONLY with JSON:",
        '{ "notes": "brief inversion / pre-mortem", "veto": null | { "by": "critic-munger", "reason": "fatal flaw" } }',
        "Veto only for fatal flaws: illegal scope, incoherent niche, missing revenue path, or agent mismatch.",
      ].join("\n"),
      [
        `Proposed department: ${proposal.suggestedName}`,
        `Type: ${proposal.orgUnitType}`,
        `Mission: ${proposal.description}`,
        `Agents: ${proposal.suggestedAgents.map((a) => a.name).join(", ")}`,
        `Config: ${JSON.stringify(proposal.configDefaults).slice(0, 600)}`,
      ].join("\n"),
      CATALOG_STUDIO_MAX_TOKENS_MUNGER,
      0.3,
    );

    if (!parsed) {
      return { approved: true, notes: "Munger review inconclusive — proceeding." };
    }

    const vetoRaw = parsed.veto;
    if (
      vetoRaw &&
      typeof vetoRaw === "object" &&
      typeof (vetoRaw as { reason?: string }).reason === "string" &&
      (vetoRaw as { reason: string }).reason.trim()
    ) {
      return {
        approved: false,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        veto: {
          by: MUNGER_AGENT_NAME,
          reason: (vetoRaw as { reason: string }).reason.trim(),
        },
      };
    }

    return {
      approved: true,
      notes: typeof parsed.notes === "string" ? parsed.notes : "Munger: no fatal flaws detected.",
    };
  } catch {
    return { approved: true, notes: "Munger review skipped (LLM unavailable)." };
  }
}
