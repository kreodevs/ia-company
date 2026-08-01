import { useTranslation } from "react-i18next";
import { AGENT_EMOJI, agentDisplayLabel, avatarGradient } from "../../lib/office-visual";
import { positionOnCircle } from "./war-room-shared";

export interface WarRoomIdleSeat {
  id: string;
  name: string;
  role?: string | null;
  status: "idle" | "busy";
  provisioned?: boolean;
}

interface WarRoomIdleSeatsProps<T extends WarRoomIdleSeat> {
  seats: T[];
  onSeatClick?: (seat: T) => void;
  radiusPct?: number;
  className?: string;
  emptyMessage?: string;
}

export default function WarRoomIdleSeats<T extends WarRoomIdleSeat>({
  seats,
  onSeatClick,
  radiusPct = 38,
  className = "",
  emptyMessage,
}: WarRoomIdleSeatsProps<T>) {
  const { t } = useTranslation();

  if (seats.length === 0) {
    return emptyMessage ? <p className="office-empty">{emptyMessage}</p> : null;
  }

  return (
    <div className={`office-dept-table war-room-idle-seats ${className}`.trim()}>
      <div className="office-dept-table-core" aria-hidden />
      {seats.map((agent, index) => {
        const { x, y } = positionOnCircle(index, Math.max(seats.length, 1), radiusPct);
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
  );
}
