export const settings = {
  loading: "Loading settings…",
  title: "Tenant Settings",
  llm: {
    title: "LLM configuration",
    defaultModel: "Default model",
    apiKeyKeepCurrent: "Leave empty to keep current",
    maxCostPerRun: "Max cost per run (USD)",
    save: "Save LLM settings",
  },
  usage: {
    title: "Monthly usage",
    summary: "{{runs}} runs · {{tokens}} tokens · ${{cost}} since {{date}}",
  },
  limits: {
    title: "Monthly limits",
    maxRuns: "Max runs / month",
    maxCost: "Max cost / month (USD)",
    maxTokens: "Max tokens / month",
    save: "Save usage limits",
  },
  notifications: {
    title: "Notifications",
    subtitle: "Webhook, Slack, or email (via Resend) when workflows complete or fail.",
    webhookUrl: "Webhook URL",
    slackWebhookUrl: "Slack webhook URL",
    emailRecipients: "Email recipients (comma-separated)",
    onComplete: "On complete",
    onFail: "On fail",
    save: "Save notifications",
  },
  metaSchedule: {
    title: "Autonomous company (meta schedule)",
    subtitle:
      "The meta schedule dynamically picks discovery, evaluation, build, or growth workflows based on company phase and product portfolio. Fixed workflow schedules below are optional.",
    orchestratorEvery: "Meta orchestrator · every {{seconds}}s · {{status}}",
    enable: "Enable meta schedule",
  },
  fixedSchedules: {
    title: "Fixed workflow schedules",
    subtitle: "Run a specific workflow on an interval using consensus memory as initial context.",
    namePlaceholder: "Schedule name",
    empty: "No schedules yet.",
    deleteConfirm: "Delete this schedule?",
    nextRun: " · next {{date}}",
    every: "Every {{seconds}}s · {{status}}",
  },
} as const;
