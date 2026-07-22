export const ops = {
  loading: "Cargando panel de operaciones…",
  loadFailed: "No se pudo cargar el portfolio.",
  title: "Operaciones",
  subtitle:
    "Portfolio multi-producto — el meta-orchestrator elige el workflow en cada ciclo.",
  runMetaCycleNow: "Ejecutar ciclo meta ahora",
  consensusLink: "Consensus",
  schedulesLink: "Programaciones",
  stats: {
    companyPhase: "Fase de la empresa",
    cycleHint: "Ciclo #{{number}}",
    productsBuilding: "Productos en construcción",
    growingHint: "{{count}} en crecimiento",
    pipelineIdeas: "Ideas en pipeline",
    revenueTracked: "Ingresos registrados",
  },
  nextAction: {
    title: "Próxima acción autónoma",
    workflow: "Workflow:",
    product: "Producto:",
    focusProduct: "Producto focal: {{name}} ({{slug}})",
  },
  portfolio: {
    title: "Portfolio de productos",
    revenue: " · ${{amount}} ingresos",
    focus: "Enfocar",
    empty: "Aún no hay productos — ejecuta discovery para poblar el pipeline.",
  },
  pipeline: {
    title: "Cola del pipeline",
    go: "GO",
    noGo: "NO-GO",
    empty: "Pipeline vacío — los ciclos de discovery añaden ideas aquí.",
  },
  recentRuns: {
    title: "Ejecuciones recientes",
    defaultWorkflow: "Workflow",
    empty: "Aún no hay ejecuciones.",
  },
} as const;
