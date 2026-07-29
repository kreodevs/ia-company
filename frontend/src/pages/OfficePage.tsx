import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  api,
  type OfficeDashboard,
  type OfficeServiceTemplate,
} from "../lib/api";
import CoordinatorChat from "../components/office/CoordinatorChat";
import OfficeFloorPlan from "../components/office/OfficeFloorPlan";
import OfficeOnboardingPanel, {
  dismissOfficeOnboarding,
  shouldShowOfficeOnboarding,
} from "../components/office/OfficeOnboardingPanel";
import { NotificationPermissionPrompt } from "../components/office/NotificationBell";
import PageLoading from "../components/ui/PageLoading";
import KpiCard from "../components/ui/KpiCard";

export default function OfficePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<OfficeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgUnitId, setOrgUnitId] = useState<string>("");
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const refresh = useCallback(async () => {
    const [dash, units] = await Promise.all([
      api.office.dashboard(),
      api.orgUnits.list().catch(() => []),
    ]);
    setDashboard(dash);
    setOrgUnits(units.map((u) => ({ id: u.id, name: u.name })));
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const fromUrl = searchParams.get("orgUnitId");
    if (fromUrl) setOrgUnitId(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (dashboard) {
      setShowOnboarding(shouldShowOfficeOnboarding(dashboard));
    }
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard?.stats.activeRuns) return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [dashboard?.stats.activeRuns, refresh]);

  const spendPct = useMemo(() => {
    if (!dashboard) return 0;
    const limit = dashboard.usage.limits.maxCostUsdPerMonth;
    if (!limit) return 0;
    return Math.min(100, (dashboard.usage.totalCostUsd / limit) * 100);
  }, [dashboard]);

  const portfolioRoi = useMemo(() => {
    if (!dashboard) return null;
    const { totalInvestedUsd, totalRevenueUsd } = dashboard.stats;
    if (totalInvestedUsd <= 0) return null;
    return Math.round(((totalRevenueUsd - totalInvestedUsd) / totalInvestedUsd) * 100);
  }, [dashboard]);

  const pickService = (service: OfficeServiceTemplate) => {
    setServiceId(service.id);
    setChatSeed(t(service.examplePromptKey as "office.serviceTemplates.marketScan.example"));
  };

  if (loading || !dashboard) {
    return <PageLoading message={t("office.loading")} />;
  }

  return (
    <div className="office-page">
      <header className="office-header">
        <div>
          <p className="office-eyebrow">{t("office.eyebrow")}</p>
          <h1 className="office-title">{t("office.title")}</h1>
          <p className="office-subtitle">{t("office.subtitle")}</p>
        </div>
        <div className="office-header-actions">
          <div
            className="office-mode-pill"
            data-mode={dashboard.mode}
            title={t(`office.modeHint.${dashboard.mode}`)}
          >
            <span aria-hidden>●</span>
            {t(`office.mode.${dashboard.mode}`)}
          </div>
          <Link to="/office/encargos" className="office-link-btn">
            {t("nav.encargos")}
          </Link>
          <Link to="/office/archive" className="office-link-btn">
            {t("office.archive.title")}
          </Link>
        </div>
      </header>

      <NotificationPermissionPrompt />

      {showOnboarding && (
        <OfficeOnboardingPanel
          dashboard={dashboard}
          onDismiss={() => {
            dismissOfficeOnboarding();
            setShowOnboarding(false);
          }}
        />
      )}

      <section className="office-hero-strip hero-strip">
        <KpiCard
          label={t("office.kpis.spend")}
          value={`$${dashboard.usage.totalCostUsd.toFixed(2)}`}
          delta={
            dashboard.usage.limits.maxCostUsdPerMonth
              ? t("office.kpis.spendLimit", {
                  limit: dashboard.usage.limits.maxCostUsdPerMonth.toFixed(0),
                })
              : t("office.kpis.noLimit")
          }
          trend={spendPct > 80 ? "up" : "flat"}
        />
        <KpiCard
          label={t("office.kpis.activeRuns")}
          value={dashboard.stats.activeRuns}
          trend={dashboard.stats.activeRuns > 0 ? "up" : "flat"}
        />
        <KpiCard
          label={t("office.kpis.pendingDecisions")}
          value={dashboard.stats.pendingDecisions}
          trend={dashboard.stats.pendingDecisions > 0 ? "up" : "down"}
        />
        <KpiCard
          label={t("office.kpis.agents")}
          value={dashboard.stats.agentsTotal}
          delta={`${dashboard.agents.filter((a) => a.status === "busy").length} ${t("office.agents.busy").toLowerCase()}`}
        />
        <KpiCard
          label={t("office.kpis.roi")}
          value={
            portfolioRoi != null
              ? `${portfolioRoi >= 0 ? "+" : ""}${portfolioRoi}%`
              : "—"
          }
          delta={
            portfolioRoi != null && portfolioRoi >= 0
              ? t("office.kpis.roiPositive")
              : t("office.kpis.roiNegative")
          }
          trend={portfolioRoi != null && portfolioRoi >= 0 ? "up" : "down"}
        />
      </section>

      <OfficeFloorPlan
        departments={dashboard.departments ?? []}
        agents={dashboard.agents}
      />

      <div className="office-grid">
        <aside className="office-panel">
          <h2 className="office-panel-title">{t("office.activity.title")}</h2>
          {dashboard.activity.length === 0 ? (
            <p className="office-empty">{t("office.activity.empty")}</p>
          ) : (
            <ul className="office-activity-list">
              {dashboard.activity.map((item) => {
                const inner = (
                  <>
                    <div className="office-activity-row">
                      <span className="office-activity-dot" data-type={item.type} aria-hidden />
                      <p className="office-activity-title">
                        {item.type === "decision_pending"
                          ? t("office.activity.decision_pending")
                          : item.title}
                      </p>
                    </div>
                    <p className="office-activity-meta">
                      {t(`office.activity.${item.type}`)} ·{" "}
                      {new Date(item.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {item.costUsd != null ? ` · $${item.costUsd.toFixed(2)}` : ""}
                    </p>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link to={item.href} className="office-activity-item">
                        {inner}
                      </Link>
                    ) : (
                      <div className="office-activity-item">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link to="/ai-team" className="office-roi-link">
            {t("office.agents.viewAll")}
          </Link>
        </aside>

        <section className="office-task-panel office-chat-panel" id="office-coordinator-chat">
          <div className="office-scope-bar">
            {orgUnits.length > 0 ? (
              <div className="office-scope-select-wrap">
                <label htmlFor="office-org">{t("office.task.orgUnitLabel")}</label>
                <select
                  id="office-org"
                  className="office-task-select"
                  value={orgUnitId}
                  onChange={(e) => setOrgUnitId(e.target.value)}
                >
                  <option value="">{t("office.task.orgUnitAny")}</option>
                  {orgUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <p className="office-scope-hint">
              {orgUnitId
                ? t("office.task.scopeOrgHint", {
                    name: orgUnits.find((u) => u.id === orgUnitId)?.name ?? "",
                  })
                : t("office.task.scopeCompanyHint")}
            </p>
          </div>
          <CoordinatorChat
            key={chatSeed ?? "default"}
            orgUnitId={orgUnitId || undefined}
            serviceId={serviceId}
            initialUserMessage={chatSeed}
            onExecuted={() => void refresh()}
          />
        </section>

        <aside className="office-panel">
          <h2 className="office-panel-title">{t("office.services.title")}</h2>
          <p className="office-panel-subtitle">{t("office.services.subtitle")}</p>
          <div className="office-services-grid">
            {dashboard.services.map((service) => (
              <button
                key={service.id}
                type="button"
                className="office-service-btn"
                data-active={serviceId === service.id}
                onClick={() => pickService(service)}
              >
                <span className="office-service-emoji" aria-hidden>
                  {service.emoji}
                </span>
                <span>
                  <p className="office-service-label">{t(service.labelKey as "office.serviceTemplates.marketScan.label")}</p>
                  <p className="office-service-desc">{t(service.descKey as "office.serviceTemplates.marketScan.desc")}</p>
                </span>
              </button>
            ))}
          </div>

          <h2 className="office-panel-title" style={{ marginTop: "1.35rem" }}>
            {t("office.roi.title")}
          </h2>
          <p className="office-panel-subtitle">{t("office.roi.subtitle")}</p>
          {dashboard.roi.length === 0 ? (
            <p className="office-empty">{t("office.roi.empty")}</p>
          ) : (
            <div className="office-roi-list">
              {dashboard.roi.map((item) => {
                const progress =
                  item.investedUsd > 0
                    ? Math.min(100, (item.revenueUsd / item.investedUsd) * 100)
                    : 0;
                return (
                  <div key={item.id} className="office-roi-item">
                    <div className="office-roi-header">
                      <p className="office-roi-name">{item.name}</p>
                      <span style={{ fontSize: "0.68rem", color: "#64748b" }}>{item.phase}</span>
                    </div>
                    <div className="office-roi-bar">
                      <div className="office-roi-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="office-roi-stats">
                      <span>
                        {t("office.roi.invested")}: ${item.investedUsd.toFixed(2)}
                      </span>
                      <span>
                        {t("office.roi.revenue")}: ${item.revenueUsd.toFixed(2)}
                      </span>
                    </div>
                    <p className="office-roi-stats" style={{ marginTop: "0.2rem" }}>
                      {t("office.roi.runs", { count: item.runsCount })}
                      {item.roiPct != null ? ` · ROI ${item.roiPct >= 0 ? "+" : ""}${item.roiPct}%` : ""}
                    </p>
                    <Link to={`/war-room/${item.id}`} className="office-roi-link">
                      {t("office.roi.viewProduct")} →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
