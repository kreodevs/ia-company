import type { SharedMemory } from "../types/index.js";

export function buildImplementationBrief(input: {
  brief: string;
  sharedMemory: SharedMemory;
  productSlug?: string;
  productName?: string;
  tenantSlug?: string;
  projectPath?: string | null;
}): string {
  const nextAction =
    typeof input.sharedMemory.nextAction === "string" ? input.sharedMemory.nextAction : null;
  const focusProduct =
    typeof input.sharedMemory.focusProductName === "string"
      ? input.sharedMemory.focusProductName
      : input.productName ?? input.productSlug;

  const sections = [
    "# Implementation brief",
    "",
    input.brief.trim(),
    "",
    "## Context",
    `- Product: ${focusProduct ?? "unknown"}`,
  ];

  if (input.tenantSlug) sections.push(`- Tenant: ${input.tenantSlug}`);
  if (input.productSlug) sections.push(`- Product slug: ${input.productSlug}`);
  if (nextAction) sections.push(`- Consensus next action: ${nextAction}`);
  if (input.projectPath) sections.push(`- Workspace path on OpenCode server: ${input.projectPath}`);

  sections.push(
    "",
    "## Constraints",
    "- Do not delete production infrastructure",
    "- Do not commit secrets or credentials",
    "- Follow existing project conventions",
    "- Summarize what you changed when finished",
  );

  return sections.join("\n");
}
