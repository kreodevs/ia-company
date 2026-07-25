import type { DeskItemType } from "@prisma/client";

/** Canonical type strings for agent contracts and desk matching. */
export type DeskTypeRef = DeskItemType | string;

export const PLATFORM_AGENT_CONTRACTS: Record<
  string,
  { inputs: DeskTypeRef[]; outputs: DeskTypeRef[] }
> = {
  "research-thompson": { inputs: ["report"], outputs: ["report", "spec"] },
  "ceo-bezos": { inputs: ["report", "spec"], outputs: ["report"] },
  "critic-munger": { inputs: ["spec", "report"], outputs: ["report"] },
  "product-norman": { inputs: ["report", "spec"], outputs: ["spec", "report"] },
  "interaction-cooper": { inputs: ["spec", "report"], outputs: ["spec"] },
  "ui-duarte": { inputs: ["spec"], outputs: ["design", "report"] },
  "fullstack-dhh": { inputs: ["spec", "adr", "code"], outputs: ["code", "report"] },
  "qa-bach": { inputs: ["spec", "code"], outputs: ["report"] },
  "devops-hightower": { inputs: ["code", "spec"], outputs: ["report", "code"] },
  "marketing-godin": { inputs: ["spec", "report"], outputs: ["copy", "report", "social_post"] },
  "operations-pg": { inputs: ["report"], outputs: ["report"] },
  "sales-ross": { inputs: ["report", "spec"], outputs: ["report", "copy"] },
  "cfo-campbell": { inputs: ["report"], outputs: ["report"] },
  "copy-manager": { inputs: ["spec", "report"], outputs: ["copy", "social_post"] },
  "community-manager": { inputs: ["copy", "design"], outputs: ["social_post", "copy"] },
  "design-lead": { inputs: ["spec", "copy"], outputs: ["design"] },
  "seo-strategist": { inputs: ["report", "spec"], outputs: ["report", "copy"] },
  "content-editor": { inputs: ["copy", "report"], outputs: ["copy"] },
  "pricing-analyst": { inputs: ["report"], outputs: ["report"] },
  "onboarding-specialist": { inputs: ["spec"], outputs: ["copy", "report"] },
  "sdr-outbound": { inputs: ["report"], outputs: ["copy"] },
  "marketing-strategist": { inputs: ["spec", "report"], outputs: ["report", "copy"] },
  "support-lead": { inputs: ["report", "task"], outputs: ["report", "copy"] },
  "kb-curator": { inputs: ["report"], outputs: ["report"] },
};

export function parseContractTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function contractForAgentName(name: string): { inputs: string[]; outputs: string[] } {
  const hit = PLATFORM_AGENT_CONTRACTS[name];
  if (hit) {
    return { inputs: [...hit.inputs], outputs: [...hit.outputs] };
  }
  return { inputs: ["report"], outputs: ["report", "other"] };
}

export function agentAcceptsInput(contractInputs: unknown, itemType: string): boolean {
  const inputs = parseContractTypes(contractInputs);
  if (inputs.length === 0) return false;
  return inputs.includes(itemType) || inputs.includes("other");
}

export function humanLabelForDeskType(type: string): string {
  const labels: Record<string, string> = {
    spec: "Design document",
    adr: "Architecture decision",
    copy: "Copy",
    design: "Design",
    code: "Code",
    report: "Report",
    social_post: "Social post",
    task: "Task",
    other: "Deliverable",
  };
  return labels[type] ?? "Deliverable";
}

export function suggestNextRoleForType(type: string): string | null {
  const map: Record<string, string> = {
    spec: "fullstack-dhh",
    adr: "fullstack-dhh",
    code: "qa-bach",
    copy: "community-manager",
    design: "community-manager",
    report: "ceo-bezos",
    social_post: "community-manager",
  };
  return map[type] ?? null;
}
