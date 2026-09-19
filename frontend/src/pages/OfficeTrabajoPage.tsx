import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OfficeEncargoDetail } from "../lib/api";
import OfficeEncargoLivePanel from "../components/office/OfficeEncargoLivePanel";
import PageLoading from "../components/ui/PageLoading";
import OfficeEncargosPage, { type EncargosPageMode } from "./OfficeEncargosPage";
import PendingDecisionsPage from "./PendingDecisionsPage";

type TrabajoTab = "activos" | "pendientes" | "entregados" | "cancelados" | "todos";
type DecisionInboxTab = "pending" | "approved" | "rejected";

const TRABAJO_TABS: TrabajoTab[] = ["activos", "pendientes", "entregados", "cancelados", "todos"];

function parseTrabajoTab(value: string | null): TrabajoTab {
  if (value && TRABAJO_TABS.includes(value as TrabajoTab)) return value as TrabajoTab;
  return "activos";
}

function parseDecisionTab(value: string | null): DecisionInboxTab {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

function tabToFixedPhase(tab: TrabajoTab): EncargosPageMode | null {
  switch (tab) {
    case "activos":
      return "active";
    case "entregados":
      return "delivered";
    case "cancelados":
      return "closed";
    case "todos":
      return "all";
    default:
      return null;
  }
}

export default function OfficeTrabajoPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTrabajoTab(searchParams.get("tab"));
  const watchRunId = searchParams.get("run")?.trim() || null;
  const decisionTab = parseDecisionTab(searchParams.get("decisionTab"));
  const [highlightEncargo, setHighlightEncargo] = useState<OfficeEncargoDetail | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);

  const setTab = (next: TrabajoTab) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", next);
      if (next !== "activos") params.delete("run");
      if (next !== "pendientes") params.delete("decisionTab");
      return params;
    });
  };

  const setWatchRun = useCallback(
    (runId: string | null) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", "activos");
        if (runId) params.set("run", runId);
        else params.delete("run");
        return params;
      });
    },
    [setSearchParams],
  );

  const setDecisionInboxTab = (next: DecisionInboxTab) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("tab", "pendientes");
      if (next === "pending") params.delete("decisionTab");
      else params.set("decisionTab", next);
      return params;
    });
  };

  useEffect(() => {
    if (!watchRunId || tab !== "activos") {
      setHighlightEncargo(null);
      return;
    }
    let cancelled = false;
    setLoadingRun(true);
    api.office
      .encargo(watchRunId)
      .then((detail) => {
        if (!cancelled) setHighlightEncargo(detail);
      })
      .catch(() => {
        if (!cancelled) setHighlightEncargo(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRun(false);
      });
    return () => {
      cancelled = true;
    };
  }, [watchRunId, tab]);

  const fixedPhase = useMemo(() => tabToFixedPhase(tab), [tab]);
  const showLivePanel = tab === "activos" && watchRunId && highlightEncargo;

  return (
    <div className="office-page office-trabajo-page">
      <header className="office-header">
        <div>
          <p className="office-eyebrow">{t("office.trabajo.eyebrow")}</p>
          <h1 className="office-title">{t("office.trabajo.title")}</h1>
          <p className="office-subtitle">{t("office.trabajo.subtitle")}</p>
        </div>
        <div className="office-header-actions">
          <Link to="/office" className="office-link-btn">
            {t("office.trabajo.backToOffice")}
          </Link>
        </div>
      </header>

      <div
        className="office-encargos-filters office-trabajo-tabs"
        role="tablist"
        aria-label={t("office.trabajo.tabsLabel")}
      >
        {TRABAJO_TABS.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={tab === filter}
            className={`office-encargos-filter ${tab === filter ? "office-encargos-filter-active" : ""}`}
            onClick={() => setTab(filter)}
          >
            {t(`office.trabajo.tabs.${filter}`)}
          </button>
        ))}
      </div>

      {tab === "pendientes" ? (
        <PendingDecisionsPage
          embedded
          inboxTab={decisionTab}
          onInboxTabChange={setDecisionInboxTab}
        />
      ) : (
        <div className={`office-trabajo-layout ${showLivePanel ? "office-trabajo-layout-split" : ""}`}>
          <div className="office-trabajo-list">
            <OfficeEncargosPage
              embedded
              fixedPhase={fixedPhase ?? "all"}
              hidePhaseFilters
              highlightRunId={watchRunId}
              onHighlightRun={setWatchRun}
            />
          </div>
          {showLivePanel && highlightEncargo ? (
            <aside className="office-trabajo-live">
              <OfficeEncargoLivePanel
                runId={highlightEncargo.id}
                title={highlightEncargo.title}
                phase={highlightEncargo.phase}
                departmentSlug={highlightEncargo.departmentSlug}
                orgUnitId={highlightEncargo.orgUnitId}
                productId={highlightEncargo.productId}
                productName={highlightEncargo.productName}
                warRoomHref={highlightEncargo.warRoomHref}
                teamAgents={highlightEncargo.teamAgents}
              />
            </aside>
          ) : loadingRun && watchRunId ? (
            <aside className="office-trabajo-live">
              <PageLoading message={t("office.encargos.loadingDetail")} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  );
}
