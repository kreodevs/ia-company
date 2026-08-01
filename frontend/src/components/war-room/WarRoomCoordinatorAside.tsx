import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useWarRoomCoordinatorCollapsed } from "./war-room-coordinator-state";

interface WarRoomCoordinatorAsideProps {
  titleId: string;
  panelId: string;
  subtitle: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  children: ReactNode;
}

export default function WarRoomCoordinatorAside({
  titleId,
  panelId,
  subtitle,
  collapsed,
  onToggleCollapsed,
  children,
}: WarRoomCoordinatorAsideProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={`war-room-coordinator war-room-coordinator-inline${collapsed ? " is-collapsed" : ""}`}
      aria-labelledby={titleId}
    >
      {collapsed ? (
        <button
          type="button"
          className="war-room-coordinator-expand"
          onClick={onToggleCollapsed}
          aria-label={t("warRoom.coordinator.expand")}
          aria-expanded={false}
          aria-controls={panelId}
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          <ChevronRight className="h-4 w-4" aria-hidden />
          <span className="war-room-coordinator-expand-label">{t("warRoom.coordinator.title")}</span>
        </button>
      ) : (
        <>
          <div className="war-room-coordinator-header">
            <h2 id={titleId} className="war-room-section-title">
              {t("warRoom.coordinator.title")}
            </h2>
            <button
              type="button"
              className="war-room-coordinator-collapse"
              onClick={onToggleCollapsed}
              aria-label={t("warRoom.coordinator.collapse")}
              aria-expanded
              aria-controls={panelId}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="war-room-coordinator-subtitle">{subtitle}</p>
          <div id={panelId} className="war-room-coordinator-panel">
            {children}
          </div>
        </>
      )}
    </aside>
  );
}

interface WarRoomMainShellProps {
  storageKey: string;
  titleId: string;
  panelId: string;
  subtitle: string;
  coordinator: ReactNode;
  children: ReactNode;
}

/** War room main row: collapsible coordinator aside + tactical table (or other main content). */
export function WarRoomMainShell({
  storageKey,
  titleId,
  panelId,
  subtitle,
  coordinator,
  children,
}: WarRoomMainShellProps) {
  const { collapsed, toggleCollapsed } = useWarRoomCoordinatorCollapsed(storageKey);

  return (
    <div className={`war-room-main${collapsed ? " war-room-main--coordinator-collapsed" : ""}`}>
      <WarRoomCoordinatorAside
        titleId={titleId}
        panelId={panelId}
        subtitle={subtitle}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {coordinator}
      </WarRoomCoordinatorAside>
      {children}
    </div>
  );
}
