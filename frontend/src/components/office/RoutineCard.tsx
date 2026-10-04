import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/molecules/Card";
import { useState } from "react";
import { Button } from "@/components/atoms/Button";
import { setDepartmentOperationEnabled, type DepartmentOperationRow } from "../../lib/api";
import { RoutineHealthBadge } from "./RoutineHealthBadge";
import { RoutineRunHistory } from "./RoutineRunHistory";

function formatUsd(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function RoutineCard({
  operation,
  onChanged,
}: {
  operation: DepartmentOperationRow;
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await setDepartmentOperationEnabled(
        operation.scheduleId,
        !operation.enabled,
        !operation.enabled ? null : "Pausado manualmente desde la sala",
      );
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };
  const freq = operation.cronExpr
    ? `Cron: ${operation.cronExpr}`
    : operation.intervalSec >= 86400
      ? `Cada ${Math.round(operation.intervalSec / 86400)} d`
      : `Cada ${operation.intervalSec}s`;

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="h-4 w-4 text-[var(--primary)]" aria-hidden />
          {operation.procedureLabel ?? operation.scheduleName}
        </span>
      }
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-2">
          <RoutineHealthBadge health={operation.health} />
          <span className="text-xs text-[var(--foreground-muted)]">{freq}</span>
        </span>
      }
    >
      {operation.responsibleAgentName ? (
        <p className="mb-2 text-xs text-[var(--foreground-muted)]">
          Responsable: <span className="font-medium text-[var(--foreground)]">{operation.responsibleAgentName}</span>
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[var(--foreground-muted)]">Próxima</dt>
          <dd className="text-xs">{operation.nextRunAt ? new Date(operation.nextRunAt).toLocaleString() : "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--foreground-muted)]">Coste medio</dt>
          <dd className="font-medium tabular-nums">{formatUsd(operation.avgCostUsd)}</dd>
        </div>
      </dl>
      {operation.pauseReason ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{operation.pauseReason}</p>
      ) : null}
      {operation.lastRunId ? (
        <p className="mt-2 text-xs">
          Última:{" "}
          <Link className="text-[var(--primary)] hover:underline" to={`/office/encargos/${operation.lastRunId}`}>
            ver encargo
          </Link>
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void toggle()}>
          {operation.enabled ? "Pausar rutina" : "Reactivar rutina"}
        </Button>
      </div>
      <div className="mt-3 border-t border-[var(--border)] pt-2">
        <RoutineRunHistory runs={operation.recentRuns} />
      </div>
    </Card>
  );
}
