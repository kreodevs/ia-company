import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Inbox } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  getDashboard,
  getDashboardLegacy,
  type OfficeDashboard,
  type OfficeDepartmentRoom,
} from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import KpiCard from "../ui/KpiCard";
import Panel from "../ui/Panel";
import StatusPill from "../ui/StatusPill";
import EmptyState from "../ui/EmptyState";
import { DataTable, type DataTableColumn } from "../organisms/DataTable";

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    value,
  );
}

/**
 * Fase H — dashboard empresarial (Kreo KPI + DataTable + Panel).
 * Contrato principal: `GET /office/dashboard`; métricas de gestión vía `/office/dashboard/legacy`.
 */
export function Dashboard() {
  const [dash, setDash] = useState<OfficeDashboard | null>(null);
  const [legacy, setLegacy] = useState<Awaited<ReturnType<typeof getDashboardLegacy>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboard(), getDashboardLegacy()])
      .then(([d, l]) => {
        setDash(d);
        setLegacy(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error loading dashboard"));
  }, []);

  const departmentRows = useMemo(() => {
    if (!dash?.departments) return [];
    return dash.departments.map((dept: OfficeDepartmentRoom) => ({
      id: dept.id,
      name: dept.name ?? dept.slug,
      slug: dept.slug,
      status: dept.status,
      agents: dept.agentNames?.length ?? 0,
      accent: dept.accent,
    }));
  }, [dash]);

  const departmentColumns: DataTableColumn[] = useMemo(
    () => [
      {
        field: "name",
        header: "Departamento",
        sortable: true,
        body: (row) => (
          <Link
            className="font-medium text-[var(--primary)] hover:underline"
            to={`/office/departments/${encodeURIComponent(row.slug)}`}
          >
            {row.name}
          </Link>
        ),
      },
      {
        field: "status",
        header: "Estado sala",
        body: (row) => (
          <StatusPill status={row.status === "busy" ? "running" : "completed"}>
            {row.status === "busy" ? "Ocupado" : "Libre"}
          </StatusPill>
        ),
      },
      {
        field: "agents",
        header: "Especialistas",
        sortable: true,
        body: (row) => <span className="tabular-nums">{row.agents}</span>,
      },
      {
        field: "slug",
        header: "",
        body: (row) => (
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/office/trabajo?departmentSlug=${encodeURIComponent(row.slug)}`}>Encargos</Link>
          </Button>
        ),
      },
    ],
    [],
  );

  if (error) {
    return (
      <EmptyState title="No se pudo cargar el dashboard" description={error} />
    );
  }
  if (!dash || !legacy) return <PageLoading message="Cargando métricas de empresa…" />;

  const { stats, usage, activity } = dash;
  const costMonth = usage.totalCostUsd;
  const costLimit = usage.limits.maxCostUsdPerMonth;

  return (
    <div className="space-y-6">
      <section className="hero-strip">
        <KpiCard
          label="Coste acumulado"
          value={formatUsd(legacy.totalCostUsd)}
          delta={`Periodo: ${formatUsd(costMonth)}${costLimit ? ` / ${formatUsd(costLimit)}` : ""}`}
        />
        <KpiCard
          label="Encargos activos"
          value={stats.activeRuns}
          delta={`${legacy.activeRuns} runs en ejecución técnica`}
          trend={stats.activeRuns > 0 ? "up" : "flat"}
        />
        <KpiCard
          label="Decisiones pendientes"
          value={legacy.pendingDecisions}
          delta="Requieren tu criterio"
          trend={legacy.pendingDecisions > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Handoffs pendientes"
          value={legacy.pendingHandoffs}
          delta="Entre departamentos"
          trend={legacy.pendingHandoffs > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Revisiones de documento"
          value={legacy.pendingReviews}
          delta="Pendientes de aprobar"
          trend={legacy.pendingReviews > 0 ? "down" : "flat"}
        />
        <KpiCard
          label="Inversión / ingresos"
          value={formatUsd(stats.totalInvestedUsd)}
          delta={`Ingresos: ${formatUsd(stats.totalRevenueUsd)}`}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="sm" asChild>
          <Link to="/office/inbox">
            <Inbox className="mr-1.5 h-4 w-4" aria-hidden />
            Bandeja empresarial
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/office/trabajo">Ver encargos</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/office/organigrama">Organigrama</Link>
        </Button>
      </div>

      <Panel
        title="Salud por departamento"
        subtitle="Actividad de salas y especialistas (Fase H — tabla departamental en evolución)"
      >
        <DataTable
          columns={departmentColumns}
          data={departmentRows}
          globalFilterEnabled
          globalFilterPlaceholder="Filtrar departamento…"
          emptyMessage="No hay departamentos configurados."
          paginator={departmentRows.length > 8}
          rows={8}
        />
      </Panel>

      <Panel
        title="Actividad reciente"
        subtitle="Pulso operativo de la oficina"
        bodySize="sm"
      >
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">Sin actividad reciente.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {activity.slice(0, 12).map((item) => (
              <li key={item.id} className="flex gap-3 py-3 text-sm">
                <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[var(--foreground-muted)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link to={item.href} className="font-medium text-[var(--primary)] hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                  )}
                  {item.subtitle && (
                    <p className="text-[var(--foreground-muted)]">{item.subtitle}</p>
                  )}
                  <time className="text-xs text-[var(--foreground-muted)]">{item.timestamp}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
