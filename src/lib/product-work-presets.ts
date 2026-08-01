import { WORKFLOW_NAMES, type WorkflowName } from "./workflow-names.js";

export type ProductWorkPresetCategory = "marketing" | "launch" | "build" | "business" | "ops";

export interface ProductWorkPreset {
  id: string;
  workflowName: WorkflowName | string;
  category: ProductWorkPresetCategory;
  agentCount: number;
  /** Shown to coordinator / launcher — concrete outcome */
  taskTemplate: string;
  deliverableHint: string;
  /** Primary presets surfaced first in product UI */
  primary?: boolean;
}

export const PRIMARY_PRODUCT_PRESET_IDS = [
  "seo-review",
  "pricing-and-monetization",
  "product-launch",
  "marketing-sprint",
] as const;

export const PRODUCT_WORK_PRESETS: ProductWorkPreset[] = [
  {
    id: "seo-review",
    workflowName: WORKFLOW_NAMES.SEO_REVIEW,
    category: "marketing",
    agentCount: 1,
    primary: true,
    taskTemplate:
      "Audit SEO for this product landing page. Deliver a prioritized fix list (title, meta, H1, schema, internal links) with copy-ready snippets.",
    deliverableHint:
      "Save audit as markdown in docs/research/ with at least 5 actionable fixes and before/after copy.",
  },
  {
    id: "marketing-sprint",
    workflowName: WORKFLOW_NAMES.MARKETING_SPRINT,
    category: "marketing",
    agentCount: 3,
    primary: true,
    taskTemplate:
      "Run a 3-agent marketing sprint: positioning angle, channel plan, and one publish-ready asset for this product.",
    deliverableHint:
      "Each agent saves deliverables under docs/{role}/ — final asset must be ready to post (not outline-only).",
  },
  {
    id: "content-sprint",
    workflowName: WORKFLOW_NAMES.CONTENT_SPRINT,
    category: "marketing",
    agentCount: 3,
    taskTemplate:
      "Produce content sprint: topic brief, draft article/landing section, and QA checklist for this product.",
    deliverableHint: "At least one full draft markdown file in docs/copy-manager/ or docs/marketing-godin/.",
  },
  {
    id: "campaign-launch",
    workflowName: WORKFLOW_NAMES.CAMPAIGN_LAUNCH,
    category: "marketing",
    agentCount: 4,
    taskTemplate:
      "Plan and draft a multi-channel launch campaign (email + social + landing hooks) for this product.",
    deliverableHint: "Campaign brief + 2 channel-ready copies saved under docs/marketing-godin/.",
  },
  {
    id: "product-launch",
    workflowName: WORKFLOW_NAMES.PRODUCT_LAUNCH,
    category: "launch",
    agentCount: 6,
    primary: true,
    taskTemplate:
      "Execute product launch checklist: positioning, landing copy, launch channels, and success metrics for this product.",
    deliverableHint:
      "Launch brief in docs/product-norman/, copy in docs/marketing-godin/, checklist with owners in docs/operations-pg/.",
  },
  {
    id: "feature-development",
    workflowName: WORKFLOW_NAMES.FEATURE_DEVELOPMENT,
    category: "build",
    agentCount: 5,
    taskTemplate:
      "Ship one vertical feature slice for this product — spec, implementation plan, and QA acceptance criteria.",
    deliverableHint: "Spec in docs/product-norman/, implementation notes in docs/fullstack-dhh/.",
  },
  {
    id: "pricing-and-monetization",
    workflowName: WORKFLOW_NAMES.PRICING_MONETIZATION,
    category: "business",
    agentCount: 5,
    primary: true,
    taskTemplate:
      "Build pricing and monetization package: tiers, unit economics, competitive anchors, and landing pricing copy.",
    deliverableHint:
      "Pricing model table in docs/cfo-campbell/, sales playbook snippet in docs/sales-ross/, copy in docs/marketing-godin/.",
  },
  {
    id: "weekly-review",
    workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
    category: "ops",
    agentCount: 5,
    taskTemplate: "Weekly review for this product: metrics, blockers, and one prioritized next experiment.",
    deliverableHint: "CEO summary + ops metrics in docs/operations-pg/ and docs/ceo-bezos/.",
  },
];
