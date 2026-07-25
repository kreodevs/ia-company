import { generateText } from "ai";
import { createLanguageModel } from "../core/providers.js";
import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import type { OrgStudioProposal } from "./org-os-types.js";
import { getPlatformSettingsSync } from "./platform-settings.js";
import { prisma } from "./prisma.js";
import { resolveEffectiveModel, tenantLlmFromRecord } from "./tenant-llm.js";

function parseJsonFromLlm(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function tenantLanguageModel(tenantId: string) {
  const llmConfig = await prisma.tenantLlmConfig.findUnique({ where: { tenantId } });
  const platform = getPlatformSettingsSync();
  const tenantLlm = tenantLlmFromRecord(llmConfig);
  const { model } = resolveEffectiveModel("inherit", tenantLlm);
  return createLanguageModel({
    provider: platform.defaultProvider,
    model,
    temperature: 0.45,
  });
}

export async function enhanceOrgProposalWithLlm(
  tenantId: string,
  proposal: OrgStudioProposal,
  mission: string,
): Promise<OrgStudioProposal> {
  if (mission.trim().length < 12) return proposal;

  try {
    const model = await tenantLanguageModel(tenantId);
    const result = await generateText({
      model,
      system: [
        "You refine virtual department proposals for a multi-agent company OS.",
        "Respond ONLY with a JSON object:",
        '{ "summary": "1-2 sentences", "brandVoice": "string", "niche": "string", "designMdAppend": "markdown section" }',
      ].join("\n"),
      prompt: [
        `Template: ${proposal.templateName} (${proposal.orgUnitType})`,
        `Department name: ${proposal.suggestedName}`,
        `Mission: ${mission}`,
        `Current defaults: ${JSON.stringify(proposal.configDefaults).slice(0, 800)}`,
      ].join("\n"),
      maxTokens: 700,
    });

    const parsed = parseJsonFromLlm(result.text);
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
    const model = await tenantLanguageModel(tenantId);
    const result = await generateText({
      model,
      system: [
        `You are Charlie Munger (${MUNGER_AGENT_NAME}). Invert: why would this department fail?`,
        "Respond ONLY with JSON:",
        '{ "notes": "brief inversion / pre-mortem", "veto": null | { "by": "critic-munger", "reason": "fatal flaw" } }',
        "Veto only for fatal flaws: illegal scope, incoherent niche, missing revenue path, or agent mismatch.",
      ].join("\n"),
      prompt: [
        `Proposed department: ${proposal.suggestedName}`,
        `Type: ${proposal.orgUnitType}`,
        `Mission: ${proposal.description}`,
        `Agents: ${proposal.suggestedAgents.map((a) => a.name).join(", ")}`,
        `Config: ${JSON.stringify(proposal.configDefaults).slice(0, 600)}`,
      ].join("\n"),
      maxTokens: 500,
      temperature: 0.3,
    });

    const parsed = parseJsonFromLlm(result.text);
    if (!parsed) {
      return { approved: true, notes: "Munger review inconclusive — proceeding." };
    }

    const vetoRaw = parsed.veto;
    if (
      vetoRaw &&
      typeof vetoRaw === "object" &&
      vetoRaw !== null &&
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
