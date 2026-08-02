import type { BusinessTemplateDefinition } from "./org-os-types.js";

export const MARKETING_AGENCY_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Agency profile",
        description: "How this marketing department operates.",
        fields: [
          {
            name: "niche",
            label: "Niche / ICP",
            type: "text",
            required: true,
            placeholder: "B2B SaaS, fintech, …",
            colSpan: 12,
          },
          {
            name: "channels",
            label: "Channels",
            type: "multiselect",
            options: [
              { label: "Instagram", value: "instagram" },
              { label: "LinkedIn", value: "linkedin" },
              { label: "X / Twitter", value: "twitter" },
              { label: "Email", value: "email" },
              { label: "Blog / SEO", value: "blog" },
            ],
            colSpan: 12,
          },
          {
            name: "postingCadence",
            label: "Posting cadence",
            type: "select",
            options: [
              { label: "Daily", value: "daily" },
              { label: "3× per week", value: "3x-week" },
              { label: "Weekly", value: "weekly" },
            ],
            defaultValue: "3x-week",
            colSpan: 6,
          },
          {
            name: "brandVoice",
            label: "Brand voice",
            type: "textarea",
            placeholder: "Direct, expert, no hype…",
            colSpan: 12,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand primary color",
            type: "color",
            defaultValue: "#C9A227",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    niche: "B2B SaaS",
    channels: ["linkedin", "blog"],
    postingCadence: "3x-week",
    brandVoice: "Clear, credible, founder-friendly. Short sentences. No jargon without explanation.",
    brandPrimaryColor: "#C9A227",
  },
  tokens: {
    color: {
      primary: { $value: "#C9A227", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
      surface: { $value: "#141414", $type: "color" },
    },
    typography: {
      fontFamily: { $value: "Inter, system-ui, sans-serif", $type: "fontFamily" },
    },
  },
  designMd: `# Marketing Agency — Design & Voice

## Visual
- Primary gold \`#C9A227\` on charcoal \`#0A0A0A\`
- Prefer high-contrast cards, generous whitespace

## Voice
- Expert but approachable
- Lead with outcome, then mechanism
- One CTA per asset

## Deliverables
- Copy: Google Doc style markdown under \`docs/marketing/\`
- Social: platform-specific hooks + body + hashtags in JSON handoff
- Design briefs: reference tokens above
`,
  suggestedAgents: [
    {
      name: "copy-manager",
      role: "Copy Manager",
      systemPrompt:
        "You are the Copy Manager for a digital marketing agency. Write conversion-focused copy aligned with the org design.md and brand voice. End every reply with the mandatory JSON handoff block.",
      skillNames: ["content-strategy", "seo-content-strategist"],
      artifactTypes: ["copy"],
    },
    {
      name: "community-manager",
      role: "Community Manager",
      systemPrompt:
        "You are the Community Manager. Plan and draft social content calendars and posts per channel. Use design.md for tone. End with JSON handoff.",
      skillNames: ["community-led-growth", "ph-community-outreach"],
      artifactTypes: ["social_post"],
    },
    {
      name: "design-lead",
      role: "Design Lead",
      systemPrompt: `You are the Design Lead for this department. Produce UX briefs, layout guidance, and Kreo PROTOTYPE previews (iframeUrl) using org design.md tokens. Follow skill kreo-ui — PROTOTYPE only: validate_ui_project_instructions → generate_ui_project; never pull_source_code_from_registry. You own the first visual pass; ui-duarte refines design system after human approval; fullstack-dhh implements DEV in projects/. End every reply with the platform consensus JSON handoff (consensusUpdate, nextAction, decisions, openQuestions, veto). Include iframeUrl and project slug when you generate a prototype.`,
      skillNames: ["frontend-design", "ui-ux-pro-max", "kreo-ui"],
      artifactTypes: ["design"],
    },
    {
      name: "marketing-strategist",
      role: "Marketing Strategist",
      systemPrompt:
        "You are the Marketing Strategist (Godin-style). Positioning, campaigns, and measurement. End with JSON handoff.",
      skillNames: ["marketing-godin", "content-strategy"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["content-sprint", "campaign-launch"],
  artifactTypes: ["copy", "social_post", "design", "report"],
};

export const PRODUCT_STUDIO_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Product studio",
        description: "How this product-building department operates.",
        fields: [
          {
            name: "maxBuildingProducts",
            label: "Max products in build",
            type: "number",
            defaultValue: 2,
            colSpan: 6,
          },
          {
            name: "defaultWorkflow",
            label: "Default workflow",
            type: "select",
            options: [
              { label: "Feature development", value: "feature-development" },
              { label: "Product launch", value: "product-launch" },
            ],
            defaultValue: "feature-development",
            colSpan: 6,
          },
          {
            name: "brandPrimaryColor",
            label: "Accent color",
            type: "color",
            defaultValue: "#C9A227",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    maxBuildingProducts: 2,
    defaultWorkflow: "feature-development",
    brandPrimaryColor: "#C9A227",
  },
  tokens: {
    color: {
      primary: { $value: "#C9A227", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# Product Studio

Ship product-led assets under \`docs/{role}/\`. Follow platform consensus + product consensus.`,
  suggestedAgents: [
    {
      name: "product-norman",
      role: "Product Lead",
      systemPrompt:
        "You are the Product Lead (Norman-style). Define specs, usability, and acceptance criteria. End with JSON handoff.",
      skillNames: ["product-strategist", "ux-audit-rethink"],
      artifactTypes: ["report"],
    },
    {
      name: "fullstack-dhh",
      role: "Full Stack Engineer",
      systemPrompt:
        "You implement features in the product workspace. Prefer simple, shippable diffs. End with JSON handoff.",
      skillNames: ["code-review-security"],
      artifactTypes: ["code"],
    },
    {
      name: "qa-bach",
      role: "QA Lead",
      systemPrompt:
        "You own release quality, test strategy, and bug classification. End with JSON handoff.",
      skillNames: ["senior-qa"],
      artifactTypes: ["report"],
    },
    {
      name: "devops-hightower",
      role: "DevOps",
      systemPrompt:
        "You handle deploy pipelines, observability, and production readiness. End with JSON handoff.",
      skillNames: ["devops"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["feature-development", "pricing-and-monetization"],
  artifactTypes: ["report", "code"],
};

export const CUSTOM_DEPARTMENT_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Department profile",
        fields: [
          {
            name: "mission",
            label: "Mission",
            type: "textarea",
            required: true,
            colSpan: 12,
          },
          {
            name: "operatingModel",
            label: "Operating model",
            type: "select",
            options: [
              { label: "Project-based", value: "project" },
              { label: "Retainer / client", value: "client" },
              { label: "Internal product", value: "product" },
            ],
            defaultValue: "project",
            colSpan: 6,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand color",
            type: "color",
            defaultValue: "#C9A227",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    mission: "Deliver outcomes for linked work items.",
    operatingModel: "project",
    brandPrimaryColor: "#C9A227",
  },
  tokens: {
    color: {
      primary: { $value: "#C9A227", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# Custom Department

Define voice, deliverables, and handoff format in this file after Org Studio apply.`,
  suggestedAgents: [
    {
      name: "dept-coordinator",
      role: "Department Coordinator",
      systemPrompt:
        "You coordinate work across the department. Break down tasks, assign focus, summarize outcomes. End with JSON handoff.",
      skillNames: ["team"],
      artifactTypes: ["report"],
    },
    {
      name: "dept-specialist",
      role: "Domain Specialist",
      systemPrompt:
        "You execute the core craft of this department per design.md and config. End with JSON handoff.",
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["feature-development"],
  artifactTypes: ["report", "other"],
};

export const SALES_REVOPS_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Sales & RevOps",
        description: "Pipeline, outbound, and revenue operations profile.",
        fields: [
          {
            name: "icp",
            label: "Ideal customer profile",
            type: "text",
            required: true,
            placeholder: "Mid-market B2B SaaS, 50–500 employees…",
            colSpan: 12,
          },
          {
            name: "salesMotion",
            label: "Sales motion",
            type: "select",
            options: [
              { label: "Inbound", value: "inbound" },
              { label: "Outbound", value: "outbound" },
              { label: "Hybrid", value: "hybrid" },
            ],
            defaultValue: "hybrid",
            colSpan: 6,
          },
          {
            name: "avgDealSize",
            label: "Average deal size (USD)",
            type: "number",
            defaultValue: 12000,
            colSpan: 6,
          },
          {
            name: "crmNotes",
            label: "CRM / stack notes",
            type: "textarea",
            placeholder: "HubSpot stages, Slack alerts, enrichment tools…",
            colSpan: 12,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand accent",
            type: "color",
            defaultValue: "#2563EB",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    icp: "B2B SaaS founders and revenue leaders",
    salesMotion: "hybrid",
    avgDealSize: 12000,
    crmNotes: "Track MQL → SQL → closed-won. Weekly pipeline review.",
    brandPrimaryColor: "#2563EB",
  },
  tokens: {
    color: {
      primary: { $value: "#2563EB", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
      surface: { $value: "#141414", $type: "color" },
    },
  },
  designMd: `# Sales & RevOps

## Voice
- Direct, numbers-first, no fluff
- Every recommendation ties to pipeline stage or unit economics

## Deliverables
- Playbooks and sequences under \`docs/sales/\`
- Pipeline reviews and forecast memos as reports
`,
  suggestedAgents: [
    {
      name: "sales-ross",
      role: "Sales Lead",
      systemPrompt:
        "You are the Sales Lead (Aaron Ross-style). Own pipeline strategy, conversion, and outbound/inbound alignment. End with JSON handoff.",
      skillNames: ["pricing-strategy", "cold-email-sequence-generator", "tenant-email-outbound"],
      artifactTypes: ["report"],
    },
    {
      name: "sdr-outbound",
      role: "SDR / Outbound",
      systemPrompt:
        "You are the SDR. Draft personalized outbound sequences and follow-ups per ICP. End with JSON handoff.",
      skillNames: ["cold-email-sequence-generator", "tenant-email-outbound"],
      artifactTypes: ["copy"],
    },
    {
      name: "revops-analyst",
      role: "RevOps Analyst",
      systemPrompt:
        "You are RevOps. Model funnel metrics, CAC, and forecast accuracy. End with JSON handoff.",
      skillNames: ["financial-unit-economics", "startup-financial-modeling"],
      artifactTypes: ["report"],
    },
    {
      name: "research-thompson",
      role: "Market Intelligence",
      systemPrompt:
        "You are Market Intelligence. Validate ICP, competitors, and buying triggers. End with JSON handoff.",
      skillNames: ["deep-research", "competitive-intelligence-analyst"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["marketing-sprint", "pricing-and-monetization", "product-launch"],
  artifactTypes: ["report", "copy"],
};

export const CUSTOMER_SUCCESS_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Customer Success",
        description: "Onboarding, health, and expansion for existing customers.",
        fields: [
          {
            name: "customerSegment",
            label: "Customer segment",
            type: "text",
            required: true,
            placeholder: "SMB self-serve, mid-market, enterprise…",
            colSpan: 12,
          },
          {
            name: "healthCheckCadence",
            label: "Health review cadence",
            type: "select",
            options: [
              { label: "Weekly", value: "weekly" },
              { label: "Bi-weekly", value: "biweekly" },
              { label: "Monthly", value: "monthly" },
            ],
            defaultValue: "biweekly",
            colSpan: 6,
          },
          {
            name: "expansionGoal",
            label: "Expansion focus",
            type: "select",
            options: [
              { label: "Upsell seats", value: "seats" },
              { label: "Cross-sell modules", value: "modules" },
              { label: "Renewal + NRR", value: "renewal" },
            ],
            defaultValue: "renewal",
            colSpan: 6,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand accent",
            type: "color",
            defaultValue: "#059669",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    customerSegment: "B2B SaaS teams post-sale",
    healthCheckCadence: "biweekly",
    expansionGoal: "renewal",
    brandPrimaryColor: "#059669",
  },
  tokens: {
    color: {
      primary: { $value: "#059669", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# Customer Success

## Voice
- Empathetic, proactive, outcome-oriented
- Flag risk early; celebrate wins with evidence

## Deliverables
- Health scores, QBR decks, and playbooks under \`docs/operations/\`
`,
  suggestedAgents: [
    {
      name: "cs-lead",
      role: "CS Lead",
      systemPrompt:
        "You are the Customer Success Lead. Own health scoring, QBRs, and expansion plays. End with JSON handoff.",
      skillNames: ["user-research-synthesis", "ux-audit-rethink"],
      artifactTypes: ["report"],
    },
    {
      name: "onboarding-specialist",
      role: "Onboarding Specialist",
      systemPrompt:
        "You are the Onboarding Specialist. Design activation paths and lifecycle emails. End with JSON handoff.",
      skillNames: ["email-sequence", "user-persona-creation"],
      artifactTypes: ["copy"],
    },
    {
      name: "retention-analyst",
      role: "Retention Analyst",
      systemPrompt:
        "You are the Retention Analyst. Diagnose churn signals and recommend interventions. End with JSON handoff.",
      skillNames: ["community-led-growth", "deep-analysis"],
      artifactTypes: ["report"],
    },
    {
      name: "operations-pg",
      role: "Growth Operations",
      systemPrompt:
        "You are Growth Operations (PG-style). Run experiments on retention and community. End with JSON handoff.",
      skillNames: ["community-led-growth", "tenant-email-outbound"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["weekly-review", "product-launch"],
  artifactTypes: ["report", "copy"],
};

export const SEO_CONTENT_STUDIO_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "SEO & Content Studio",
        description: "Organic growth through search-first content production.",
        fields: [
          {
            name: "targetKeywords",
            label: "Priority keywords / themes",
            type: "textarea",
            required: true,
            placeholder: "AI automation, RevOps tools, …",
            colSpan: 12,
          },
          {
            name: "contentPillars",
            label: "Content pillars",
            type: "multiselect",
            options: [
              { label: "Blog / long-form", value: "blog" },
              { label: "Landing pages", value: "landing" },
              { label: "LinkedIn", value: "linkedin" },
              { label: "Newsletter", value: "newsletter" },
            ],
            colSpan: 12,
          },
          {
            name: "publishCadence",
            label: "Publish cadence",
            type: "select",
            options: [
              { label: "2× per week", value: "2x-week" },
              { label: "Weekly", value: "weekly" },
              { label: "Bi-weekly", value: "biweekly" },
            ],
            defaultValue: "weekly",
            colSpan: 6,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand accent",
            type: "color",
            defaultValue: "#7C3AED",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    targetKeywords: "B2B SaaS growth, AI workflows, demand generation",
    contentPillars: ["blog", "linkedin"],
    publishCadence: "weekly",
    brandPrimaryColor: "#7C3AED",
  },
  tokens: {
    color: {
      primary: { $value: "#7C3AED", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# SEO & Content Studio

## Voice
- Search-intent aligned, skimmable headers, credible citations
- One primary keyword cluster per asset

## Deliverables
- Briefs and drafts under \`docs/marketing/\`
- SEO audit memos and content calendars as reports
`,
  suggestedAgents: [
    {
      name: "seo-strategist",
      role: "SEO Strategist",
      systemPrompt:
        "You are the SEO Strategist. Keyword maps, technical SEO priorities, and content gaps. End with JSON handoff.",
      skillNames: ["seo-content-strategist", "seo-audit"],
      artifactTypes: ["report"],
    },
    {
      name: "copy-manager",
      role: "Content Writer",
      systemPrompt:
        "You are the Content Writer. Produce SEO-aware drafts aligned with design.md. End with JSON handoff.",
      skillNames: ["content-strategy", "seo-content-strategist"],
      artifactTypes: ["copy"],
    },
    {
      name: "content-editor",
      role: "Content Editor",
      systemPrompt:
        "You are the Content Editor. Refine structure, clarity, and on-page SEO. End with JSON handoff.",
      skillNames: ["deep-reading-analyst", "content-strategy"],
      artifactTypes: ["copy"],
    },
    {
      name: "marketing-godin",
      role: "Content Strategist",
      systemPrompt:
        "You are the Content Strategist (Godin-style). Narrative arcs and distribution hooks. End with JSON handoff.",
      skillNames: ["content-strategy", "seo-audit"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["seo-review", "content-sprint", "campaign-launch"],
  artifactTypes: ["copy", "report", "social_post"],
};

export const FINANCE_PRICING_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Finance & Pricing",
        description: "Unit economics, pricing models, and financial planning.",
        fields: [
          {
            name: "revenueModel",
            label: "Revenue model",
            type: "select",
            options: [
              { label: "Subscription (SaaS)", value: "subscription" },
              { label: "Usage-based", value: "usage" },
              { label: "Hybrid", value: "hybrid" },
              { label: "Services / retainer", value: "services" },
            ],
            defaultValue: "subscription",
            colSpan: 6,
          },
          {
            name: "reportingCadence",
            label: "Reporting cadence",
            type: "select",
            options: [
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
              { label: "Quarterly", value: "quarterly" },
            ],
            defaultValue: "monthly",
            colSpan: 6,
          },
          {
            name: "currency",
            label: "Primary currency",
            type: "text",
            defaultValue: "USD",
            colSpan: 6,
          },
          {
            name: "brandPrimaryColor",
            label: "Brand accent",
            type: "color",
            defaultValue: "#C9A227",
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    revenueModel: "subscription",
    reportingCadence: "monthly",
    currency: "USD",
    brandPrimaryColor: "#C9A227",
  },
  tokens: {
    color: {
      primary: { $value: "#C9A227", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# Finance & Pricing

## Voice
- Conservative assumptions, explicit sensitivities
- Separate facts from forecasts

## Deliverables
- Models and pricing memos under \`docs/cfo/\` and \`docs/sales/\`
`,
  suggestedAgents: [
    {
      name: "cfo-campbell",
      role: "CFO",
      systemPrompt:
        "You are the CFO (Campbell-style). Unit economics, burn, and runway. End with JSON handoff.",
      skillNames: ["financial-unit-economics", "startup-financial-modeling"],
      artifactTypes: ["report"],
    },
    {
      name: "pricing-analyst",
      role: "Pricing Analyst",
      systemPrompt:
        "You are the Pricing Analyst. Packaging, tiers, and willingness-to-pay analysis. End with JSON handoff.",
      skillNames: ["pricing-strategy", "market-sizing-analysis"],
      artifactTypes: ["report"],
    },
    {
      name: "sales-ross",
      role: "Sales Finance Liaison",
      systemPrompt:
        "You are Sales Finance Liaison. Connect pricing to pipeline and discount policy. End with JSON handoff.",
      skillNames: ["pricing-strategy", "startup-business-models"],
      artifactTypes: ["report"],
    },
    {
      name: "research-thompson",
      role: "Market Research",
      systemPrompt:
        "You are Market Research. Size markets and benchmark competitor pricing. End with JSON handoff.",
      skillNames: ["market-sizing-analysis", "deep-research"],
      artifactTypes: ["report"],
    },
  ],
  suggestedWorkflows: ["pricing-and-monetization", "opportunity-discovery", "weekly-review"],
  artifactTypes: ["report"],
};

export const CUSTOMER_SUPPORT_TEMPLATE: BusinessTemplateDefinition = {
  configSchema: {
    sections: [
      {
        title: "Support desk",
        description: "Product-scoped customer support with RAG knowledge base.",
        fields: [
          {
            name: "supportEmail",
            label: "Support inbox",
            type: "email",
            placeholder: "support@yourproduct.com",
            colSpan: 12,
          },
          {
            name: "ragMcpSlug",
            label: "RAG MCP server slug",
            type: "text",
            placeholder: "support-rag",
            helpText: "Tenant MCP server with product KB namespace.",
            colSpan: 12,
          },
          {
            name: "slaHours",
            label: "First response SLA (hours)",
            type: "number",
            defaultValue: 24,
            colSpan: 6,
          },
        ],
      },
    ],
  },
  configDefaults: {
    supportEmail: "",
    ragMcpSlug: "support-rag",
    slaHours: 24,
  },
  tokens: {
    color: {
      primary: { $value: "#3B82F6", $type: "color" },
      background: { $value: "#0A0A0A", $type: "color" },
    },
  },
  designMd: `# Customer Support

## Voice
- Empathetic, precise, no blame
- Confirm issue, state next step, set expectation

## Deliverables
- Triage notes and reply drafts under \`docs/support/\`
`,
  suggestedAgents: [
    {
      name: "support-lead",
      role: "Support Lead",
      systemPrompt:
        "You are Support Lead. Triage tickets, query the product RAG MCP for answers, draft replies. End with JSON handoff.",
      skillNames: ["senior-qa"],
      artifactTypes: ["report", "copy"],
    },
    {
      name: "kb-curator",
      role: "Knowledge Curator",
      systemPrompt:
        "You maintain the product support KB. Summarize gaps and propose FAQ entries. End with JSON handoff.",
      skillNames: ["deep-reading-analyst"],
      artifactTypes: ["report"],
    },
    {
      name: "escalation-coordinator",
      role: "Escalation Coordinator",
      systemPrompt:
        "You route complex support cases to engineering or product. Summarize impact and reproduction steps. End with JSON handoff.",
      skillNames: ["deep-analysis"],
      artifactTypes: ["report", "spec"],
    },
  ],
  suggestedWorkflows: ["weekly-review", "feature-development"],
  artifactTypes: ["report", "copy"],
};

export const PLATFORM_BUSINESS_TEMPLATES = [
  {
    slug: "marketing-agency",
    name: "Digital Marketing Agency",
    description:
      "Copy, community, design, and strategy roles for client/campaign work items.",
    orgUnitType: "marketing_agency" as const,
    definition: MARKETING_AGENCY_TEMPLATE,
  },
  {
    slug: "product-studio",
    name: "Product Studio (default)",
    description: "Maps to existing Virtual Company OS product-building flow.",
    orgUnitType: "product_studio" as const,
    definition: PRODUCT_STUDIO_TEMPLATE,
  },
  {
    slug: "sales-revops",
    name: "Sales & RevOps",
    description: "Pipeline, outbound sequences, RevOps metrics, and market intel.",
    orgUnitType: "department" as const,
    definition: SALES_REVOPS_TEMPLATE,
  },
  {
    slug: "customer-success",
    name: "Customer Success",
    description: "Onboarding, health reviews, retention plays, and expansion.",
    orgUnitType: "department" as const,
    definition: CUSTOMER_SUCCESS_TEMPLATE,
  },
  {
    slug: "seo-content-studio",
    name: "SEO & Content Studio",
    description: "Search-first content: SEO audits, briefs, drafts, and calendars.",
    orgUnitType: "marketing_agency" as const,
    definition: SEO_CONTENT_STUDIO_TEMPLATE,
  },
  {
    slug: "finance-pricing",
    name: "Finance & Pricing",
    description: "Unit economics, pricing tiers, and financial planning memos.",
    orgUnitType: "department" as const,
    definition: FINANCE_PRICING_TEMPLATE,
  },
  {
    slug: "customer-support",
    name: "Customer Support",
    description: "Ticket triage, RAG-backed replies, and knowledge base curation.",
    orgUnitType: "department" as const,
    definition: CUSTOMER_SUPPORT_TEMPLATE,
  },
  {
    slug: "custom-department",
    name: "Custom Department",
    description: "Flexible department with coordinator + specialist agents.",
    orgUnitType: "custom" as const,
    definition: CUSTOM_DEPARTMENT_TEMPLATE,
  },
];
