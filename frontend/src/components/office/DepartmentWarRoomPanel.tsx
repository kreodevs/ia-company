import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type TeamAgent } from "../../lib/api";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import { agentDisplayLabel } from "../../lib/office-visual";
import WarRoomAgentSeat from "../war-room/WarRoomAgentSeat";
import WarRoomIdleSeats from "../war-room/WarRoomIdleSeats";
import WarRoomRecentRuns from "../war-room/WarRoomRecentRuns";
import WarRoomRunSelector from "../war-room/WarRoomRunSelector";
import WarRoomTable from "../war-room/WarRoomTable";
import WarRoomVetoBanner from "../war-room/WarRoomVetoBanner";
import { useWarRoomTeam } from "../war-room/hooks/useWarRoomTeam";
import type { DepartmentRoomAgent } from "./DepartmentRoomView";

interface DepartmentWarRoomPanelProps {
  departmentSlug?: string;
  orgUnitId?: string;
  agentNames: string[];
  seats: DepartmentRoomAgent[];
  onSeatClick?: (agent: DepartmentRoomAgent) => void;
}

function toSeatAgent(agent: TeamAgent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    currentTask: agent.currentTask,
  };
}

export default function DepartmentWarRoomPanel({
  departmentSlug,
  orgUnitId,
  agentNames,
  seats,
  onSeatClick,
}: DepartmentWarRoomPanelProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const watchRunId = searchParams.get("watchRun") ?? searchParams.get("run");

  const fetchTeam = useCallback(async () => {
    if (orgUnitId) return api.orgUnits.team(orgUnitId, watchRunId ?? undefined);
    if (departmentSlug) return api.office.departmentTeam(departmentSlug, watchRunId ?? undefined);
    return null;
  }, [departmentSlug, orgUnitId, watchRunId]);

  const scopeKey = orgUnitId ? `org:${orgUnitId}` : `dept:${departmentSlug ?? "none"}`;
  const { data, loading, error: loadError, displayTeam, handoff, retry } = useWarRoomTeam(
    fetchTeam,
    scopeKey,
    watchRunId,
    { enabled: Boolean(orgUnitId || departmentSlug) },
  );

  const setWatchRun = (runId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("run");
      if (runId) next.set("watchRun", runId);
      else next.delete("watchRun");
      return next;
    });
  };

  if (loading) {
    return <p className="office-empty">{t("warRoom.loading")}</p>;
  }

  if (loadError) {
    return (
      <div className="office-dept-war-room-error-panel" role="alert">
        <p className="office-dept-war-room-error-title">{t("warRoom.loadErrorTitle")}</p>
        <p className="office-dept-war-room-error-body">{loadError}</p>
        <button type="button" className="office-link-btn" onClick={retry}>
          {t("warRoom.retry")}
        </button>
      </div>
    );
  }

  const recentRunsSection =
    data && data.recentRuns.length > 0 ? <WarRoomRecentRuns runs={data.recentRuns} /> : null;

  if (!data?.activeRun) {
    if (seats.length === 0) {
      return <p className="office-empty">{t("office.floor.noSpecialists")}</p>;
    }
    return (
      <>
        <WarRoomIdleSeats
          seats={seats}
          onSeatClick={onSeatClick}
          emptyMessage={t("office.floor.noSpecialists")}
        />
        {recentRunsSection}
      </>
    );
  }

  const activeRuns = data.activeRuns;
  const orderedTeam = agentNames
    .map((name) => displayTeam.find((agent) => agent.name === name))
    .filter((agent): agent is TeamAgent => Boolean(agent));

  const activeRunAlert =
    data.activeRun.errorMessage && !data.activeRun.errorMessage.startsWith("VETO:")
      ? data.activeRun.errorMessage
      : null;
  const activeRunVeto = data.activeRun.errorMessage?.startsWith("VETO:")
    ? data.activeRun.errorMessage
    : null;

  return (
    <div className="office-dept-war-room-live">
      {activeRunVeto ? (
        <WarRoomVetoBanner message={activeRunVeto} className="office-dept-war-room-veto-wrap" />
      ) : null}
      {activeRunAlert ? (
        <div className="office-dept-war-room-error-panel" role="alert">
          <p className="office-dept-war-room-error-body">{activeRunAlert}</p>
        </div>
      ) : null}
      <div className="office-dept-war-room-live-head">
        <div>
          <p className="office-dept-war-room-live-eyebrow">{t("office.floor.liveMeeting")}</p>
          {data.procedureLabel ? (
            <p className="office-dept-war-room-live-procedure">{data.procedureLabel}</p>
          ) : null}
        </div>
        <div className="office-dept-war-room-live-actions">
          {activeRuns.length > 1 ? (
            <WarRoomRunSelector
              id="dept-war-room-run"
              activeRuns={activeRuns}
              selectedRunId={watchRunId}
              onSelect={setWatchRun}
            />
          ) : null}
          <Link to={`/office/encargos/${data.activeRun.id}`} className="office-link-btn">
            {t("office.floor.viewEncargo")} →
          </Link>
          {data.activeRun.productId ? (
            <Link
              to={`/war-room/${data.activeRun.productId}?run=${data.activeRun.id}`}
              className="office-link-btn office-link-btn-muted"
            >
              {t("office.floor.openProductWarRoom")}
            </Link>
          ) : null}
        </div>
      </div>

      <WarRoomTable
        className="office-dept-war-room-table"
        agents={orderedTeam.map(toSeatAgent)}
        handoff={handoff}
        handoffAgentNames={agentNames}
        renderSeat={(agent, index, total) => (
          <button
            key={agent.id}
            type="button"
            className="office-dept-war-room-seat-btn"
            onClick={() =>
              onSeatClick?.({
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status === "idle" ? "idle" : "busy",
                provisioned: true,
              })
            }
            aria-label={agentDisplayLabel(agent, t)}
          >
            <WarRoomAgentSeat agent={agent} index={index} total={total} />
          </button>
        )}
        core={{
          label: t("warRoom.tacticalCore"),
          name: data.procedureLabel ?? formatWorkflowTitle(data.activeRun.workflowName),
          status: t("warRoom.coreRunning", { agents: data.activeRun.agentIds.length }),
          task: data.activeRun.task,
        }}
      />
      {recentRunsSection}
    </div>
  );
}
