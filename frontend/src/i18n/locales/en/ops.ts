export const ops = {
  loading: "Loading operations…",
  loadFailed: "Unable to load the dashboard.",
  title: "Operations",
  subtitle: "Autonomous company status and idea queue.",
  runMetaCycleNow: "Run meta cycle",
  status: {
    cycle: "Cycle #{{number}}",
    nextWorkflow: "Next step:",
  },
  metaCycle: {
    title: "What does the meta cycle do?",
    description:
      "The orchestrator picks a workflow from company phase, runs your agents, and updates consensus. You do not pick the workflow manually.",
    step1: "Read phase, products, and ideas",
    step2: "Pick discovery, evaluation, build, or launch",
    step3: "Enqueue the run — track progress under Runs",
    enableSchedule: "Enable automatic schedule",
  },
  portfolio: {
    title: "Active products",
    focus: "Focus",
  },
  pipeline: {
    title: "Ideas to evaluate",
    count: "{{count}} pending",
    go: "GO",
    noGo: "NO-GO",
    emptyTitle: "No pipeline ideas yet",
    emptyHint:
      "After a completed discovery run, ideas show up here. If you just ran one, refresh this page or open the run to read agent output.",
    viewLastDiscovery: "View last completed discovery",
  },
  recentRuns: {
    title: "Recent runs",
    defaultWorkflow: "Workflow",
    viewAll: "View all",
  },
} as const;
