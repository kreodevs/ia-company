import { useTranslation } from "react-i18next";
import type { TeamActiveRunSummary } from "../../lib/api";

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusTone(status: string): "live" | "queued" | "waiting" {
  if (status === "RUNNING" || status === "DELEGATED") return "live";
  if (status === "PENDING") return "queued";
  return "waiting";
}

export interface WarRoomRunSelectorProps {
  activeRuns: TeamActiveRunSummary[];
  selectedRunId: string | null;
  onSelect: (runId: string | null) => void;
  className?: string;
  id?: string;
}

export default function WarRoomRunSelector({
  activeRuns,
  selectedRunId,
  onSelect,
  className,
  id = "war-room-run",
}: WarRoomRunSelectorProps) {
  const { t } = useTranslation();

  if (activeRuns.length === 0) {
    return (
      <span className={`war-room-run-empty ${className ?? ""}`}>
        {t("warRoom.runSelector.none")}
      </span>
    );
  }

  const showAuto = activeRuns.length > 1;
  const autoSelected = showAuto && !selectedRunId;

  return (
    <div
      id={id}
      className={`war-room-run-chips${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={t("warRoom.runSelector.label")}
    >
      {showAuto && (
        <button
          type="button"
          role="tab"
          aria-selected={autoSelected}
          className={`war-room-run-chip${autoSelected ? " is-selected" : ""}`}
          onClick={() => onSelect(null)}
        >
          <span className="war-room-run-chip-title">{t("warRoom.runSelector.auto")}</span>
          <span className="war-room-run-chip-meta">{t("warRoom.runSelector.autoHint")}</span>
        </button>
      )}

      {activeRuns.map((run) => {
        const selected = selectedRunId === run.id || (!showAuto && activeRuns.length === 1);
        const tone = statusTone(run.status);

        return (
          <button
            key={run.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`war-room-run-chip war-room-run-chip--${tone}${selected ? " is-selected" : ""}`}
            onClick={() => onSelect(run.id)}
            title={run.task ?? undefined}
          >
            <span className="war-room-run-chip-head">
              <span className={`war-room-run-chip-dot${tone === "live" ? " is-live" : ""}`} aria-hidden />
              <span className="war-room-run-chip-title">{run.workflowName}</span>
            </span>
            <span className="war-room-run-chip-meta">
              {run.status} · {shortTime(run.startedAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
