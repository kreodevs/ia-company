export const consensus = {
  loading: "Loading consensus…",
  title: "Company Memory",
  subtitle:
    "Cross-product baton: company phase, pipeline, total revenue. Per-product memory lives under each product's own page.",
  viewOpsDashboard: "View ops dashboard →",
  nextAction: "Next Action",
  nextActionPlaceholder: "What should the next cycle focus on?",
  document: "Document",
  saveConsensus: "Save consensus",
  lastUpdated: "Last updated {{date}}",
  noChangesToSave: "No changes to save.",
  companyHelp:
    "Company-level memory: phase, pipeline, and next action. Per-product detail lives in each product's own memory page.",
  backToCompany: "← Company memory",
  productMemoryHeading: "Per-product memory",
  productTab: "Document",
  productTitle: "Product memory: {{name}}",
  productSubtitle:
    "Per-product consensus: one revision per agent handoff. Use the JSON block in your output to record decisions, open questions, and vetoes.",
  productHelp:
    "This is the product-scoped memory. Manual edits replace the document; per-step agent handoffs are recorded in the Revisions tab.",
  revisionsTitle: "Revisions",
  noRevisions: "No revisions yet. The first cycle run will create one.",
  noRevisionsTitle: "No revisions yet",
  veto: "VETO",
  openQuestions: "Open questions:",
  viewRawContent: "View raw revision content",
  cycleNumber: "Cycle {{n}}",
  viewCode: "View code →",
  scope: {
    label: "Show memory for",
    helper:
      "Pick a scope to inspect. Picking a product or opportunity jumps to that product's memory.",
    company: "Company (cross-product)",
    product: "{{name}} ({{slug}})",
    ideaOnly: "Opportunity — {{title}}",
    ideaWithProduct: "Opportunity — {{title}} → {{product}}",
  },
} as const;
