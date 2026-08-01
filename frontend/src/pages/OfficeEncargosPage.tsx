import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Crosshair } from "lucide-react";
import { api, type OfficeEncargoPhase, type OfficeEncargoSummary } from "../lib/api";
import type { OrgUnit } from "../lib/org-types";
import {
  encargoContextLine,
  encargoTeamLabels,
  VIRTUAL_DEPARTMENT_SLUGS,
} from "../lib/office-encargo-display";
import PageLoading from "../components/ui/PageLoading";
import StatusBadge from "../components/ui/StatusBadge";
import Select from "../components/ui/Select";

const PHASE_FILTERS: Array<OfficeEncargoPhase | "all"> = [
  "all",
  "in_progress",
  "delivered",
  "failed",
  "queued",
  "cancelled",
];

export default function OfficeEncargosPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OfficeEncargoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<OfficeEncargoPhase | "all">("all");
  const [departmentSlug, setDepartmentSlug] = useState("");
  const [orgUnitId, setOrgUnitId] = useState("");
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

  useEffect(() => {
    api.orgUnits.list().then(setOrgUnits).catch(() => setOrgUnits([]));
  }, []);

  const refresh = useCallback(async () => {
    const res = await api.office.encargos({
      limit: 50,
      phase: phase === "all" ? undefined : phase,
      departmentSlug: departmentSlug || undefined,
      orgUnitId: orgUnitId || undefined,
    });
    setItems(res.items);
  }, [phase, departmentSlug, orgUnitId]);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const hasActive = items.some((item) => item.phase === "in_progress" || item.phase === "queued");
    if (!hasActive) return;
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [items, refresh]);

  if (loading) {
    return <PageLoading message={t("office.encargos.loading")} />;
  }

  return (
    <div className="office-page office-encargos-page">
      <header className="office-header">
        <div>
          <p className="office-eyebrow">{t("office.encargos.eyebrow")}</p>
          <h1 className="office-title">{t("office.encargos.title")}</h1>
          <p className="office-subtitle">{t("office.encargos.subtitle")}</p>
        </div>
        <Link to="/office" className="office-link-btn">
          {t("office.encargos.backToOffice")}
        </Link>
      </header>

      <div className="office-encargos-filters-row">
        <div className="office-encargos-filters" role="tablist" aria-label={t("office.encargos.filterLabel")}>
          {PHASE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={phase === filter}
              className={`office-encargos-filter ${phase === filter ? "office-encargos-filter-active" : ""}`}
              onClick={() => setPhase(filter)}
            >
              {t(`office.encargos.phase.${filter}`)}
            </button>
          ))}
        </div>
        <Select
          value={departmentSlug}
          onChange={(value) => {
            setDepartmentSlug(value);
            if (value) setOrgUnitId("");
          }}
          ariaLabel={t("office.encargos.filterDepartment")}
          className="office-encargos-dept-filter"
          size="sm"
          options={[
            { value: "", label: t("office.encargos.allDepartments") },
            ...VIRTUAL_DEPARTMENT_SLUGS.map((slug) => ({
              value: slug,
              label: t(`office.departments.${slug}.name` as "office.departments.strategy.name"),
            })),
          ]}
        />
        <Select
          value={orgUnitId}
          onChange={(value) => {
            setOrgUnitId(value);
            if (value) setDepartmentSlug("");
          }}
          ariaLabel={t("office.encargos.filterOrgUnit")}
          className="office-encargos-dept-filter"
          size="sm"
          options={[
            { value: "", label: t("office.encargos.allOrgUnits") },
            ...orgUnits.map((unit) => ({ value: unit.id, label: unit.name })),
          ]}
        />
      </div>

      {items.length === 0 ? (
        <div className="office-panel office-encargos-empty">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-sky-400/70" aria-hidden />
          <p className="office-empty">{t("office.encargos.empty")}</p>
          <Link to="/office" className="office-link-btn mt-4 inline-flex">
            {t("office.encargos.startFirst")}
          </Link>
        </div>
      ) : (
        <ul className="office-encargos-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/office/encargos/${item.id}`} className="office-encargo-card interactive">
                <div className="office-encargo-card-head">
                  <span className="office-encargo-phase" data-phase={item.phase}>
                    {t(`office.encargos.phase.${item.phase}`)}
                  </span>
                  <StatusBadge
                    status={item.status}
                    label={t(`status.${item.status}`, { defaultValue: item.status })}
                  />
                </div>
                <h2 className="office-encargo-card-title">{item.title}</h2>
                {item.request && item.request !== item.title ? (
                  <p className="office-encargo-card-request">{item.request}</p>
                ) : null}
                <div className="office-encargo-card-context">
                  <span className="office-encargo-context-chip">{encargoContextLine(item, t)}</span>
                </div>
                <div className="office-encargo-card-meta">
                  {item.productName ? <span>{item.productName}</span> : null}
                  <span>
                    {new Date(item.completedAt ?? item.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {item.totalCostUsd > 0 ? <span>${item.totalCostUsd.toFixed(2)}</span> : null}
                </div>
                {item.teamAgents.length > 0 ? (
                  <p className="office-encargo-card-team">
                    {t("office.encargos.team")}: {encargoTeamLabels(item.teamAgents, t)}
                  </p>
                ) : null}
                <div className="office-encargo-card-foot">
                  <span>
                    {item.documentCount > 0
                      ? t("office.encargos.documentsCount", { count: item.documentCount })
                      : t("office.encargos.noDocumentsYet")}
                  </span>
                  {item.productId && item.phase === "in_progress" ? (
                    <span className="office-encargo-war-link">
                      <Crosshair className="h-3.5 w-3.5" aria-hidden />
                      {t("office.encargos.watchWarRoom")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
