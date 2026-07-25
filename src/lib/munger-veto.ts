import { parseConsensusHandoffFromOutput } from "./product-consensus.js";

export const MUNGER_AGENT_NAME = "critic-munger";

export interface MungerVeto {
  by: string;
  reason: string;
}

export function extractMungerVeto(agentName: string, output: string): MungerVeto | null {
  if (agentName !== MUNGER_AGENT_NAME) return null;

  const handoff = parseConsensusHandoffFromOutput(output, agentName);
  if (handoff.veto?.reason?.trim()) {
    return {
      by: handoff.veto.by || MUNGER_AGENT_NAME,
      reason: handoff.veto.reason.trim(),
    };
  }

  return null;
}

export function formatMungerVetoError(veto: MungerVeto): string {
  return `VETO: ${veto.reason}`;
}

export function isVetoErrorMessage(message: string | null | undefined): boolean {
  return typeof message === "string" && message.startsWith("VETO:");
}
