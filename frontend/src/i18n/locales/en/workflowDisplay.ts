export const workflowDisplay = {
  stepFallback: "Step",
  steps_one: "{{count}} step",
  steps_other: "{{count}} steps",
  connections_one: "{{count}} connection",
  connections_other: "{{count}} connections",
  moreSteps: "+{{count}} more",
  pipelineAriaLabel: "Agent pipeline",
  titles: {
    "opportunity-discovery": "Opportunity Discovery",
    "new-product-evaluation": "New Product Evaluation",
    "feature-development": "Feature Development",
    "product-launch": "Product Launch",
    "pricing-and-monetization": "Pricing and Monetization",
  },
  descriptions: {
    "opportunity-discovery": "Brainstorm ideas → pipeline",
    "new-product-evaluation": "Evaluate idea → GO / NO-GO",
    "feature-development": "Implement in projects/{slug}/",
    "product-launch": "Launch and growth",
    "pricing-and-monetization": "Pricing and monetization",
  },
} as const;
