import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type ExecutionRun } from "../lib/api";

const statusColors: Record<string, string> = {
  PENDING: "text-yellow-400",
  RUNNING: "text-[var(--color-primary)]",
  COMPLETED: "text-[var(--color-accent)]",
  FAILED: "text-[var(--color-destructive)]",
  CANCELLED: "text-[var(--color-muted-foreground)]",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.runs.list().then(setRuns).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--color-muted-foreground)]">Loading runs…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Execution Runs</h1>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-4 py-3">Workflow</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Started</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">
                  <Link to={`/runs/${run.id}`} className="font-medium hover:underline">
                    {run.workflow?.name ?? run.workflowId.slice(0, 8)}
                  </Link>
                </td>
                <td className={`px-4 py-3 font-medium ${statusColors[run.status]}`}>{run.status}</td>
                <td className="px-4 py-3">{run.totalTokens.toLocaleString()}</td>
                <td className="px-4 py-3">${run.totalCostUsd.toFixed(4)}</td>
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
