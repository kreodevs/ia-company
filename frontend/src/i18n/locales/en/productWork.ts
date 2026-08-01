export const productWork = {
  title: "Assign work to product",
  subtitle: "Run procedures or agents on {{name}} with product workspace and memory context.",
  loading: "Loading options…",
  loadFailed: "Could not load launch options.",
  launch: "Launch",
  assignAgent: "Assign agent",
  agentCount: "{{count}} agents",
  stepCount: "{{count}} steps",
  taskLabel: "Task (optional)",
  taskPlaceholder: "E.g. SEO audit of landing page, 90-day content plan…",
  taskHint: "If empty, agents use the product memory Next Action.",
  noWorkflows: "No custom procedures. Use presets or create one under Settings → Procedures.",
  tabs: {
    presets: "Presets",
    workflows: "Procedures",
    agents: "Agents",
  },
  categories: {
    marketing: "Marketing",
    launch: "Launch",
    build: "Development",
    business: "Business",
    ops: "Operations",
  },
  presets: {
    "seo-review": {
      label: "SEO Review",
      description: "SEO audit, keywords, meta tags, and content plan (marketing-godin).",
    },
    "marketing-sprint": {
      label: "Marketing Sprint",
      description: "Campaign, funnel, and outreach: marketing → sales → growth.",
    },
    "product-launch": {
      label: "Product Launch",
      description: "QA → DevOps → Marketing → Sales → Ops → CEO.",
    },
    "feature-development": {
      label: "Feature Development",
      description: "UX → UI → Fullstack → QA → DevOps.",
    },
    "pricing-and-monetization": {
      label: "Pricing & Monetization",
      description: "Research → CFO → Sales → Munger → CEO.",
    },
    "weekly-review": {
      label: "Weekly Review",
      description: "Ops → Sales → CFO → QA → CEO.",
    },
  },
} as const;
