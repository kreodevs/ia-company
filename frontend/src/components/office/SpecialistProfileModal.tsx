import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Settings, X } from "lucide-react";
import { api, type OfficeArchiveItem, type OfficeEncargoSummary } from "../../lib/api";
import { encargoContextLine } from "../../lib/office-encargo-display";
import { AGENT_EMOJI, agentDisplayLabel, avatarGradient } from "../../lib/office-visual";
import type { DepartmentRoomAgent } from "./DepartmentRoomView";
import Button from "../ui/Button";

interface SpecialistProfileModalProps {
  agent: DepartmentRoomAgent;
  departmentTitle: string;
  departmentSlug?: string;
  orgUnitId?: string;
  onClose: () => void;
  onAssign: (agentName: string, prompt: string) => void;
}

export default function SpecialistProfileModal({
  agent,
  departmentTitle,
  departmentSlug,
  orgUnitId,
  onClose,
  onAssign,
}: SpecialistProfileModalProps) {
  const { t } = useTranslation();
  const label = agentDisplayLabel(agent, t);
  const prompt = t("office.specialists.assignPrompt", { name: label });
  const [recentEncargos, setRecentEncargos] = useState<OfficeEncargoSummary[]>([]);
  const [documents, setDocuments] = useState<OfficeArchiveItem[]>([]);

  useEffect(() => {
    api.office
      .encargos({
        limit: 30,
        departmentSlug,
        orgUnitId,
      })
      .then((response) => {
        setRecentEncargos(
          response.items.filter((item) => item.teamAgents.includes(agent.name)).slice(0, 4),
        );
      })
      .catch(() => setRecentEncargos([]));
  }, [agent.name, departmentSlug, orgUnitId]);

  useEffect(() => {
    api.office
      .archive({
        agentName: agent.name,
        departmentSlug,
        orgUnitId,
        limit: 6,
      })
      .then((response) => setDocuments(response.items.slice(0, 6)))
      .catch(() => setDocuments([]));
  }, [agent.name, departmentSlug, orgUnitId]);

  const statusLabel = useMemo(() => {
    if (!agent.provisioned) return t("office.floor.agentPending");
    if (agent.status === "busy") return t("office.agents.busy");
    return t("office.agents.idle");
  }, [agent.provisioned, agent.status, t]);

  return (
    <div className="office-specialist-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="office-specialist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-specialist-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="office-specialist-modal-head">
          <div className="office-specialist-modal-identity">
            <div
              className="office-specialist-modal-avatar"
              style={{ background: avatarGradient(agent.name) }}
            >
              <span aria-hidden>{AGENT_EMOJI[agent.name] ?? "🧑‍💼"}</span>
            </div>
            <div>
              <h2 id="office-specialist-modal-title" className="office-specialist-modal-title">
                {label}
              </h2>
              <p className="office-specialist-modal-subtitle">{departmentTitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="office-specialist-modal-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <dl className="office-specialist-modal-meta">
          <div>
            <dt>{t("office.specialists.status")}</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt>{t("office.specialists.department")}</dt>
            <dd>{departmentTitle}</dd>
          </div>
        </dl>

        <p className="office-specialist-modal-desc">{t("office.specialists.profileHint")}</p>

        <div className="office-specialist-modal-recent">
          <h3 className="office-specialist-modal-recent-title">
            {t("office.specialists.recentEncargos")}
          </h3>
          {recentEncargos.length === 0 ? (
            <p className="office-empty">{t("office.specialists.noRecentEncargos")}</p>
          ) : (
            <ul className="office-specialist-modal-recent-list">
              {recentEncargos.map((encargo) => (
                <li key={encargo.id}>
                  <Link to={`/office/encargos/${encargo.id}`} className="office-specialist-recent-item">
                    <span className="office-specialist-recent-title">{encargo.title}</span>
                    <span className="office-specialist-recent-meta">
                      {encargoContextLine(encargo, t)} · {t(`office.encargos.phase.${encargo.phase}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="office-specialist-modal-recent">
          <h3 className="office-specialist-modal-recent-title">
            {t("office.specialists.documents")}
          </h3>
          {documents.length === 0 ? (
            <p className="office-empty">{t("office.specialists.noDocuments")}</p>
          ) : (
            <ul className="office-specialist-modal-recent-list">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={doc.encargoHref ?? `/office/archive`}
                    className="office-specialist-recent-item"
                  >
                    <span className="office-specialist-recent-title">{doc.title}</span>
                    <span className="office-specialist-recent-meta">
                      {doc.encargoTitle ?? t(`office.archive.source.${doc.source}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="office-specialist-modal-actions">
          <Button
            size="sm"
            disabled={!agent.provisioned}
            onClick={() => {
              onAssign(agent.name, prompt);
              onClose();
            }}
          >
            {t("office.specialists.assign")}
          </Button>
          <Link to="/settings/specialists" className="office-link-btn office-link-btn-muted">
            <Settings className="h-3.5 w-3.5" aria-hidden />
            {t("office.specialists.configure")}
          </Link>
        </div>
      </div>
    </div>
  );
}
