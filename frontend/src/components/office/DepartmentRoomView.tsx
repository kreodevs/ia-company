import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AGENT_EMOJI, agentRoleLabelKey, avatarGradient } from "../../lib/office-visual";

export interface DepartmentRoomAgent {
  id: string;
  name: string;
  status: "idle" | "busy";
}

export interface DepartmentRoomViewProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  emoji?: string;
  status: "idle" | "busy";
  agentNames: string[];
  agents: DepartmentRoomAgent[];
  activeEncargoHref?: string | null;
  requestWorkHref?: string;
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  children?: ReactNode;
}

function positionOnCircle(index: number, total: number, radiusPct: number): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: 50 + Math.cos(angle) * radiusPct,
    y: 50 + Math.sin(angle) * radiusPct,
  };
}

export default function DepartmentRoomView({
  backHref,
  backLabel,
  title,
  subtitle,
  emoji = "🏢",
  status,
  agentNames,
  agents,
  activeEncargoHref,
  requestWorkHref = "/office#office-coordinator-chat",
  headerActions,
  sidebarFooter,
  children,
}: DepartmentRoomViewProps) {
  const { t } = useTranslation();

  const seats = agentNames.map((name) => {
    const agent = agents.find((a) => a.name === name);
    return {
      id: agent?.id ?? name,
      name,
      status: agent?.status ?? ("idle" as const),
    };
  });

  return (
    <div className="office-dept-page">
      <header className="office-dept-header">
        <Link to={backHref} className="office-dept-back">
          ← {backLabel}
        </Link>
        <div className="office-dept-title-row">
          <span className="office-dept-emoji" aria-hidden>
            {emoji}
          </span>
          <div>
            <h1 className="office-dept-title">{title}</h1>
            <p className="office-dept-subtitle">{subtitle}</p>
          </div>
          <span className="office-dept-status-pill" data-status={status}>
            {status === "busy" ? t("office.agents.busy") : t("office.agents.idle")}
          </span>
          {headerActions ? <div className="office-dept-header-actions">{headerActions}</div> : null}
        </div>
      </header>

      <div className="office-dept-grid">
        <section className="office-dept-war-room">
          <h2 className="office-panel-title">{t("office.floor.meetingRoom")}</h2>
          {seats.length === 0 ? (
            <p className="office-empty">{t("office.floor.noSpecialists")}</p>
          ) : (
            <div className="office-dept-table">
              <div className="office-dept-table-core" aria-hidden />
              {seats.map((agent, index) => {
                const { x, y } = positionOnCircle(index, Math.max(seats.length, 1), 38);
                return (
                  <div
                    key={agent.id}
                    className={`office-dept-seat office-dept-seat-${agent.status}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <div
                      className="office-dept-seat-avatar"
                      style={{ background: avatarGradient(agent.name) }}
                    >
                      <span aria-hidden>{AGENT_EMOJI[agent.name] ?? "🧑‍💼"}</span>
                    </div>
                    <p className="office-dept-seat-name">
                      {t(agentRoleLabelKey(agent.name) as "office.roles.research")}
                    </p>
                    <p className="office-dept-seat-status">
                      {agent.status === "busy" ? t("office.agents.busy") : t("office.agents.idle")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {activeEncargoHref ? (
            <Link to={activeEncargoHref} className="office-link-btn office-dept-encargo-link">
              {t("office.floor.viewEncargo")} →
            </Link>
          ) : (
            <Link to={requestWorkHref} className="office-link-btn office-dept-encargo-link">
              {t("office.floor.requestWork")} →
            </Link>
          )}
        </section>

        <aside className="office-dept-sidebar">
          <h2 className="office-panel-title">{t("office.floor.specialists")}</h2>
          {agentNames.length === 0 ? (
            <p className="office-empty">{t("office.floor.noSpecialists")}</p>
          ) : (
            <ul className="office-dept-specialist-list">
              {agentNames.map((name) => {
                const agent = agents.find((a) => a.name === name);
                return (
                  <li key={name} className="office-dept-specialist-item">
                    <span
                      className="office-dept-specialist-avatar"
                      style={{ background: avatarGradient(name) }}
                      aria-hidden
                    >
                      {AGENT_EMOJI[name] ?? "🧑‍💼"}
                    </span>
                    <div>
                      <p className="office-dept-specialist-name">
                        {t(agentRoleLabelKey(name) as "office.roles.research")}
                      </p>
                      <p className="office-dept-specialist-meta">
                        {agent?.status === "busy" ? t("office.agents.busy") : t("office.agents.idle")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {sidebarFooter}
        </aside>
      </div>

      {children ? <div className="office-dept-extras">{children}</div> : null}
    </div>
  );
}
