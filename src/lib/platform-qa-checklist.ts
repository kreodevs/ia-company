/**
 * Checklist manual paperclip-reingeniería 2 — pasos UI en prod.
 * Los `autoCheckId` se validan en `runPlatformQa` cuando hay tenant impersonado.
 */
export interface ManualQaStep {
  id: string;
  phase: string;
  title: string;
  detail: string;
  href: string | null;
  autoCheckId?: string;
}

export const PAPERCLIP_MANUAL_QA_STEPS: ManualQaStep[] = [
  {
    id: "prod-migrate",
    phase: "Plataforma",
    title: "Migraciones aplicadas en contenedor API",
    detail: "Tras deploy, el contenedor ejecuta `prisma migrate deploy`. Fallos → revisar logs del entrypoint.",
    href: null,
    autoCheckId: "migrations_paperclip",
  },
  {
    id: "f-objectives-crud",
    phase: "F",
    title: "Objetivo e iniciativa",
    detail: "Crea objetivo + iniciativa; lanza encargo con vínculo desde coordinador (StrategicContextFields).",
    href: "/office/objetivos",
    autoCheckId: "table_company_goals",
  },
  {
    id: "f-dashboard-objectives",
    phase: "F/H",
    title: "Dashboard — objetivos estratégicos",
    detail: "Panel de objetivos y KPIs de entregas/handoffs/docs visibles.",
    href: "/office/dashboard",
    autoCheckId: "office_dashboard",
  },
  {
    id: "f-goal-detail",
    phase: "F",
    title: "Detalle de objetivo",
    detail: "Rollups, iniciativas y encargos filtrables.",
    href: "/office/objetivos",
    autoCheckId: "office_objectives_summary",
  },
  {
    id: "f-strategic-banner",
    phase: "F",
    title: "Banner estratégico en encargo",
    detail: "Detalle encargo / war room muestran contexto objetivo-iniciativa.",
    href: "/office/trabajo",
    autoCheckId: "strategic_link_column",
  },
  {
    id: "e-organigram",
    phase: "E",
    title: "Organigrama",
    detail: "Tarjetas con bloqueados, handoffs y salas; deptos virtuales si faltan OrgUnits.",
    href: "/office/organigrama",
    autoCheckId: "office_organigram_full",
  },
  {
    id: "e-collaboration",
    phase: "E",
    title: "Mapa de colaboración",
    detail: "Grafo/lista de handoffs entre departamentos.",
    href: "/office/organigrama",
    autoCheckId: "office_collaboration_map",
  },
  {
    id: "h-period",
    phase: "H",
    title: "Dashboard — periodo 30d / todo",
    detail: "Cambiar periodo altera coste y tabla departamental.",
    href: "/office/dashboard",
    autoCheckId: "office_dashboard_period",
  },
  {
    id: "h-drilldown",
    phase: "H",
    title: "Enlaces a trabajo / inbox",
    detail: "Desde KPIs o tabla, abrir encargos bloqueados o bandeja.",
    href: "/office/inbox",
    autoCheckId: "office_inbox",
  },
  {
    id: "i-operations",
    phase: "I",
    title: "Operaciones recurrentes",
    detail: "Sala de departamento → operaciones, historial y pausa de rutina.",
    href: "/office/departments/engineering",
    autoCheckId: "office_schedules",
  },
  {
    id: "j-costs",
    phase: "J",
    title: "Coste empresarial",
    detail: "Filtros, proyección y alertas de presupuesto.",
    href: "/office/dashboard",
    autoCheckId: "office_costs",
  },
  {
    id: "j-search",
    phase: "J",
    title: "Búsqueda global ⌘K",
    detail: "Buscar encargo/objetivo/depto; probar «bloqueados ingeniería» y «aprobación».",
    href: "/office",
    autoCheckId: "office_search_intents",
  },
  {
    id: "c2-handoff-flow",
    phase: "Corte 2",
    title: "Handoff + revisión documento",
    detail: "Flujo Estrategia → Producto → Ingeniería: handoff, decisión, revisión doc (smoke datos).",
    href: "/office/inbox",
    autoCheckId: "corte2_data_smoke",
  },
];

export function manualStepsWithAutoStatus(
  steps: ManualQaStep[],
  checks: Array<{ id: string; status: string }>,
): Array<ManualQaStep & { autoStatus: "pass" | "fail" | "warn" | "skip" | "manual" }> {
  const byId = new Map(checks.map((c) => [c.id, c.status]));
  return steps.map((step) => {
    if (!step.autoCheckId) {
      return { ...step, autoStatus: "manual" as const };
    }
    const st = byId.get(step.autoCheckId);
    if (!st) return { ...step, autoStatus: "manual" as const };
    if (st === "pass" || st === "fail" || st === "warn" || st === "skip") {
      return { ...step, autoStatus: st };
    }
    return { ...step, autoStatus: "manual" as const };
  });
}
