import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Inbox, Target } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { getDashboard, type DepartmentManagementRow, type OfficeDashboard } from "../../lib/api";
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

type PeriodKey = "30d" | "all";

function sinceForPeriod(period: PeriodKey): string | undefined {
  if (period === "all") return undefined;
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

/**
 * Fase H — dashboard empresarial (Kreo KPI + DataTable + Panel).
 */
export function Dashboard() {
  const [dash, setDash] = useState<OfficeDashboard | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDash(null);
    getDashboard({ since: sinceForPeriod(period) })
      .then(setDash)
      .catch((e) => setError(e instanceof Error ? e.message : "Error loading dashboard"));
  }, [period]);

  const departmentColumns: DataTableColumn[] = useMemo(
    () => [
      {
        field: "departmentName",
        header: "Departamento",
        sortable: true,
        body: (row: DepartmentManagementRow) => (
          <Link className="font-medium text-[var(--primary)] hover:underline" to={row.href}>
            {row.departmentName}
          </Link>
        ),
      },
      {
        field: "activeCount",
        header: "Activos",
        sortable: true,
        body: (row: DepartmentManagementRow) => (
          <Link className="tabular-nums hover:underline" to={`${row.href}?tab=work`}>
            {row.activeCount}
          </Link>
        ),
      },
      {
        field: "blockedCount",
        header: "Bloqueados",
        sortable: true,
        body: (row: DepartmentManagementRow) =>
          row.blockedCount > 0 ? (
            <Link to="/office/inbox?category=blocked">
              <StatusPill status="running">{row.blockedCount}</StatusPill>
            </Link>
          ) : (
            <span className="tabular-nums text-[var(--foreground-muted)]">0</span>
          ),
      },
      {
        field: "costUsd",
        header: "Coste",
        sortable: true,
        body: (row: DepartmentManagementRow) => formatUsd(row.costUsd),
      },
      {
        field: "deliveredCount",
        header: "Entregados",
        sortable: true,
        body: (row: DepartmentManagementRow) => <span className="tabular-nums">{row.deliveredCount}</span>,
      },
    ],
    [],
  );

  if (error) {
    return <EmptyState title="No se pudo cargar el dashboard" description={error} />;
  }
  if (!dash) return <PageLoading message="Cargando métricas de empresa…" />;

  const { stats, usage, activity, management, departmentMetrics } = dash;
  const costLimit = usage.limits.maxCostUsdPerMonth;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--foreground-muted)]">Periodo:</span>
        <Button
          type="button"
          size="sm"
          variant={period === "30d" ? "default" : "outline"}
          onClick={() => setPeriod("30d")}
        >
          30 días
        </Button>
        <Button
          type="button"
          size="sm"
          variant={period === "all" ? "default" : "outline"}
          onClick={() => setPeriod("all")}
        >
          Todo
        </Button>
      </div>

      <section className="hero-strip">
        <KpiCard
          label="Coste (periodo)"
          value={formatUsd(management.totalCostUsd)}
          delta={`Mes en curso: ${formatUsd(usage.totalCostUsd)}${costLimit ? ` / ${formatUsd(costLimit)}` : ""}`}
        />
        <KpiCard
          label="Encargos activos"
          value={stats.activeRuns}
          delta={`${management.activeRuns} runs en ejecución técnica`}
          trend={stats.activeRuns > 0 ? "up" : "flat"}
        />
        <KpiCard
          label="Trabajos bloqueados"
          value={management.blockedWorkItems}
          delta="Requieren desbloqueo"
          trend={management.blockedWorkItems > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Decisiones pendientes"
          value={management.pendingDecisions}
          delta="Bandeja de decisiones"
          trend={management.pendingDecisions > 0 ? "down" : "up"}
        />
        <KpiCard
          label="Handoffs pendientes"
          value={management.pendingHandoffs}
          delta="Entre departamentos"
        />
        <KpiCard
          label="Objetivos / iniciativas"
          value={management.activeGoals}
          delta={`${management.activeInitiatives} iniciativas activas`}
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
          <Link to="/office/objectives">
            <Target className="mr-1.5 h-4 w-4" aria-hidden />
            Objetivos
          </Link>
        </Button>
      </div>

      <Panel
        title="Salud por departamento"
        subtitle="Activos, bloqueados, coste y entregas por unidad (Fase H)"
      >
        <DataTable
          columns={departmentColumns}
          data={departmentMetrics}
          globalFilterEnabled
          globalFilterPlaceholder="Filtrar departamento…"
          emptyMessage="Sin actividad departamental en este periodo."
          paginator={departmentMetrics.length > 8}
          rows={8}
        />
      </Panel>

      <Panel title="Actividad reciente" subtitle="Pulso operativo de la oficina" bodySize="sm">
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
                  {item.subtitle && <p className="text-[var(--foreground-muted)]">{item.subtitle}</p>}
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
