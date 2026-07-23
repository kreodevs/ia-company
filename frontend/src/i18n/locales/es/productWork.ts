export const productWork = {
  title: "Asignar trabajo al producto",
  subtitle: "Ejecuta workflows o agentes sobre {{name}} con contexto del workspace y memoria del producto.",
  loading: "Cargando opciones…",
  loadFailed: "No se pudieron cargar las opciones de lanzamiento.",
  launch: "Lanzar",
  assignAgent: "Asignar agente",
  agentCount: "{{count}} agentes",
  stepCount: "{{count}} pasos",
  taskLabel: "Tarea (opcional)",
  taskPlaceholder: "Ej.: auditoría SEO de la landing, plan de contenido 90 días…",
  taskHint: "Si lo dejas vacío, los agentes usan la Next Action de la memoria del producto.",
  noWorkflows: "No hay workflows personalizados. Usa presets o crea uno en Workflows.",
  tabs: {
    presets: "Presets",
    workflows: "Workflows",
    agents: "Agentes",
  },
  categories: {
    marketing: "Marketing",
    launch: "Lanzamiento",
    build: "Desarrollo",
    business: "Negocio",
    ops: "Operaciones",
  },
  presets: {
    "seo-review": {
      label: "SEO Review",
      description: "Auditoría SEO, keywords, meta tags y plan de contenido (marketing-godin).",
    },
    "marketing-sprint": {
      label: "Marketing Sprint",
      description: "Campaña, funnel y outreach: marketing → ventas → growth.",
    },
    "product-launch": {
      label: "Product Launch",
      description: "QA → DevOps → Marketing → Sales → Ops → CEO.",
    },
    "feature-development": {
      label: "Feature Development",
      description: "UX → UI → Fullstack → QA → DevOps.",
    },
    "pricing-and-monetization": {
      label: "Pricing & Monetization",
      description: "Research → CFO → Sales → Munger → CEO.",
    },
    "weekly-review": {
      label: "Weekly Review",
      description: "Ops → Sales → CFO → QA → CEO.",
    },
  },
} as const;
