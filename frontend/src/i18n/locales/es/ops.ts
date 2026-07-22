export const ops = {
  loading: "Cargando operaciones…",
  loadFailed: "No se pudo cargar el panel.",
  title: "Operaciones",
  subtitle: "Estado de la empresa autónoma y cola de ideas.",
  runMetaCycleNow: "Ejecutar ciclo meta",
  status: {
    cycle: "Ciclo #{{number}}",
    nextWorkflow: "Próximo paso:",
  },
  metaCycle: {
    title: "¿Qué hace el ciclo meta?",
    description:
      "El orquestador elige el workflow según la fase, ejecuta a tus agentes y actualiza el consenso. No tienes que elegir el workflow manualmente.",
    step1: "Lee fase, productos e ideas",
    step2: "Elige discovery, evaluación, build o launch",
    step3: "Encola la ejecución — sigue el progreso en Ejecuciones",
    enableSchedule: "Activar programación automática",
  },
  portfolio: {
    title: "Productos activos",
    focus: "Enfocar",
  },
  pipeline: {
    title: "Ideas para evaluar",
    count: "{{count}} pendientes",
    go: "GO",
    noGo: "NO-GO",
    emptyTitle: "Aún no hay ideas en el pipeline",
    emptyHint:
      "Tras un discovery completado, las ideas aparecen aquí. Si acabas de ejecutar uno, recarga esta página o abre la ejecución para ver el output de los agentes.",
    viewLastDiscovery: "Ver último discovery completado",
  },
  recentRuns: {
    title: "Últimas ejecuciones",
    defaultWorkflow: "Workflow",
    viewAll: "Ver todas",
  },
} as const;
