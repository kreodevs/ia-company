export const runs = {
  list: {
    loading: "Loading runs…",
    title: "Execution Runs",
    columns: {
      workflow: "Workflow",
      status: "Status",
      tokens: "Tokens",
      cost: "Cost",
      started: "Started",
    },
    noStartTime: "—",
  },
  detail: {
    loading: "Loading run…",
    defaultTitle: "Execution Run",
    statusLine: "Status: {{status}} · {{tokens}} tokens · ${{cost}}",
    cancelRun: "Cancel run",
    sharedMemory: "Shared Memory",
    liveLog: "Live Log",
    stepStart: "Starting {{agentName}}",
    stepComplete: "Done {{agentName}} ({{tokensUsed}} tokens)",
    done: "Finished — {{status}}",
  },
} as const;
