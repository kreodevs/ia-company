import type { DecisionProposalEvidence, OfficeEncargoDocument } from "./api";
import { pickDocumentForAgent } from "@platform/decision-evidence";
import {
  AGENT_EMOJI,
  AGENT_PERSONA_NAMES,
  agentRoleLabelKey,
  humanizeAgentSlug,
} from "./office-visual";

export { pickDocumentForAgent };

export interface EvidenceChipMeta {
  agent: string;
  displayName: string;
  roleLabel: string;
  emoji: string;
}

/** Pull author name from agent markdown when present (e.g. **De:** Jeff Bezos). */
export function extractPersonaFromSummary(summary: string): string | null {
  const patterns = [
    /\*\*(?:Analista|De|Asesor[^:*]*|By|Analyst|From|Advisor[^:*]*):\*\*\s*([^\n(,]+)/i,
    /\*\*(?:Chief Skeptic|CEO)[^:]*:\*\*\s*([^\n(,]+)/i,
  ];
  for (const re of patterns) {
    const match = summary.match(re);
    const name = match?.[1]?.trim();
    if (name) return name;
  }
  return null;
}

export function resolveEvidenceChip(
  agent: string,
  summary: string,
  translate: (key: string) => string,
): EvidenceChipMeta {
  const displayName =
    extractPersonaFromSummary(summary) ??
    AGENT_PERSONA_NAMES[agent] ??
    humanizeAgentSlug(agent);
  const roleLabel = translate(agentRoleLabelKey(agent));
  const emoji = AGENT_EMOJI[agent] ?? "🤖";
  return { agent, displayName, roleLabel, emoji };
}

export function buildEvidenceChipItems(
  evidence: DecisionProposalEvidence[],
  documents: OfficeEncargoDocument[] | null,
  translate: (key: string) => string,
) {
  return evidence.map((entry) => {
    const chip = resolveEvidenceChip(entry.agent, entry.summary, translate);
    const document = documents
      ? pickDocumentForAgent(documents, entry.agent, entry.summary)
      : null;
    return { ...chip, summary: entry.summary, document };
  });
}
