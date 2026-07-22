import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type ExecutionRun } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";

function RunCard({ run }: { run: ExecutionRun }) {
  const { t } = useTranslation();
  const statusLabel = t(`status.${run.status}`, { defaultValue: run.status });

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
        </div>
        <StatusBadge status={run.status} label={statusLabel} />
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.runs.list().then(setRuns).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message={t("runs.list.loading")} />;

  return (
    <div>
      <PageHeader title={t("runs.list.title")} />

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
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={run.status}
                        label={t(`status.${run.status}`, { defaultValue: run.status })}
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
