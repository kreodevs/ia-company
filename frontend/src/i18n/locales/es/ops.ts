export const ops = {
  loading: "Cargando panel de operaciones…",
  loadFailed: "No se pudo cargar el portfolio.",
  title: "Operaciones",
  subtitle:
    "Portfolio multi-producto — el meta-orchestrator elige el workflow en cada ciclo.",
  runMetaCycleNow: "Ejecutar ciclo meta ahora",
  consensusLink: "Consensus",
  schedulesLink: "Programaciones",
  metaCycle: {
    title: "¿Qué es el ciclo meta?",
    description:
      "Un ciclo autónomo: el orquestador revisa la fase de la empresa, el portfolio y el consenso, elige el workflow más adecuado y lo ejecuta con tus agentes. No tienes que elegir manualmente qué workflow correr.",
    step1: "Analiza fase, productos e ideas del pipeline",
    step2: "Elige el workflow (discovery, evaluación, build, launch…)",
    step3: "Encola una ejecución — sigue el progreso en Ejecuciones",
    willRun: "Si lo ejecutas ahora, arrancará el workflow «{{workflow}}».",
    started: "Ejecución iniciada: {{workflow}}. Redirigiendo al detalle…",
    viewRun: "Ver ejecución",
    noSchedule: "Activa el meta schedule en Configuración para ciclos automáticos periódicos.",
    enableSchedule: "Configurar programación",
    failedRunsHint:
      "Las ejecuciones recientes fallaron. Abre una para ver el error en los logs (suele ser LLM o worker).",
  },
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
