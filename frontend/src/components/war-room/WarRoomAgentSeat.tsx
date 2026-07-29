import { useTranslation } from "react-i18next";
import {
  avatarGradient,
  positionOnCircle,
  ROLE_EMOJI,
  seatRadiusPct,
  statusRingColor,
  type WarRoomSeatAgent,
} from "./war-room-shared";

function ThinkingDots() {
  return (
    <span className="war-room-typing" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

export default function WarRoomAgentSeat({
  agent,
  index,
  total,
}: {
  agent: WarRoomSeatAgent;
  index: number;
  total: number;
}) {
  const { t } = useTranslation();
  const radiusPct = seatRadiusPct(total);
  const { x, y } = positionOnCircle(index, total, radiusPct);
  const emoji = ROLE_EMOJI[agent.name] ?? "🧑‍💼";
  const ringColor = statusRingColor(agent.status);

  return (
    <div
      className={`war-room-seat war-room-seat-${agent.status}`}
      data-testid={`seat-${agent.name}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        ["--ring" as string]: ringColor,
      }}
      title={`${agent.name} — ${agent.role} (${t(`warRoom.status.${agent.status}`)})`}
    >
      <span className="war-room-seat-pill" aria-hidden>
        {agent.status === "thinking" && <ThinkingDots />}
        {agent.status === "queued" && <span className="war-room-seat-clock">⏳</span>}
      </span>
      <div className="war-room-seat-avatar" style={{ background: avatarGradient(agent.name) }}>
        <span className="war-room-seat-emoji" aria-hidden>
          {emoji}
        </span>
      </div>
      <p className="war-room-seat-name">{agent.name.replace(/-/g, " ")}</p>
      {agent.status === "thinking" && agent.currentTask && (
        <p className="war-room-seat-task">{agent.currentTask}</p>
      )}
    </div>
  );
}
