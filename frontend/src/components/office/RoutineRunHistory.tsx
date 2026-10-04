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
          <span className="shrink-0 text-right text-[var(--foreground-muted)]">
            <span className="tabular-nums">{run.status} · ${run.totalCostUsd.toFixed(2)}</span>
            {run.departmentWorkCount > 0 ? (
              <span className="block text-[10px]">{run.departmentWorkCount} trabajo(s) dept.</span>
            ) : null}
            {run.deliveryHref ? (
              <Link to={run.deliveryHref} className="block text-[10px] text-[var(--primary)] hover:underline">
                Entrega
              </Link>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
