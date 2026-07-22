export const warRoom = {
  loading: "Cargando war room…",
  title: "War room — {{name}}",
  subtitle:
    "Mira a tu equipo trabajar. Cada agente tiene un escritorio; su estado refleja lo que está haciendo para este producto ahora mismo.",
  activeRun: "En vivo: {{workflow}}",
  allIdle: "Ningún agente trabaja en este producto ahora mismo.",
  runningNow: "Corriendo ahora",
  startedAt: "Iniciado {{date}}",
  workingNow: "De turno ({{count}})",
  recentRuns: "Runs recientes",
  viewCode: "Ver código →",
  doing: "Haciendo",
  noRecentActivity: "Esperando el próximo ciclo…",
  lastWorked: "Última actividad",
  status: {
    idle: "libre",
    queued: "en cola",
    thinking: "pensando",
  },
} as const;
