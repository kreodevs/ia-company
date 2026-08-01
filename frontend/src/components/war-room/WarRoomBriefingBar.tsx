import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import type { TeamActiveRun, TeamAgent, TeamActiveRunSummary } from "../../lib/api";
import { shortTime } from "./war-room-shared";

interface WarRoomBriefingBarProps {
  activeRun: TeamActiveRun | null;
  activeRuns?: TeamActiveRunSummary[];
  thinkingAgent?: TeamAgent | null;
  runLinkPrefix?: string;
  emptyMessage?: string;
}

export default function WarRoomBriefingBar({
  activeRun,
  activeRuns = [],
  thinkingAgent,
  runLinkPrefix = "/runs",
  emptyMessage,
}: WarRoomBriefingBarProps) {
  const { t } = useTranslation();

  return (
    <aside className="war-room-details war-room-briefing-bar">
      <div className="war-room-briefing-col">
        <h2 className="war-room-section-title">{t("warRoom.briefing")}</h2>
        {activeRun ? (
          <div className="war-room-briefing">
            {activeRuns.length > 1 && (
              <p className="war-room-briefing-meta war-room-briefing-multi">
                {t("warRoom.runSelector.viewingOneOf", { count: activeRuns.length })}
              </p>
            )}
            <Link to={`${runLinkPrefix}/${activeRun.id}`} className="war-room-briefing-link">
              <p className="war-room-briefing-label">{t("warRoom.workflow")}</p>
              <p className="war-room-briefing-name">{formatWorkflowTitle(activeRun.workflowName)}</p>
            </Link>
            {activeRun.task ? (
              <p className="war-room-briefing-meta">
                <span className="font-medium">{t("warRoom.runSelector.task")}: </span>
                {activeRun.task}
              </p>
            ) : null}
            <p className="war-room-briefing-meta">
              {t("warRoom.startedAt", { time: shortTime(activeRun.startedAt) })}
            </p>
            <p className="war-room-briefing-meta">
              {t("warRoom.agentsOnRun", { count: activeRun.agentIds.length })}
            </p>
          </div>
        ) : (
          <p className="war-room-empty">{emptyMessage ?? t("warRoom.noActiveRun")}</p>
        )}
      </div>

      {thinkingAgent ? (
        <div className="war-room-thinking war-room-briefing-col">
          <p className="war-room-section-subtitle">{t("warRoom.thinking")}</p>
          <p className="war-room-thinking-name">{thinkingAgent.name}</p>
          <p className="war-room-thinking-task">
            {thinkingAgent.currentTask ?? t("warRoom.thinkingGeneric")}
          </p>
        </div>
      ) : null}

      <div className="war-room-legend war-room-briefing-col">
        <p className="war-room-section-subtitle">{t("warRoom.legend")}</p>
        <ul>
          <li>
            <span className="war-room-dot" data-status="thinking" />
            {t("warRoom.status.thinking")}
          </li>
          <li>
            <span className="war-room-dot" data-status="queued" />
            {t("warRoom.status.queued")}
          </li>
          <li>
            <span className="war-room-dot" data-status="idle" />
            {t("warRoom.status.idle")}
          </li>
        </ul>
      </div>
    </aside>
  );
}
