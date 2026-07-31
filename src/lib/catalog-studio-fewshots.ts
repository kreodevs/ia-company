import { MARKETING_AGENCY_TEMPLATE } from "./business-templates.js";

/** Compact examples for LLM prompts — same shape as tenant catalog entries. */
export const SKILL_FEW_SHOT_EXAMPLES = [
  {
    name: "seo-content-strategist",
    description: "SEO audits, keyword clusters, and content briefs for organic growth.",
    promptContent:
      "You are an SEO content strategist. Produce actionable keyword clusters, content briefs, and on-page recommendations. Always cite assumptions. End with a JSON handoff block when part of a workflow.",
  },
  {
    name: "community-led-growth",
    description: "Community loops, engagement tactics, and retention plays.",
    promptContent:
      "You are a community-led growth specialist. Design engagement loops, moderation guidelines, and measurable community KPIs. End with JSON handoff when required.",
  },
];

export const AGENT_FEW_SHOT_EXAMPLES = MARKETING_AGENCY_TEMPLATE.suggestedAgents.slice(0, 3).map((a) => ({
  name: a.name,
  role: a.role,
  systemPrompt: a.systemPrompt.slice(0, 280),
  skillNames: a.skillNames ?? [],
}));

export const WORKFLOW_FEW_SHOT_EXAMPLES = [
  {
    name: "video-tutorial-pipeline",
    description:
      "Research codebase and UX → write script → produce TTS narration for product tutorials.",
    steps: [
      { agentName: "research-thompson", label: "Map product surface" },
      { agentName: "product-norman", label: "User flows & affordances" },
      { agentName: "copy-manager", label: "Tutorial script" },
      { agentName: "devops-hightower", label: "TTS / asset handoff" },
    ],
  },
  {
    name: "seo-review",
    description: "Marketing reviews landing SEO and conversion copy.",
    steps: [{ agentName: "marketing-godin", label: "SEO & copy audit" }],
  },
];

export const CATALOG_STUDIO_LLM_RULES = [
  "Prefer REUSE over CREATE — match existing tenant catalog entries by name/role when fit is ≥80%.",
  "Agent and skill names: lowercase kebab-case (e.g. copy-manager, seo-audit).",
  "Agents are tenant-scoped only — never reference platform-global IDs.",
  "systemPrompt: full markdown persona doc (## Rol, ## Persona, ## Principios, ## Flujo operativo, ## Formato de salida) + JSON handoff when in workflows.",
  "skill promptContent: capability + output format + constraints.",
  "Respond ONLY with valid JSON (no prose outside JSON).",
];
