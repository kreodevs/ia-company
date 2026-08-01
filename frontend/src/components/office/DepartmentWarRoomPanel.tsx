import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type DepartmentTeam, type TeamAgent } from "../../lib/api";
import {
  STEP_EVENT_REFRESH_MS,
  createTeamRefreshScheduler,
  useHeldAgentTeam,
  useWarRoomHandoff,
  warRoomUsesStreamRefresh,
} from "../../lib/war-room-live";
import { formatWorkflowTitle } from "../../lib/workflow-display";
import { AGENT_EMOJI, agentDisplayLabel, avatarGradient } from "../../lib/office-visual";
import WarRoomAgentSeat from "../war-room/WarRoomAgentSeat";
import WarRoomHandoffOverlay from "../war-room/WarRoomHandoffOverlay";
import WarRoomRecentRuns from "../war-room/WarRoomRecentRuns";
import WarRoomRunSelector from "../war-room/WarRoomRunSelector";
import type { DepartmentRoomAgent } from "./DepartmentRoomView";

interface DepartmentWarRoomPanelProps {
  departmentSlug?: string;
  orgUnitId?: string;
  agentNames: string[];
  seats: DepartmentRoomAgent[];
  onSeatClick?: (agent: DepartmentRoomAgent) => void;
  positionOnCircle: (index: number, total: number, radiusPct: number) => { x: number; y: number };
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
  positionOnCircle,
}: DepartmentWarRoomPanelProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const watchRunId = searchParams.get("watchRun");
  const [data, setData] = useState<DepartmentTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const refreshScheduler = useRef(createTeamRefreshScheduler(async () => refresh()));
  const { handoff, bindStreamHandler } = useWarRoomHandoff(data?.activeRun?.id, () =>
    refreshScheduler.current.schedule(STEP_EVENT_REFRESH_MS),
  );

  const fetchTeam = useCallback(async () => {
    if (orgUnitId) return api.orgUnits.team(orgUnitId, watchRunId ?? undefined);
    if (departmentSlug) return api.office.departmentTeam(departmentSlug, watchRunId ?? undefined);
    return null;
  }, [departmentSlug, orgUnitId, watchRunId]);

  const refresh = useCallback(async () => {
    try {
      const team = await fetchTeam();
      setData(team);
      setLoadError(null);
      return team;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    }
  }, [fetchTeam]);

  useEffect(() => {
    refreshScheduler.current = createTeamRefreshScheduler(() => refresh());
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => refreshScheduler.current.dispose();
  }, [refresh]);

  useEffect(() => {
    const active = data?.activeRun;
    if (!active || warRoomUsesStreamRefresh(active.status)) return;

    const intervalMs =
      active.status === "DELEGATED" ? 8000 : active.status === "AWAITING_USER" ? 12000 : 15000;
    const timer = window.setInterval(() => refreshScheduler.current.schedule(intervalMs), intervalMs);
    return () => window.clearInterval(timer);
  }, [data?.activeRun?.id, data?.activeRun?.status]);

  useEffect(() => {
    const active = data?.activeRun;
    if (
      !active ||
      (active.status !== "RUNNING" &&
        active.status !== "PENDING" &&
        active.status !== "DELEGATED" &&
        active.status !== "AWAITING_USER")
    ) {
      return;
    }
    const close = api.runs.streamLogs(active.id, bindStreamHandler((evt) => {
      const event = evt as { type?: string };
      if (event.type === "done") refreshScheduler.current.flush();
    }));
    return () => {
      close();
    };
  }, [data?.activeRun?.id, data?.activeRun?.status, bindStreamHandler]);

  const displayTeam = useHeldAgentTeam(data?.team ?? []);
  const orderedTeam = agentNames
    .map((name) => displayTeam.find((agent) => agent.name === name))
    .filter((agent): agent is TeamAgent => Boolean(agent));

  const setWatchRun = (runId: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
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
        <button
          type="button"
          className="office-link-btn"
          onClick={() => {
            setLoading(true);
            void refresh().finally(() => setLoading(false));
          }}
        >
          {t("warRoom.retry")}
        </button>
      </div>
    );
  }

  const recentRunsSection =
    data && data.recentRuns.length > 0 ? (
      <WarRoomRecentRuns runs={data.recentRuns} />
    ) : null;

  if (!data?.activeRun) {
    if (seats.length === 0) {
      return <p className="office-empty">{t("office.floor.noSpecialists")}</p>;
    }
    return (
      <>
        <div className="office-dept-table">
          <div className="office-dept-table-core" aria-hidden />
          {seats.map((agent, index) => {
            const { x, y } = positionOnCircle(index, Math.max(seats.length, 1), 38);
            return (
              <button
                key={agent.id}
                type="button"
                className={`office-dept-seat office-dept-seat-${agent.status}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => onSeatClick?.(agent)}
                aria-label={agentDisplayLabel(agent, t)}
              >
                <div
                  className="office-dept-seat-avatar"
                  style={{ background: avatarGradient(agent.name) }}
                  data-pending={!agent.provisioned ? "true" : undefined}
                >
                  <span aria-hidden>{AGENT_EMOJI[agent.name] ?? "🧑‍💼"}</span>
                </div>
                <p className="office-dept-seat-name">{agentDisplayLabel(agent, t)}</p>
                <p className="office-dept-seat-status">
                  {!agent.provisioned
                    ? t("office.floor.agentPending")
                    : agent.status === "busy"
                      ? t("office.agents.busy")
                      : t("office.agents.idle")}
                </p>
              </button>
            );
          })}
        </div>
        {recentRunsSection}
      </>
    );
  }

  const activeRuns = data.activeRuns.map((run) => ({
    ...run,
    workflowName: run.workflowName,
  }));

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
        <div className="office-dept-war-room-veto" role="alert">
          <p className="office-dept-war-room-veto-title">{t("warRoom.vetoTitle")}</p>
          <p className="office-dept-war-room-veto-body">{activeRunVeto}</p>
        </div>
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
            <Link to={`/war-room/${data.activeRun.productId}?run=${data.activeRun.id}`} className="office-link-btn office-link-btn-muted">
              {t("office.floor.openProductWarRoom")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="war-room-table office-dept-war-room-table" data-density="normal" aria-label={t("warRoom.tableAria")}>
        <div className="war-room-table-backdrop" aria-hidden>
          <div className="war-room-table-grid" />
        </div>
        <div className="war-room-table-stage">
          <div className="war-room-table-ring" aria-hidden />
          <div className="war-room-core">
            <p className="war-room-core-label">{t("warRoom.tacticalCore")}</p>
            <p className="war-room-core-name">
              {data.procedureLabel ?? formatWorkflowTitle(data.activeRun.workflowName)}
            </p>
            <p className="war-room-core-status">
              {t("warRoom.coreRunning", { agents: data.activeRun.agentIds.length })}
            </p>
            {data.activeRun.task ? (
              <p className="war-room-core-task">{data.activeRun.task}</p>
            ) : null}
          </div>
          <WarRoomHandoffOverlay handoff={handoff} agentNames={agentNames} />
          {orderedTeam.map((agent, index) => (
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
              <WarRoomAgentSeat agent={toSeatAgent(agent)} index={index} total={orderedTeam.length} />
            </button>
          ))}
        </div>
      </div>
      {recentRunsSection}
    </div>
  );
}
