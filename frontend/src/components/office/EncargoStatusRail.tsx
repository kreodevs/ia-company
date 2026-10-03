import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Users } from "lucide-react";
import type { OfficeEncargoDetail } from "../../lib/api";
import StatusBadge from "../ui/StatusBadge";
import { encargoDepartmentLabel, encargoTeamLabels } from "../../lib/office-encargo-display";

interface Props { detail: OfficeEncargoDetail; }

export default function EncargoStatusRail({ detail }: Props) {
  const { t } = useTranslation();
  const workStatus = detail.phase === "delivered" ? "En revisión" : detail.phase === "failed" ? "Bloqueado" : detail.phase === "queued" ? "Planificando" : "En ejecución";
  const governanceStatus = detail.decisionProposal ? "Requiere decisión" : "Sin bloqueo de gobernanza";
  const financialStatus = detail.totalCostUsd > 0 ? `$${detail.totalCostUsd.toFixed(2)} consumidos` : "Sin consumo registrado";
  return (
    <aside className="office-encargo-status-rail" aria-label={t("office.statusRail.title")}>
      <section className="office-panel office-status-panel">
        <h2 className="office-panel-title">{t("office.statusRail.title")}</h2>
        <div className="office-status-rail-row"><span>{t("office.statusRail.business")}</span><strong>{workStatus}</strong></div>
        <div className="office-status-rail-row"><span>{t("office.statusRail.technical")}</span><StatusBadge status={detail.status} label={detail.status} /></div>
        <div className="office-status-rail-row"><span>{t("office.statusRail.governance")}</span><strong>{governanceStatus}</strong></div>
        <div className="office-status-rail-row"><span>{t("office.statusRail.financial")}</span><strong>{financialStatus}</strong></div>
      </section>
      <section className="office-panel office-status-panel">
        <h2 className="office-panel-title">{t("office.statusRail.ownership")}</h2>
        <dl className="office-status-rail-dl">
          <div><dt>{t("office.encargos.department")}</dt><dd>{detail.departmentHref ? <Link to={detail.departmentHref}>{encargoDepartmentLabel(detail, t)}</Link> : encargoDepartmentLabel(detail, t)}</dd></div>
          <div><dt>{t("office.statusRail.responsible")}</dt><dd>{detail.teamAgents[0]?.replace(/-/g, " ") ?? t("office.statusRail.unassigned")}</dd></div>
          <div><dt>{t("office.statusRail.participants")}</dt><dd>{detail.teamAgents.length ? encargoTeamLabels(detail.teamAgents, t) : t("office.statusRail.none")}</dd></div>
          <div><dt>{t("office.statusRail.next")}</dt><dd>{detail.nextAction ?? t("office.statusRail.noNext")}</dd></div>
        </dl>
      </section>
    </aside>
  );
}

export function EncargoBlockersPanel({ detail }: Props) {
  const { t } = useTranslation();
  const decisionPending =
    detail.decisionProposal?.status === "pending_review" ||
    detail.decisionProposal?.status === "drilling";
  const blockers: string[] = [];
  if (detail.phase === "failed") blockers.push(t("office.statusRail.blockerFailed"));
  if (decisionPending) blockers.push(t("office.statusRail.blockerDecision"));
  if (blockers.length === 0) return null;
  return (
    <section className="office-panel office-encargo-blockers">
      <h2 className="office-panel-title">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {t("office.statusRail.blockersTitle")}
      </h2>
      <ul className="office-blockers-list">
        {blockers.map((blocker) => (
          <li key={blocker}>{blocker}</li>
        ))}
      </ul>
    </section>
  );
}

export function EncargoParticipantsPanel({ detail }: Props) {
  const { t } = useTranslation();
  if (detail.teamAgents.length === 0) return null;
  return (
    <section className="office-panel office-encargo-participants">
      <h2 className="office-panel-title">
        <Users className="h-4 w-4" aria-hidden />
        {t("office.statusRail.participantsTitle")}
      </h2>
      <div className="office-participants-list">
        {detail.teamAgents.map((agent) => (
          <span key={agent} className="office-participant-chip">
            {agent.replace(/-/g, " ")}
          </span>
        ))}
      </div>
    </section>
  );
}
