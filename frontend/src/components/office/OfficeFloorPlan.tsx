import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { OfficeDepartmentRoom, OfficeDashboard } from "../../lib/api";
import { AGENT_EMOJI, avatarGradient } from "../../lib/office-visual";

interface OfficeFloorPlanProps {
  departments: OfficeDepartmentRoom[];
  agents: OfficeDashboard["agents"];
  onSelectDepartment?: (dept: OfficeDepartmentRoom) => void;
}

function departmentTitle(
  dept: OfficeDepartmentRoom,
  t: (key: string) => string,
): string {
  if (dept.kind === "org_unit" && dept.name) return dept.name;
  if (dept.labelKey) return t(dept.labelKey);
  return dept.slug;
}

function departmentDesc(dept: OfficeDepartmentRoom, t: (key: string) => string): string {
  if (dept.kind === "org_unit") return dept.description ?? t("office.floor.customDept");
  if (dept.descKey) return t(dept.descKey);
  return "";
}

export default function OfficeFloorPlan({
  departments,
  agents,
  onSelectDepartment,
}: OfficeFloorPlanProps) {
  const { t } = useTranslation();

  const virtualRooms = departments.filter((d) => d.kind === "virtual");
  const orgRooms = departments.filter((d) => d.kind === "org_unit");
  const busyTotal = departments.filter((d) => d.status === "busy").length;

  return (
    <section className="office-floor" aria-label={t("office.floor.title")}>
      <div className="office-floor-header">
        <div>
          <h2 className="office-panel-title">{t("office.floor.title")}</h2>
          <p className="office-floor-subtitle">{t("office.floor.subtitle")}</p>
        </div>
        <div className="office-floor-meta">
          <span className="office-floor-stat">
            {t("office.floor.roomCount", { count: departments.length })}
          </span>
          {busyTotal > 0 ? (
            <span className="office-floor-stat" data-active>
              {t("office.floor.activeCount", { count: busyTotal })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="office-floor-layout">
        <Link to="#office-coordinator-chat" className="office-reception-card">
          <span className="office-reception-emoji" aria-hidden>
            🎩
          </span>
          <div>
            <p className="office-reception-label">{t("office.chat.coordinatorName")}</p>
            <p className="office-reception-desc">{t("office.floor.receptionHint")}</p>
          </div>
          <span className="office-reception-cta">{t("office.floor.talk")} →</span>
        </Link>

        <div className="office-floor-rooms">
          {virtualRooms.map((dept) => (
            <DepartmentRoomCard
              key={dept.id}
              dept={dept}
              agents={agents}
              title={departmentTitle(dept, t)}
              description={departmentDesc(dept, t)}
              onSelect={onSelectDepartment}
            />
          ))}
        </div>
      </div>

      {orgRooms.length > 0 ? (
        <div className="office-floor-custom">
          <h3 className="office-floor-custom-title">{t("office.floor.customTitle")}</h3>
          <div className="office-floor-rooms office-floor-rooms-custom">
            {orgRooms.map((dept) => (
              <DepartmentRoomCard
                key={dept.id}
                dept={dept}
                agents={agents}
                title={departmentTitle(dept, t)}
                description={departmentDesc(dept, t)}
                onSelect={onSelectDepartment}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="office-floor-custom-empty">
          {t("office.floor.customEmpty")}{" "}
          <Link to="/org-studio" className="office-link-inline">
            {t("office.floor.createDept")}
          </Link>
        </p>
      )}
    </section>
  );
}

function DepartmentRoomCard({
  dept,
  agents,
  title,
  description,
  onSelect,
}: {
  dept: OfficeDepartmentRoom;
  agents: OfficeDashboard["agents"];
  title: string;
  description: string;
  onSelect?: (dept: OfficeDepartmentRoom) => void;
}) {
  const { t } = useTranslation();
  const deptAgents = agents.filter((a) => dept.agentNames.includes(a.name));
  const busyCount = deptAgents.filter((a) => a.status === "busy").length;

  const inner = (
    <>
      <div className="office-room-head">
        <span className="office-room-emoji" aria-hidden>
          {dept.emoji}
        </span>
        <span className="office-room-status" data-status={dept.status} title={t(`office.agents.${dept.status === "busy" ? "busy" : "idle"}`)} />
      </div>
      <p className="office-room-name">{title}</p>
      {description ? <p className="office-room-desc">{description}</p> : null}
      <div className="office-room-roster" aria-hidden>
        {dept.agentNames.slice(0, 5).map((name) => (
          <span
            key={name}
            className="office-room-agent-dot"
            data-status={deptAgents.find((a) => a.name === name)?.status ?? "idle"}
            style={{ background: avatarGradient(name) }}
          >
            {AGENT_EMOJI[name] ?? "🧑‍💼"}
          </span>
        ))}
      </div>
      <p className="office-room-meta">
        {dept.status === "busy"
          ? t("office.floor.busyMeta", {
              busy: busyCount || dept.busyAgentCount,
              total: dept.agentNames.length,
              procedures: dept.procedureCount ?? 0,
            })
          : t("office.floor.idleMeta", {
              total: dept.agentNames.length,
              procedures: dept.procedureCount ?? 0,
            })}
      </p>
      {dept.activeEncargoHref ? (
        <span className="office-room-active-link">{t("office.floor.viewEncargo")} →</span>
      ) : (
        <span className="office-room-enter">{t("office.floor.enter")} →</span>
      )}
    </>
  );

  const className = `office-room-card office-room-${dept.accent}${dept.status === "busy" ? " office-room-active" : ""}`;

  if (onSelect) {
    return (
      <button type="button" className={className} onClick={() => onSelect(dept)}>
        {inner}
      </button>
    );
  }

  return (
    <Link to={dept.href} className={className}>
      {inner}
    </Link>
  );
}
