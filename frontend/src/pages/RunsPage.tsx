import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type ExecutionRun, type Workflow } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";
import Button from "../components/ui/Button";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING", "DELEGATED", "AWAITING_USER"]);
const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "RUNNING",
  "DELEGATED",
  "AWAITING_USER",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

function runStatusLabel(run: ExecutionRun, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (run.errorMessage?.startsWith("VETO:")) {
    return t("status.VETO", { defaultValue: "Blocked by Munger" });
  }
  return t(`status.${run.status}`, { defaultValue: run.status });
}

function RunCard({ run }: { run: ExecutionRun }) {
  const { t } = useTranslation();
  const statusLabel = runStatusLabel(run, t);

  return (
    <Link
      to={`/runs/${run.id}`}
      className="interactive block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:border-[var(--color-primary)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {run.workflow?.name ?? run.workflowId.slice(0, 8)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
          </p>
          {run.errorMessage?.startsWith("VETO:") && (
            <p className="mt-2 text-xs text-[var(--foreground-muted)]">{run.errorMessage}</p>
          )}
        </div>
        <StatusBadge status={run.status} label={statusLabel} errorMessage={run.errorMessage} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-[var(--color-muted-foreground)]">{t("runs.list.columns.tokens")}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{run.totalTokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-muted-foreground)]">{t("runs.list.columns.cost")}</dt>
          <dd className="mt-0.5 font-medium tabular-nums">${run.totalCostUsd.toFixed(4)}</dd>
        </div>
      </dl>
    </Link>
  );
}

export default function RunsPage() {
  const { t } = useTranslation();
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (workflowFilter) params.set("workflowId", workflowFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const query = params.toString();
      const [runList, workflowList] = await Promise.all([
        api.runs.list(query ? `?${query}` : undefined),
        workflows.length ? Promise.resolve(workflows) : api.workflows.list(),
      ]);
      setRuns(runList);
      if (!workflows.length) setWorkflows(workflowList);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [workflowFilter, statusFilter, workflows.length]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const hasActiveRuns = useMemo(
    () => runs.some((run) => ACTIVE_STATUSES.has(run.status)),
    [runs],
  );

  useEffect(() => {
    if (!hasActiveRuns) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveRuns, load]);

  if (loading && runs.length === 0) {
    return <PageLoading message={t("runs.list.loading")} />;
  }

  return (
    <div>
      <PageHeader
        title={t("runs.list.title")}
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            {t("runs.list.refresh", { defaultValue: "Refresh" })}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <label className="grid gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {t("runs.list.filters.workflow", { defaultValue: "Workflow" })}
          </span>
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
          >
            <option value="">{t("runs.list.filters.allWorkflows", { defaultValue: "All workflows" })}</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-[var(--color-muted-foreground)]">
            {t("runs.list.filters.status", { defaultValue: "Status" })}
          </span>
          <select
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? t("runs.list.filters.allStatuses", { defaultValue: "All statuses" })
                  : t(`status.${status}`, { defaultValue: status })}
              </option>
            ))}
          </select>
        </label>

        {hasActiveRuns && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t("runs.list.autoRefresh", { defaultValue: "Auto-refreshing every 5s while runs are active" })}
          </p>
        )}
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl border border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {runs.length === 0 ? (
        <EmptyState title={t("runs.list.emptyTitle", { defaultValue: "No runs yet" })} />
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {runs.map((run) => (
              <li key={run.id}>
                <RunCard run={run} />
              </li>
            ))}
          </ul>

          <div className="table-scroll hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">{t("runs.list.columns.workflow")}</th>
                  <th className="px-4 py-3">{t("runs.list.columns.status")}</th>
                  <th className="px-4 py-3">{t("runs.list.columns.tokens")}</th>
                  <th className="px-4 py-3">{t("runs.list.columns.cost")}</th>
                  <th className="px-4 py-3">{t("runs.list.columns.started")}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-muted)]/30">
                    <td className="px-4 py-3">
                      <Link to={`/runs/${run.id}`} className="interactive font-medium hover:underline">
                        {run.workflow?.name ?? run.workflowId.slice(0, 8)}
                      </Link>
                      {run.errorMessage?.startsWith("VETO:") && (
                        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{run.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={run.status}
                        label={runStatusLabel(run, t)}
                        errorMessage={run.errorMessage}
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">{run.totalTokens.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">${run.totalCostUsd.toFixed(4)}</td>
                    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
