export const warRoom = {
  loading: "Loading the war room…",
  title: "War room — {{name}}",
  subtitle:
    "Watch your team work. Each agent has a desk; their status reflects what they are doing for this product right now.",
  activeRun: "Live: {{workflow}}",
  allIdle: "No agent is working on this product right now.",
  runningNow: "Running now",
  startedAt: "Started {{date}}",
  workingNow: "On duty ({{count}})",
  recentRuns: "Recent runs",
  viewCode: "View code →",
  doing: "Doing",
  noRecentActivity: "Waiting for the next cycle…",
  lastWorked: "Last worked",
  status: {
    idle: "idle",
    queued: "queued",
    thinking: "thinking",
  },
} as const;
