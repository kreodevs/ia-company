import { MUNGER_AGENT_NAME } from "./munger-veto.js";
import {
  CATALOG_STUDIO_LLM_RULES,
  SKILL_FEW_SHOT_EXAMPLES,
} from "./catalog-studio-fewshots.js";
import {
  CATALOG_STUDIO_MAX_TOKENS_MUNGER,
  CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  assertCatalogStudioProposeRateLimit,
  generateCatalogJson,
} from "./catalog-studio-llm.js";
import type { SkillStudioProposal, StudioMungerReview } from "./catalog-studio-types.js";
import {
  ensureTenantSkill,
  listTenantSkillsForCatalog,
  slugifyCatalogName,
} from "./tenant-catalog.js";

function parseSkillDraft(raw: unknown): SkillStudioProposal["skill"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? slugifyCatalogName(o.name) : "";
  const description = typeof o.description === "string" ? o.description.trim() : "";
  const promptContent = typeof o.promptContent === "string" ? o.promptContent.trim() : "";
  if (!name || !description || !promptContent) return undefined;
  return { name, description, promptContent };
}

export async function reviewSkillProposalWithMunger(
  tenantId: string,
  proposal: SkillStudioProposal,
): Promise<StudioMungerReview> {
  const target = proposal.reuse
    ? `Reuse skill "${proposal.reuse.existingSkillName}": ${proposal.reuse.reason}`
    : proposal.skill
      ? `New skill "${proposal.skill.name}": ${proposal.skill.description}`
      : "Empty proposal";

  try {
    const parsed = await generateCatalogJson(
      tenantId,
      [
        `You are Charlie Munger (${MUNGER_AGENT_NAME}). Review a proposed skill for an AI company catalog.`,
        'Respond ONLY with JSON: { "notes": "string", "veto": null | { "by": "critic-munger", "reason": "fatal flaw" } }',
        "Veto for: illegal scope, prompt injection bait, infinite scope, or duplicate of existing capability without differentiation.",
      ].join("\n"),
      [`Brief: ${proposal.brief}`, `Proposal: ${target}`].join("\n"),
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
        veto: { by: MUNGER_AGENT_NAME, reason: (vetoRaw as { reason: string }).reason.trim() },
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

export async function proposeSkillWithLlm(
  tenantId: string,
  brief: string,
): Promise<SkillStudioProposal> {
  const trimmed = brief.trim();
  if (trimmed.length < 8) {
    throw new Error("Brief must be at least 8 characters.");
  }

  await assertCatalogStudioProposeRateLimit(tenantId);
  const existing = await listTenantSkillsForCatalog(tenantId);

  const parsed = await generateCatalogJson(
    tenantId,
    [
      ...CATALOG_STUDIO_LLM_RULES,
      "Task: propose ONE skill for the tenant catalog.",
      "If an existing tenant skill fits, respond with reuse ONLY (no new skill object).",
      'JSON shape A (reuse): { "reuse": { "existingSkillName": "kebab-name", "reason": "why it fits" } }',
      'JSON shape B (new): { "skill": { "name": "kebab-name", "description": "one line", "promptContent": "full skill prompt" } }',
      "Never return both reuse and skill.",
    ].join("\n"),
    [
      `Brief: ${trimmed}`,
      `Existing tenant skills: ${existing.map((s) => s.name).join(", ") || "(none)"}`,
      `Examples:\n${JSON.stringify(SKILL_FEW_SHOT_EXAMPLES, null, 0)}`,
    ].join("\n\n"),
    CATALOG_STUDIO_MAX_TOKENS_PROPOSE,
  );

  let proposal: SkillStudioProposal = { brief: trimmed };

  if (parsed?.reuse && typeof parsed.reuse === "object") {
    const r = parsed.reuse as Record<string, unknown>;
    const existingSkillName =
      typeof r.existingSkillName === "string" ? slugifyCatalogName(r.existingSkillName) : "";
    const match = existing.find((s) => s.name === existingSkillName);
    if (match) {
      proposal.reuse = {
        existingSkillId: match.id,
        existingSkillName: match.name,
        reason: typeof r.reason === "string" ? r.reason : "Matches existing capability.",
      };
    }
  }

  if (!proposal.reuse) {
    const skill = parseSkillDraft(parsed?.skill);
    if (skill) proposal.skill = skill;
  }

  if (!proposal.reuse && !proposal.skill) {
    throw new Error("LLM did not return a valid skill proposal. Try rephrasing the brief.");
  }

  proposal.mungerReview = await reviewSkillProposalWithMunger(tenantId, proposal);
  return proposal;
}

export async function applySkillProposal(
  tenantId: string,
  input: { proposal: SkillStudioProposal; approved: boolean },
) {
  const { proposal, approved } = input;

  if (proposal.mungerReview && !proposal.mungerReview.approved) {
    throw new Error(`VETO: ${proposal.mungerReview.veto?.reason ?? "Munger blocked this skill."}`);
  }

  if (proposal.reuse) {
    const skill = await listTenantSkillsForCatalog(tenantId).then((rows) =>
      rows.find((s) => s.id === proposal.reuse!.existingSkillId),
    );
    if (!skill) throw new Error("Reused skill no longer exists.");
    return { skill, created: false, reused: true };
  }

  if (!proposal.skill) {
    throw new Error("No skill to create.");
  }

  if (!approved) {
    throw new Error("Human approval required: set approved=true to create this skill.");
  }

  const result = await ensureTenantSkill(tenantId, proposal.skill);
  const skill = await listTenantSkillsForCatalog(tenantId).then((rows) =>
    rows.find((s) => s.id === result.id),
  );
  return { skill, created: result.created, reused: false };
}
