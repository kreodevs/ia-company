import { DepartmentWorkStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  manualStepsWithAutoStatus,
  PAPERCLIP_MANUAL_QA_STEPS,
  type ManualQaStep,
} from "./platform-qa-checklist.js";

/** Migraciones críticas reingeniería 2 — deben estar en `_prisma_migrations`. */
export const PAPERCLIP_REQUIRED_MIGRATIONS = [
  "20261003000000_department_work_handoffs",
  "20261003090000_document_reviews",
  "20261004000000_company_goals_initiatives",
  "20261004120000_org_unit_hierarchy",
  "20261004180000_execution_run_strategic_link",
] as const;

export type QaCheckStatus = "pass" | "fail" | "warn" | "skip";

export interface QaCheckResult {
  id: string;
  category: "platform" | "tenant" | "office";
  name: string;
  status: QaCheckStatus;
  message: string;
  durationMs: number;
}

async function runCheck(
  id: string,
  category: QaCheckResult["category"],
  name: string,
  fn: () => Promise<{ status: QaCheckStatus; message: string }>,
): Promise<QaCheckResult> {
  const start = Date.now();
  try {
    const { status, message } = await fn();
    return { id, category, name, status, message, durationMs: Date.now() - start };
  } catch (err) {
    return {
      id,
      category,
      name,
      status: "fail",
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export type ManualQaStepWithAuto = ManualQaStep & {
  autoStatus: "pass" | "fail" | "warn" | "skip" | "manual";
};

export interface PlatformQaReport {
  ranAt: string;
  tenantId: string | null;
  tenantName: string | null;
  checks: QaCheckResult[];
  summary: { pass: number; fail: number; warn: number; skip: number };
  manualChecklist: ManualQaStepWithAuto[];
}

export async function runPlatformQa(tenantId?: string | null): Promise<PlatformQaReport> {
  const checks: QaCheckResult[] = [];
  let tenantName: string | null = null;

  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });
    if (!tenant) {
      return {
        ranAt: new Date().toISOString(),
        tenantId,
        tenantName: null,
        checks: [
          {
            id: "tenant_exists",
            category: "tenant",
            name: "Tenant válido",
            status: "fail",
            message: "Tenant no encontrado",
            durationMs: 0,
          },
        ],
        summary: { pass: 0, fail: 1, warn: 0, skip: 0 },
        manualChecklist: manualStepsWithAutoStatus(PAPERCLIP_MANUAL_QA_STEPS, [
          { id: "tenant_exists", status: "fail" },
        ]),
      };
    }
    tenantName = tenant.name;
  }

  checks.push(
    await runCheck("db_ping", "platform", "Conexión PostgreSQL", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "pass", message: "OK" };
    }),
  );

  checks.push(
    await runCheck("migrations_paperclip", "platform", "Migraciones reingeniería 2", async () => {
      const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
      `;
      const applied = new Set(rows.map((r) => r.migration_name));
      const missing = PAPERCLIP_REQUIRED_MIGRATIONS.filter((m) => !applied.has(m));
      if (missing.length) {
        return {
          status: "fail",
          message: `Faltan: ${missing.join(", ")}. Ejecuta prisma migrate deploy en el contenedor API.`,
        };
      }
      return { status: "pass", message: `${PAPERCLIP_REQUIRED_MIGRATIONS.length} migraciones aplicadas` };
    }),
  );

  if (!tenantId) {
    checks.push({
      id: "tenant_scope",
      category: "tenant",
      name: "Checks de tenant",
      status: "skip",
      message: "Impersona un tenant y vuelve a ejecutar QA.",
      durationMs: 0,
    });
  } else {
    const tid = tenantId;

    checks.push(
      await runCheck("table_company_goals", "tenant", "Tabla objetivos", async () => {
        const n = await prisma.companyGoal.count({ where: { tenantId: tid } });
        return { status: "pass", message: `${n} objetivo(s)` };
      }),
    );

    checks.push(
      await runCheck("table_initiatives", "tenant", "Tabla iniciativas", async () => {
        const n = await prisma.initiative.count({ where: { tenantId: tid } });
        return { status: "pass", message: `${n} iniciativa(s)` };
      }),
    );

    checks.push(
      await runCheck("table_department_work", "tenant", "Trabajo departamental", async () => {
        const n = await prisma.departmentWorkItem.count({ where: { tenantId: tid } });
        return { status: "pass", message: `${n} ítem(s)` };
      }),
    );

    checks.push(
      await runCheck("table_handoffs", "tenant", "Handoffs", async () => {
        const n = await prisma.departmentHandoff.count({ where: { tenantId: tid } });
        return { status: "pass", message: `${n} handoff(s)` };
      }),
    );

    checks.push(
      await runCheck("table_document_reviews", "tenant", "Revisiones de documento", async () => {
        const n = await prisma.documentReview.count({ where: { tenantId: tid } });
        return { status: "pass", message: `${n} revisión(es)` };
      }),
    );

    checks.push(
      await runCheck("office_organigram_full", "office", "Organigrama (árbol + virtuales)", async () => {
        const {
          getOrganigram,
          wrapOrganigramWithExecutive,
          appendMissingVirtualDepartmentNodes,
        } = await import("./organigram.js");
        const tree = appendMissingVirtualDepartmentNodes(wrapOrganigramWithExecutive(await getOrganigram(tid)));
        const virtual = tree[0]?.children?.filter((n) => n.type === "virtual").length ?? 0;
        return {
          status: tree.length ? "pass" : "warn",
          message: `${tree.length} raíz(es) · ${virtual} virtual(es) bajo CEO`,
        };
      }),
    );

    checks.push(
      await runCheck("office_collaboration_map", "office", "Mapa colaboración", async () => {
        const { getCollaborationMap } = await import("./collaboration-map.js");
        const map = await getCollaborationMap(tid);
        return {
          status: "pass",
          message: `${map.edges.length} arista(s) de handoff`,
        };
      }),
    );

    checks.push(
      await runCheck("office_objectives_summary", "office", "Resumen objetivos", async () => {
        const { getObjectivesSummary } = await import("./objectives.js");
        const rows = await getObjectivesSummary(tid);
        return {
          status: rows.length ? "pass" : "warn",
          message: rows.length ? `${rows.length} objetivo(s) en resumen` : "Sin objetivos — crea uno en UI",
        };
      }),
    );

    checks.push(
      await runCheck("office_dashboard_period", "office", "Dashboard con periodo", async () => {
        const { getOfficeDashboard } = await import("./office-coordinator.js");
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const [all, month] = await Promise.all([
          getOfficeDashboard(tid, {}),
          getOfficeDashboard(tid, { since }),
        ]);
        return {
          status: "pass",
          message: `Coste todo $${all.management.totalCostUsd.toFixed(2)} · 30d $${month.management.totalCostUsd.toFixed(2)}`,
        };
      }),
    );

    checks.push(
      await runCheck("office_schedules", "office", "Operaciones programadas", async () => {
        const n = await prisma.autonomousSchedule.count({ where: { tenantId: tid } });
        return {
          status: n > 0 ? "pass" : "warn",
          message: n > 0 ? `${n} schedule(s)` : "Sin rutinas — configurar en Orquestación",
        };
      }),
    );

    checks.push(
      await runCheck("office_search_intents", "office", "Búsqueda (intenciones)", async () => {
        const { searchOffice } = await import("./office-global-search.js");
        const [base, blocked] = await Promise.all([
          searchOffice(tid, "en", 5),
          searchOffice(tid, "bloqueados ingeniería", 5),
        ]);
        return {
          status: "pass",
          message: `General ${base.length} · bloqueados ${blocked.length}`,
        };
      }),
    );

    checks.push(
      await runCheck("corte2_data_smoke", "office", "Datos Corte 2 (handoffs/revisiones)", async () => {
        const [handoffs, reviews, blocked] = await Promise.all([
          prisma.departmentHandoff.count({ where: { tenantId: tid } }),
          prisma.documentReview.count({ where: { tenantId: tid } }),
          prisma.departmentWorkItem.count({
            where: { tenantId: tid, status: DepartmentWorkStatus.blocked },
          }),
        ]);
        const hasFlow = handoffs > 0 || reviews > 0;
        return {
          status: hasFlow ? "pass" : "warn",
          message: hasFlow
            ? `${handoffs} handoff(s), ${reviews} revisión(es), ${blocked} bloqueo(s)`
            : "Sin handoffs/revisiones aún — recorrer flujo manual 3 deptos",
        };
      }),
    );

    checks.push(
      await runCheck("office_dashboard", "office", "Dashboard de gestión", async () => {
        const { getOfficeDashboard } = await import("./office-coordinator.js");
        const dash = await getOfficeDashboard(tid, {});
        const m = dash.management;
        return {
          status: "pass",
          message: `Activos ${m.activeRuns}, bloqueados ${m.blockedWorkItems}`,
        };
      }),
    );

    checks.push(
      await runCheck("office_inbox", "office", "Inbox empresarial", async () => {
        const { getOfficeInbox } = await import("./office-inbox.js");
        const items = await getOfficeInbox(tid, { limit: 20 });
        return { status: "pass", message: `${items.length} ítem(s) en bandeja` };
      }),
    );

    checks.push(
      await runCheck("office_search", "office", "Búsqueda global", async () => {
        const { searchOffice } = await import("./office-global-search.js");
        const items = await searchOffice(tid, "en", 5);
        return { status: "pass", message: `Motor OK (${items.length} resultados de prueba)` };
      }),
    );

    checks.push(
      await runCheck("office_costs", "office", "Informe de costes", async () => {
        const { getOfficeCostReport } = await import("./office-costs.js");
        const report = await getOfficeCostReport(tid, {});
        return {
          status: "pass",
          message: `$${report.totalCostUsd.toFixed(2)} · alerta ${report.budgetAlert ?? "ninguna"}`,
        };
      }),
    );

    checks.push(
      await runCheck("strategic_link_column", "office", "Vínculo estratégico en runs", async () => {
        const linked = await prisma.executionRun.count({
          where: { tenantId: tid, companyGoalId: { not: null } },
        });
        return {
          status: linked > 0 ? "pass" : "warn",
          message: linked > 0 ? `${linked} encargo(s) vinculados` : "Sin encargos con objetivo aún",
        };
      }),
    );
  }

  const summary = { pass: 0, fail: 0, warn: 0, skip: 0 };
  for (const c of checks) summary[c.status] += 1;

  return {
    ranAt: new Date().toISOString(),
    tenantId: tenantId ?? null,
    tenantName,
    checks,
    summary,
    manualChecklist: manualStepsWithAutoStatus(PAPERCLIP_MANUAL_QA_STEPS, checks),
  };
}

/** Solo checklist (sin ejecutar queries pesadas). */
export function getPlatformQaChecklist(): ManualQaStep[] {
  return PAPERCLIP_MANUAL_QA_STEPS;
}
