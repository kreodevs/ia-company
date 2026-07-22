export const runs = {
  list: {
    loading: "Cargando ejecuciones…",
    title: "Ejecuciones",
    columns: {
      workflow: "Workflow",
      status: "Estado",
      tokens: "Tokens",
      cost: "Coste",
      started: "Inicio",
    },
    noStartTime: "—",
  },
  detail: {
    loading: "Cargando ejecución…",
    defaultTitle: "Ejecución",
    statusLine: "Estado: {{status}} · {{tokens}} tokens · ${{cost}}",
    cancelRun: "Cancelar ejecución",
    sharedMemory: "Memoria compartida",
    liveLog: "Log en vivo",
    stepStart: "Iniciando {{agentName}}",
    stepComplete: "Completado {{agentName}} ({{tokensUsed}} tokens)",
    done: "Finalizado — {{status}}",
  },
} as const;
