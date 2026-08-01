import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2 } from "lucide-react";
import WarRoomAgentSeat from "./WarRoomAgentSeat";
import WarRoomHandoffOverlay from "./WarRoomHandoffOverlay";
import type { WarRoomHandoffState } from "../../lib/war-room-live";
import type { WarRoomSeatAgent } from "./war-room-shared";

export interface WarRoomTableCoreContent {
  label: string;
  name: string;
  status: string;
  task?: string | null;
  liveNote?: string | null;
}

export interface WarRoomTableProps {
  agents: WarRoomSeatAgent[];
  core: WarRoomTableCoreContent;
  handoff?: WarRoomHandoffState | null;
  handoffAgentNames?: string[];
  density?: "normal" | "cozy" | "compact";
  className?: string;
  shellClassName?: string;
  toolbar?: ReactNode;
  enableFullscreen?: boolean;
  renderSeat?: (agent: WarRoomSeatAgent, index: number, total: number) => ReactNode;
}

export default function WarRoomTable({
  agents,
  core,
  handoff = null,
  handoffAgentNames,
  density,
  className = "",
  shellClassName = "",
  toolbar,
  enableFullscreen = false,
  renderSeat,
}: WarRoomTableProps) {
  const { t } = useTranslation();
  const [fullscreen, setFullscreen] = useState(false);
  const totalAgents = agents.length;
  const resolvedDensity =
    density ?? (totalAgents > 16 ? "compact" : totalAgents > 12 ? "cozy" : "normal");

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const table = (
    <section
      className={`war-room-table ${className}`.trim()}
      data-density={resolvedDensity}
      aria-label={t("warRoom.tableAria")}
    >
      <div className="war-room-table-backdrop" aria-hidden>
        <div className="war-room-table-grid" />
      </div>
      <div className="war-room-table-stage">
        <div className="war-room-table-ring" aria-hidden />
        <div className="war-room-core">
          <p className="war-room-core-label">{core.label}</p>
          <p className="war-room-core-name">{core.name}</p>
          <p className="war-room-core-status">{core.status}</p>
          {core.task ? <p className="war-room-core-task">{core.task}</p> : null}
          {core.liveNote ? (
            <p className="war-room-core-note" role="status">
              <span className="war-room-pulse" aria-hidden /> {core.liveNote}
            </p>
          ) : null}
        </div>
        {handoff ? (
          <WarRoomHandoffOverlay
            handoff={handoff}
            agentNames={handoffAgentNames ?? agents.map((agent) => agent.name)}
          />
        ) : null}
        {agents.map((agent, index) =>
          renderSeat ? (
            renderSeat(agent, index, totalAgents)
          ) : (
            <WarRoomAgentSeat key={agent.id} agent={agent} index={index} total={totalAgents} />
          ),
        )}
      </div>
    </section>
  );

  if (!toolbar && !enableFullscreen) {
    return table;
  }

  return (
    <div className={`war-room-table-shell${fullscreen ? " is-fullscreen" : ""} ${shellClassName}`.trim()}>
      {(toolbar || enableFullscreen) && (
        <div className="war-room-table-toolbar">
          {toolbar ? <div className="war-room-table-toolbar-main">{toolbar}</div> : <span />}
          {enableFullscreen ? (
            <button
              type="button"
              className="war-room-fullscreen-btn"
              onClick={() => setFullscreen((prev) => !prev)}
              aria-pressed={fullscreen}
              aria-label={fullscreen ? t("warRoom.exitFullscreen") : t("warRoom.fullscreen")}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden />
              )}
              <span>{fullscreen ? t("warRoom.exitFullscreen") : t("warRoom.fullscreen")}</span>
            </button>
          ) : null}
        </div>
      )}
      {table}
    </div>
  );
}
