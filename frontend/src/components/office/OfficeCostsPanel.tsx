import { useCallback, useEffect, useState } from "react";
import Input from "../ui/Input";
import { Button } from "@/components/atoms/Button";
import { Link } from "react-router-dom";
import {
  getDashboard,
  getObjectives,
  getOfficeCostReport,
  api,
  type OfficeCostReport,
  type CompanyGoal,
} from "../../lib/api";
import Panel from "../ui/Panel";
import KpiCard from "../ui/KpiCard";
import EmptyState from "../ui/EmptyState";
import PageLoading from "../ui/PageLoading";
import StatusPill from "../ui/StatusPill";

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

type PeriodPreset = "all" | "30d" | "7d";

function sinceFromPreset(preset: PeriodPreset): string | undefined {
  if (preset === "all") return undefined;
  const d = new Date();
  d.setDate(d.getDate() - (preset === "30d" ? 30 : 7));
  return d.toISOString();
}

/** Fase J — coste empresarial con alertas de presupuesto. */
export function OfficeCostsPanel() {
  const [report, setReport] = useState<OfficeCostReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [modelFilter, setModelFilter] = useState("");
  const [companyGoalId, setCompanyGoalId] = useState("");
  const [productId, setProductId] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [runId, setRunId] = useState("");
  const [objectives, setObjectives] = useState<CompanyGoal[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    void Promise.all([
      getObjectives().then(setObjectives).catch(() => setObjectives([])),
      api.products.list().then((rows) => setProducts(rows.map((p) => ({ id: p.id, name: p.name })))).catch(() => []),
      getDashboard()
        .then((d) =>
          setDepartments(
            (d.departments ?? [])
              .filter((room) => room.kind === "org_unit")
              .map((room) => ({ id: room.id, name: room.name ?? room.slug })),
          ),
        )
        .catch(() => []),
    ]);
  }, []);

  const load = useCallback(() => {
    setError(null);
    getOfficeCostReport({
      since: sinceFromPreset(period),
      model: modelFilter.trim() || undefined,
      companyGoalId: companyGoalId || undefined,
      productId: productId || undefined,
      orgUnitId: orgUnitId || undefined,
      runId: runId.trim() || undefined,
    })
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [period, modelFilter, companyGoalId, productId, orgUnitId, runId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <EmptyState title="Costes" description={error} />;
  if (!report) return <PageLoading message="Cargando costes…" />;

  return (
    <Panel title="Coste empresarial" subtitle="Desglose y alertas de presupuesto (Fase J)">
      <div className="mb-4 flex flex-wrap gap-2">
        {(["7d", "30d", "all"] as PeriodPreset[]).map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={period === p ? "default" : "outline"}
            onClick={() => setPeriod(p)}
          >
            {p === "all" ? "Todo" : p}
          </Button>
        ))}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Coste (filtro)" value={formatUsd(report.totalCostUsd)} delta={`${report.runCount} encargos`} />
        <KpiCard label="Activos" value={report.activeRuns} />
        <KpiCard
          label="Presupuesto mes"
          value={
            report.budgetLimitUsd != null ? `${report.budgetUsedPercent ?? 0}%` : "Sin límite"
          }
          delta={
            report.budgetLimitUsd != null
              ? `${formatUsd(report.totalCostUsd)} / ${formatUsd(report.budgetLimitUsd)}`
              : undefined
          }
        />
        <KpiCard
          label="Proyección fin de mes"
          value={report.projectedMonthEndUsd != null ? formatUsd(report.projectedMonthEndUsd) : "—"}
          delta={
            report.projectedBudgetPercent != null
              ? `~${report.projectedBudgetPercent}% del límite`
              : undefined
          }
        />
      </div>
      {report.costPerCompletedRunUsd != null ? (
        <p className="mb-4 text-sm text-[var(--foreground-muted)]">
          Coste medio por entrega completada: {formatUsd(report.costPerCompletedRunUsd)} (
          {report.completedRunCount} encargos)
        </p>
      ) : null}
      {report.budgetAlert ? (
        <p className="mb-4">
          <StatusPill status={report.budgetAlert >= 80 ? "running" : "pending"}>
            Alerta presupuesto {report.budgetAlert}%
          </StatusPill>
        </p>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-[var(--foreground-muted)]">
          Objetivo
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
            value={companyGoalId}
            onChange={(e) => setCompanyGoalId(e.target.value)}
          >
            <option value="">Todos</option>
            {objectives.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[var(--foreground-muted)]">
          Producto
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[var(--foreground-muted)]">
          Departamento (OrgUnit)
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
            value={orgUnitId}
            onChange={(e) => setOrgUnitId(e.target.value)}
          >
            <option value="">Todos</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-[var(--foreground-muted)]">
          Encargo (id)
          <Input className="mt-1" value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="run id" />
        </label>
        <label className="text-sm text-[var(--foreground-muted)]">
          Modelo LLM
          <Input
            className="mt-1"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="ej. claude, gpt-4"
          />
        </label>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={load}>
        Aplicar filtros
      </Button>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <CostBreakdown title="Por departamento" rows={report.byDepartment} />
        <CostBreakdown title="Por objetivo" rows={report.byObjective} />
        <CostBreakdown title="Por producto" rows={report.byProduct} />
        <CostBreakdown title="Por modelo" rows={report.byModel} />
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
