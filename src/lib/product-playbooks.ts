import { WORKFLOW_NAMES } from "./workflow-names.js";

export interface ProductPlaybook {
  id: string;
  label: string;
  description: string;
  presetId?: string;
  workflowName?: string;
  deptTypes?: string[];
  taskTemplate: string;
}

export const PRODUCT_PLAYBOOKS: ProductPlaybook[] = [
  {
    id: "adapt-creative",
    label: "Adapt campaign creative",
    description: "Marketing dept refreshes copy and visuals from latest campaign signals.",
    presetId: "marketing-sprint",
    deptTypes: ["marketing_agency"],
    taskTemplate:
      "Review latest campaign metrics on the product desk and adapt creative (copy + social) for this product.",
  },
  {
    id: "pricing-review",
    label: "Pricing review",
    description: "CFO + sales review pricing using revenue and market signals.",
    presetId: "pricing-and-monetization",
    deptTypes: ["department"],
    taskTemplate:
      "Run pricing review for this product using revenue signals, waitlist, and competitive context.",
  },
  {
    id: "seo-audit",
    label: "SEO audit",
    description: "SEO team delivers prioritized fix list for the product landing.",
    presetId: "seo-review",
    deptTypes: ["marketing_agency"],
    taskTemplate:
      "Audit SEO for this product landing. Deliver prioritized fixes with copy-ready snippets.",
  },
  {
    id: "sunset-review",
    label: "Sunset review",
    description: "Human decision gate before archiving a product — Munger + CEO recommendation.",
    workflowName: WORKFLOW_NAMES.WEEKLY_REVIEW,
    taskTemplate:
      "Sunset review: assess monetization exhaustion, remaining options, and recommend GO/ARCHIVE with Munger inversion. Do not archive automatically.",
  },
  {
    id: "support-triage",
    label: "Support triage",
    description: "Support dept triages tickets using product RAG knowledge base.",
    presetId: "weekly-review",
    deptTypes: ["department", "custom"],
    taskTemplate:
      "Triage open support signals for this product. Draft responses using the product support knowledge base.",
  },
];

export function getPlaybookById(id: string): ProductPlaybook | undefined {
  return PRODUCT_PLAYBOOKS.find((p) => p.id === id);
}

export function playbooksForOrgType(orgUnitType: string | null | undefined): ProductPlaybook[] {
  if (!orgUnitType) return PRODUCT_PLAYBOOKS;
  return PRODUCT_PLAYBOOKS.filter(
    (p) => !p.deptTypes?.length || p.deptTypes.includes(orgUnitType),
  );
}
