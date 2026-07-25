import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import type { OrgStudioProposal, SuggestedAgentDef } from "./org-os-types.js";
import type { NewSkillDraft } from "./catalog-studio-types.js";
import { AGENT_FEW_SHOT_EXAMPLES, CATALOG_STUDIO_LLM_RULES } from "./catalog-studio-fewshots.js";
import {
  CATALOG_STUDIO_MAX_TOKENS_MUNGER,
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  generateCatalogJson,
  parseJsonFromLlm,
  tenantLanguageModel,
} from "./catalog-studio-llm.js";
import {
  listTenantAgentsForCatalog,
  listTenantSkillsForCatalog,
  slugifyCatalogName,
} from "./tenant-catalog.js";

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

function parseSuggestedAgent(raw: unknown): SuggestedAgentDef | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
  const role = typeof o.role === "string" ? o.role.trim() : "";
  const systemPrompt = typeof o.systemPrompt === "string" ? o.systemPrompt.trim() : "";
  if (!name || !role || !systemPrompt) return undefined;
  const skillNames = Array.isArray(o.skillNames)
    ? o.skillNames.filter((s): s is string => typeof s === "string").map(slugifyCatalogName)
    : [];
  return { name, role, systemPrompt, skillNames };
}

export async function refineOrgSuggestedAgentsWithLlm(
  tenantId: string,
  proposal: OrgStudioProposal,
  mission: string,
): Promise<SuggestedAgentDef[]> {
  if (mission.trim().length < 12) return proposal.suggestedAgents;

  try {
    const [tenantAgents, tenantSkills] = await Promise.all([
      listTenantAgentsForCatalog(tenantId),
      listTenantSkillsForCatalog(tenantId),
    ]);

    const parsed = await generateCatalogJson(
      tenantId,
      [
        ...CATALOG_STUDIO_LLM_RULES,
        "Task: refine the agent roster for a virtual department.",
        "Prefer REUSE: use exact existing tenant agent names when fit ≥80%.",
        "Return ONLY JSON: { \"suggestedAgents\": [{ \"name\", \"role\", \"systemPrompt\", \"skillNames\": [] }] }",
        "Keep 2-6 agents. skillNames must reference tenant skills when possible.",
      ].join("\n"),
      [
        `Department: ${proposal.suggestedName} (${proposal.orgUnitType})`,
        `Mission: ${mission}`,
        `Template roster: ${JSON.stringify(proposal.suggestedAgents)}`,
        `Tenant agents: ${tenantAgents.map((a) => a.name).join(", ") || "(none)"}`,
        `Tenant skills: ${tenantSkills.map((s) => s.name).join(", ") || "(none)"}`,
        `Examples: ${JSON.stringify(AGENT_FEW_SHOT_EXAMPLES)}`,
      ].join("\n\n"),
      CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
    );

    if (!parsed || !Array.isArray(parsed.suggestedAgents)) return proposal.suggestedAgents;

    const refined: SuggestedAgentDef[] = [];
    for (const item of parsed.suggestedAgents) {
      const agent = parseSuggestedAgent(item);
      if (agent) refined.push(agent);
    }
    return refined.length ? refined : proposal.suggestedAgents;
  } catch {
    return proposal.suggestedAgents;
  }
}

function parseSkillDrafts(raw: unknown): NewSkillDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: NewSkillDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    const promptContent = typeof o.promptContent === "string" ? o.promptContent.trim() : "";
    if (name && description && promptContent) {
      out.push({ name, description, promptContent });
    }
  }
  return out;
}

export async function proposeMissingSkillsForOrg(
  tenantId: string,
  missingNames: string[],
  mission: string,
): Promise<NewSkillDraft[]> {
  if (!missingNames.length) return [];

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        "Draft tenant skills missing from catalog for a new department.",
        "Return ONLY JSON: { \"skills\": [{ \"name\", \"description\", \"promptContent\" }] }",
        "Use exact names provided. One entry per missing skill.",
      ].join("\n"),
      [
        `Mission: ${mission}`,
        `Missing skill names: ${missingNames.join(", ")}`,
      ].join("\n"),
      CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
    );

    const drafts = parseSkillDrafts(parsed?.skills);
    const byName = new Map(drafts.map((d) => [d.name, d]));
    return missingNames.map(
      (name) =>
        byName.get(slugifyCatalogName(name)) ?? {
          name: slugifyCatalogName(name),
          description: `Skill for ${name.replace(/-/g, " ")}`,
          promptContent: `You are the ${name} skill. Execute tasks aligned with the department mission: ${mission.slice(0, 200)}. End with JSON handoff when part of a workflow.`,
        },
    );
  } catch {
    return missingNames.map((name) => ({
      name: slugifyCatalogName(name),
      description: `Skill for ${name.replace(/-/g, " ")}`,
      promptContent: `You are the ${name} skill. Execute tasks for the department. End with JSON handoff when required.`,
    }));
  }
}
