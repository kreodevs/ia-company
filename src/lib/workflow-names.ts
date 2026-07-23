export const WORKFLOW_NAMES = {
  OPPORTUNITY_DISCOVERY: "opportunity-discovery",
  NEW_PRODUCT_EVALUATION: "new-product-evaluation",
  FEATURE_DEVELOPMENT: "feature-development",
  PRODUCT_LAUNCH: "product-launch",
  PRICING_MONETIZATION: "pricing-and-monetization",
  WEEKLY_REVIEW: "weekly-review",
  RESEARCH_DRILLDOWN: "research-drilldown",
  SEO_REVIEW: "seo-review",
  MARKETING_SPRINT: "marketing-sprint",
} as const;

export type WorkflowName = (typeof WORKFLOW_NAMES)[keyof typeof WORKFLOW_NAMES];

export const MAX_BUILDING_PRODUCTS = 2;
