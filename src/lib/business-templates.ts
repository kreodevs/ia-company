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
      systemPrompt:
        "You are the Design Lead. Produce design briefs and UI/copy layout guidance using org tokens. End with JSON handoff.",
      skillNames: ["frontend-design", "ui-ux-pro-max"],
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
    slug: "custom-department",
    name: "Custom Department",
    description: "Flexible department with coordinator + specialist agents.",
    orgUnitType: "custom" as const,
    definition: CUSTOM_DEPARTMENT_TEMPLATE,
  },
];
