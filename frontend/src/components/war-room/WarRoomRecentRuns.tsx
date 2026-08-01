import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import Badge from "../ui/Badge";
import { shortTime } from "./war-room-shared";

export interface WarRoomRecentRunItem {
  id: string;
  status: string;
  workflowName: string;
  startedAt: string | null;
  totalTokens: number;
}

interface WarRoomRecentRunsProps {
  runs: WarRoomRecentRunItem[];
  className?: string;
}

export default function WarRoomRecentRuns({ runs, className = "" }: WarRoomRecentRunsProps) {
  const { t } = useTranslation();
  if (runs.length === 0) return null;

  return (
    <section className={`office-dept-recent-runs war-room-recent-runs ${className}`.trim()}>
      <h3 className="office-dept-recent-runs-title">{t("warRoom.recentRuns")}</h3>
      <ol className="office-dept-recent-runs-list">
        {runs.map((run) => (
          <li key={run.id}>
            <Link to={`/office/encargos/${run.id}`} className="office-dept-recent-run-row">
              <span className="office-dept-recent-run-name">{formatWorkflowTitle(run.workflowName)}</span>
              <span className="office-dept-recent-run-meta">
                {shortTime(run.startedAt)} · {run.totalTokens.toLocaleString()} tokens
              </span>
              <Badge>{run.status}</Badge>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
