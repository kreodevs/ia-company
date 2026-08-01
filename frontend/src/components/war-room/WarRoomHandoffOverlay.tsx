import { useTranslation } from "react-i18next";
import type { WarRoomHandoffState } from "../../lib/war-room-live";
import { agentDisplayLabel } from "../../lib/office-visual";
import { positionOnCircle, seatRadiusPct } from "./war-room-shared";

interface WarRoomHandoffOverlayProps {
  handoff: WarRoomHandoffState | null;
  agentNames: string[];
}

function seatPosition(index: number, total: number) {
  const radiusPct = seatRadiusPct(total);
  return positionOnCircle(index, total, radiusPct);
}

export default function WarRoomHandoffOverlay({ handoff, agentNames }: WarRoomHandoffOverlayProps) {
  const { t } = useTranslation();

  if (!handoff?.toAgentName) return null;

  const toIndex = agentNames.indexOf(handoff.toAgentName);
  const fromIndex = handoff.fromAgentName ? agentNames.indexOf(handoff.fromAgentName) : -1;
  if (toIndex < 0) return null;

  const toPos = seatPosition(toIndex, agentNames.length);
  const fromPos = fromIndex >= 0 ? seatPosition(fromIndex, agentNames.length) : null;

  return (
    <div className="war-room-handoff-overlay" aria-live="polite">
      <p className="war-room-handoff-banner">
        {handoff.fromAgentName && fromIndex >= 0
          ? t("warRoom.handoff.fromTo", {
              from: agentDisplayLabel({ name: handoff.fromAgentName }, t),
              to: agentDisplayLabel({ name: handoff.toAgentName }, t),
            })
          : t("warRoom.handoff.toAgent", {
              name: agentDisplayLabel({ name: handoff.toAgentName }, t),
            })}
      </p>
      <div
        className="war-room-handoff-pulse"
        style={{ left: `${toPos.x}%`, top: `${toPos.y}%` }}
        aria-hidden
      />
      {fromPos ? (
        <div
          className="war-room-handoff-pulse war-room-handoff-pulse-out"
          style={{ left: `${fromPos.x}%`, top: `${fromPos.y}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
