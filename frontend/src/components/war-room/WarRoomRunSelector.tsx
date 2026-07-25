import { useTranslation } from "react-i18next";
import Select from "../ui/Select";
import type { TeamActiveRunSummary } from "../../lib/api";

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface WarRoomRunSelectorProps {
  activeRuns: TeamActiveRunSummary[];
  selectedRunId: string | null;
  onSelect: (runId: string | null) => void;
  className?: string;
  size?: "sm" | "md";
  id?: string;
}

export default function WarRoomRunSelector({
  activeRuns,
  selectedRunId,
  onSelect,
  className,
  size = "sm",
  id = "war-room-run",
}: WarRoomRunSelectorProps) {
  const { t } = useTranslation();

  if (activeRuns.length === 0) {
    return (
      <span className={`text-xs text-[var(--color-muted-foreground)] ${className ?? ""}`}>
        {t("warRoom.runSelector.none")}
      </span>
    );
  }

  const options = [
    {
      value: "",
      label: t("warRoom.runSelector.auto"),
    },
    ...activeRuns.map((run) => ({
      value: run.id,
      label: t("warRoom.runSelector.option", {
        workflow: run.workflowName,
        status: run.status,
        time: shortTime(run.startedAt),
      }),
    })),
  ];

  return (
    <Select
      id={id}
      value={selectedRunId ?? ""}
      onChange={(value) => onSelect(value || null)}
      options={options}
      ariaLabel={t("warRoom.runSelector.label")}
      className={className}
      size={size}
    />
  );
}
