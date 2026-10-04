import { Link } from "react-router-dom";
import type { DepartmentOperationRunRow } from "../../lib/api";

export function RoutineRunHistory({ runs }: { runs: DepartmentOperationRunRow[] }) {
  if (!runs.length) {
    return <p className="text-xs text-[var(--foreground-muted)]">Sin ejecuciones recientes.</p>;
  }
  return (
    <ul className="space-y-1 text-xs">
      {runs.map((run) => (
        <li key={run.id} className="flex items-center justify-between gap-2">
          <Link to={run.href} className="truncate text-[var(--primary)] hover:underline">
            {run.id.slice(0, 8)}…
          </Link>
          <span className="shrink-0 tabular-nums text-[var(--foreground-muted)]">
            {run.status} · ${run.totalCostUsd.toFixed(2)}
          </span>
        </li>
      ))}
    </ul>
  );
}
