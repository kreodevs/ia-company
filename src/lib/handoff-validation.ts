import type { StepInputConfig, SharedMemory } from "../types/index.js";
import { parseScopeContract } from "./scope-contract.js";
import { parseConsensusHandoffFromOutput } from "./product-consensus.js";
import { collectJsonObjects } from "./structured-memory.js";
import { asString } from "./structured-memory.js";

export function hasStructuredHandoffJson(output: string): boolean {
  if (!output.trim()) return false;

  for (const obj of collectJsonObjects(output)) {
    const consensusUpdate = asString(obj.consensusUpdate);
    const nextAction = asString(obj.nextAction);
    if (consensusUpdate || nextAction) return true;
  }

  const parsed = parseConsensusHandoffFromOutput(output, "agent");
  return Boolean(parsed.content?.trim() || parsed.nextAction?.trim());
}

export function shouldEnforceHandoffJson(
  inputConfig: StepInputConfig,
  sharedMemory: SharedMemory,
): boolean {
  const cfg = inputConfig as StepInputConfig & { requireHandoffJson?: boolean };
  if (cfg.requireHandoffJson === false) return false;
  if (cfg.requireHandoffJson === true) return true;

  const contract = parseScopeContract(sharedMemory as Record<string, unknown>);
  return contract?.intent === "deliver";
}
