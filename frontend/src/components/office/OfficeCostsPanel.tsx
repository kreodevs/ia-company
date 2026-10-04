import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOfficeCostReport, type OfficeCostReport } from "../../lib/api";
import Panel from "../ui/Panel";
import KpiCard from "../ui/KpiCard";
import EmptyState from "../ui/EmptyState";
import PageLoading from "../ui/PageLoading";
import StatusPill from "../ui/StatusPill";

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

/** Fase J — coste empresarial con alertas de presupuesto. */
export function OfficeCostsPanel() {
  const [report, setReport] = useState<OfficeCostReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOfficeCostReport()
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, []);

  if (error) return <EmptyState title="Costes" description={error} />;
  if (!report) return <PageLoading message="Cargando costes…" />;

  return (
    <Panel title="Coste empresarial" subtitle="Desglose y alertas de presupuesto (Fase J)">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Coste (filtro)" value={formatUsd(report.totalCostUsd)} delta={`${report.runCount} encargos`} />
        <KpiCard label="Activos" value={report.activeRuns} />
        <KpiCard
          label="Presupuesto mes"
          value={
            report.budgetLimitUsd != null
              ? `${report.budgetUsedPercent ?? 0}%`
              : "Sin límite"
          }
          delta={
            report.budgetLimitUsd != null
              ? `${formatUsd(report.totalCostUsd)} / ${formatUsd(report.budgetLimitUsd)}`
              : undefined
          }
        />
      </div>
      {report.budgetAlert ? (
        <p className="mb-4">
          <StatusPill status={report.budgetAlert >= 80 ? "running" : "pending"}>
            Alerta presupuesto {report.budgetAlert}%
          </StatusPill>
        </p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-3">
        <CostBreakdown title="Por departamento" rows={report.byDepartment} />
        <CostBreakdown title="Por objetivo" rows={report.byObjective} />
        <CostBreakdown title="Por producto" rows={report.byProduct} />
      </div>
    </Panel>
  );
}

function CostBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: OfficeCostReport["byDepartment"];
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <ul className="space-y-1 text-sm">
        {rows.length === 0 ? (
          <li className="text-[var(--foreground-muted)]">—</li>
        ) : (
          rows.map((row) => (
            <li key={row.key} className="flex justify-between gap-2">
              {row.href ? (
                <Link to={row.href} className="truncate text-[var(--primary)] hover:underline">
                  {row.label}
                </Link>
              ) : (
                <span className="truncate">{row.label}</span>
              )}
              <span className="shrink-0 tabular-nums">{formatUsd(row.costUsd)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
