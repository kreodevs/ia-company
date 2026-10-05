import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Crosshair,
  Inbox,
  LayoutDashboard,
  Brain,
  Network,
  ClipboardCheck,
} from "lucide-react";
import { api, type OfficeDashboard, type OfficeServiceTemplate } from "../lib/api";
import { encargoContextLine } from "../lib/office-encargo-display";
import { officeActivosHref } from "../lib/office-trabajo-links";
import CoordinatorChat from "../components/office/CoordinatorChat";
import OfficeFloorPlan from "../components/office/OfficeFloorPlan";
import OfficeOnboardingPanel, {
  dismissOfficeOnboarding,
  shouldShowOfficeOnboarding,
} from "../components/office/OfficeOnboardingPanel";
import OfficePulseDrawer from "../components/office/OfficePulseDrawer";
import OfficeRecentArchive from "../components/office/OfficeRecentArchive";
import OfficeCompanyMemoryPanel from "../components/office/OfficeCompanyMemoryPanel";
import OfficeReceptionOverlay from "../components/office/OfficeReceptionOverlay";
import OfficeHomeAccordion from "../components/office/OfficeHomeAccordion";
import OfficeScopeBar from "../components/office/OfficeScopeBar";
import { DEPARTMENT_SCOPE_GENERAL } from "../components/office/DepartmentRoomView";
import { NotificationPermissionPrompt } from "../components/office/NotificationBell";
import PageLoading from "../components/ui/PageLoading";
import PageFrame from "../components/ui/PageFrame";
import { cn } from "../lib/utils";

export default function OfficePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [dashboard, setDashboard] = useState<OfficeDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgUnitId, setOrgUnitId] = useState("");
  const [productScope, setProductScope] = useState(DEPARTMENT_SCOPE_GENERAL);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [chatSeed, setChatSeed] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);

  const revisionContext = useMemo(() => {
    const parentRunId = searchParams.get("parentRunId")?.trim() || undefined;
    const productId = searchParams.get("productId")?.trim() || undefined;
    const state = location.state as {
      revisionFeedback?: string;
      encargoTitle?: string;
      deskCoordinatorSeed?: string;
      deskItemTitle?: string;
    } | null;
    const feedback = state?.revisionFeedback?.trim();
    if (feedback && parentRunId) {
      const title = state?.encargoTitle?.trim();
      const header = title
        ? t("office.revision.initialMessageWithTitle", { title, runId: parentRunId })
        : t("office.revision.initialMessage", { runId: parentRunId });
      return {
        parentRunId,
        productId,
        initialMessage: `${header}\n\n${feedback}`,
      };
    }
    const deskSeed = state?.deskCoordinatorSeed?.trim();
    if (deskSeed) {
      const deskTitle = state?.deskItemTitle?.trim();
      const header = deskTitle
        ? t("office.deskBridge.initialMessageWithTitle", { title: deskTitle })
        : t("office.deskBridge.initialMessage");
      return {
        parentRunId,
        productId,
        initialMessage: `${header}\n\n${deskSeed}`,
      };
    }
    return { parentRunId, productId, initialMessage: null as string | null };
  }, [location.state, searchParams, t]);

  const resolvedProductId = useMemo(() => {
    if (revisionContext.productId) return revisionContext.productId;
    if (productScope === DEPARTMENT_SCOPE_GENERAL) return undefined;
    return productScope;
  }, [productScope, revisionContext.productId]);

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
    const fromProduct = searchParams.get("productId");
    if (fromProduct) setProductScope(fromProduct);
  }, [searchParams]);

  useEffect(() => {
    if (revisionContext.initialMessage) {
      setChatSeed(revisionContext.initialMessage);
    }
  }, [revisionContext.initialMessage]);

  useEffect(() => {
    if (dashboard) {
      setShowOnboarding(shouldShowOfficeOnboarding(dashboard));
    }
  }, [dashboard]);

  useEffect(() => {
    if (!dashboard?.stats?.activeRuns) return;
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [dashboard?.stats?.activeRuns, refresh]);

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

  const activosHref = useMemo(
    () => (dashboard ? officeActivosHref(dashboard) : "/office/trabajo?tab=activos"),
    [dashboard],
  );

  const pickService = (service: OfficeServiceTemplate) => {
    setServiceId(service.id);
    setChatSeed(t(service.examplePromptKey as "office.serviceTemplates.marketScan.example"));
    setReceptionOpen(true);
  };

  const openReception = () => {
    setReceptionOpen(true);
    document.getElementById("office-coordinator-chat")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading || !dashboard) {
    return <PageLoading message={t("office.loading")} />;
  }

  const chatKey = chatSeed ?? revisionContext.parentRunId ?? "default";

  return (
    <PageFrame width="office" className="office-page office-page-home">
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
        </div>
      </header>

      <section className="office-home-today" aria-labelledby="office-home-today-title">
        <div className="office-home-today-intro">
          <h2 id="office-home-today-title" className="office-home-section-title">
            {t("office.homeToday.title")}
          </h2>
          <p className="office-home-section-desc">{t("office.homeToday.subtitle")}</p>
        </div>
        <div className="office-home-metrics" role="list" aria-label={t("office.homeToday.metricsAria")}>
          <Link
            to={activosHref}
            role="listitem"
            className={cn(
              "office-home-metric interactive",
              dashboard.stats.activeRuns > 0 && "office-home-metric--live",
            )}
          >
            <span className="office-home-metric-value tabular-nums">{dashboard.stats.activeRuns}</span>
            <span className="office-home-metric-label">{t("office.homeHero.activeRuns")}</span>
          </Link>
          <Link
            to="/office/inbox"
            role="listitem"
            className={cn(
              "office-home-metric interactive",
              dashboard.stats.pendingDecisions > 0 && "office-home-metric--attention",
            )}
          >
            <span className="office-home-metric-value tabular-nums">{dashboard.stats.pendingDecisions}</span>
            <span className="office-home-metric-label">{t("office.homeHero.pendingDecisions")}</span>
          </Link>
          <Link to="#office-home-explore" role="listitem" className="office-home-metric interactive">
            <span className="office-home-metric-value tabular-nums">
              {dashboard.departments?.length ?? 0}
            </span>
            <span className="office-home-metric-label">{t("office.homeHero.departments")}</span>
          </Link>
        </div>
        <div className="office-home-today-grid">
          <Link
            to="/office/inbox"
            className={cn(
              "office-home-action-card interactive",
              dashboard.stats.pendingDecisions > 0 && "office-home-action-card--attention",
            )}
          >
            <Inbox className="office-home-action-icon" aria-hidden />
            <span className="office-home-action-body">
              <span className="office-home-action-title">{t("office.homeToday.inboxTitle")}</span>
              <span className="office-home-action-desc">
                {dashboard.stats.pendingDecisions > 0
                  ? t("office.homeToday.inboxDesc", { count: dashboard.stats.pendingDecisions })
                  : t("office.homeToday.inboxDescEmpty")}
              </span>
            </span>
            {dashboard.stats.pendingDecisions > 0 ? (
              <span className="office-home-action-metric tabular-nums">{dashboard.stats.pendingDecisions}</span>
            ) : null}
          </Link>
          <Link to={activosHref} className="office-home-action-card interactive">
            <ClipboardList className="office-home-action-icon" aria-hidden />
            <span className="office-home-action-body">
              <span className="office-home-action-title">{t("office.homeToday.trabajoTitle")}</span>
              <span className="office-home-action-desc">
                {dashboard.stats.activeRuns > 0
                  ? t("office.homeToday.trabajoDesc", { count: dashboard.stats.activeRuns })
                  : t("office.homeToday.trabajoDescEmpty")}
              </span>
            </span>
            {dashboard.stats.activeRuns > 0 ? (
              <span className="office-home-action-metric tabular-nums">{dashboard.stats.activeRuns}</span>
            ) : null}
          </Link>
          <Link to="/office/memoria" className="office-home-action-card interactive">
            <Brain className="office-home-action-icon" aria-hidden />
            <span className="office-home-action-body">
              <span className="office-home-action-title">{t("office.homeToday.memoriaTitle")}</span>
              <span className="office-home-action-desc">{t("office.homeToday.memoriaDesc")}</span>
            </span>
          </Link>
        </div>
        <nav className="office-home-strategy" aria-label={t("office.homeToday.strategyAria")}>
          <span className="office-home-strategy-label">{t("office.homeToday.strategyTitle")}</span>
          <div className="office-home-strategy-links">
            <Link to="/office/dashboard" className="office-home-strategy-link interactive">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              {t("nav.dashboard")}
            </Link>
            <Link to="/office/objetivos" className="office-home-strategy-link interactive">
              <Crosshair className="h-3.5 w-3.5" aria-hidden />
              {t("nav.objectives")}
            </Link>
            <Link to="/office/organigrama" className="office-home-strategy-link interactive">
              <Network className="h-3.5 w-3.5" aria-hidden />
              {t("nav.organigram")}
            </Link>
            <Link to="/office/iniciativas" className="office-home-strategy-link interactive">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
              {t("nav.initiatives")}
            </Link>
          </div>
        </nav>
      </section>

      <NotificationPermissionPrompt />

      {showOnboarding && (
        <OfficeOnboardingPanel
          dashboard={dashboard}
          customDeptCount={orgUnits.length}
          virtualDeptCount={dashboard.departments?.length ?? 0}
          onDismiss={() => {
            dismissOfficeOnboarding();
            setShowOnboarding(false);
          }}
        />
      )}

      <section className="office-lobby office-home-lobby" aria-label={t("office.lobby.title")}>
        <div className="office-lobby-main">
          <section className="office-task-panel office-chat-panel" id="office-coordinator-chat">
            <div className="office-lobby-chat-header">
              <h2 className="office-panel-title">{t("office.chat.coordinatorName")}</h2>
              <button
                type="button"
                className="office-link-btn"
                onClick={() => setReceptionOpen(true)}
              >
                {t("office.reception.expand")} →
              </button>
            </div>
            <OfficeScopeBar
              orgUnitId={orgUnitId}
              onOrgUnitChange={setOrgUnitId}
              orgUnits={orgUnits}
              productId={productScope}
              onProductChange={setProductScope}
            />
            <CoordinatorChat
              key={chatKey}
              orgUnitId={orgUnitId || undefined}
              productId={resolvedProductId}
              parentRunId={revisionContext.parentRunId}
              serviceId={serviceId}
              initialUserMessage={chatSeed}
              welcomeMessageKey={
                revisionContext.parentRunId ? "office.revision.welcome" : undefined
              }
              onExecuted={() => void refresh()}
            />
          </section>
        </div>

        <aside className="office-lobby-aside" aria-label={t("office.lobby.asideTitle")}>
          <p className="office-lobby-aside-heading">{t("office.lobby.asideTitle")}</p>
          <OfficeCompanyMemoryPanel compact />
          <OfficeRecentArchive />
          <div className="office-panel office-lobby-activity">
            <h2 className="office-panel-title">{t("office.activity.title")}</h2>
            {dashboard.activity.length === 0 ? (
              <div className="office-empty-hero">
                <p className="office-empty-hero-title">{t("office.homeHero.emptyActivityTitle")}</p>
                <p className="office-empty-hero-desc">{t("office.homeHero.emptyActivityDescription")}</p>
              </div>
            ) : (
              <ul className="office-activity-list">
                {dashboard.activity.slice(0, 6).map((item) => {
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
                        {item.procedureLabel ? `${encargoContextLine(item, t)} · ` : ""}
                        {t(`office.activity.${item.type}`)} ·{" "}
                        {new Date(item.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
            <Link to="/office/trabajo" className="office-roi-link">
              {t("nav.trabajo")} →
            </Link>
          </div>
        </aside>
      </section>

      <OfficeHomeAccordion
        sectionId="explore"
        className="office-home-explore"
        title={t("office.homeToday.exploreTitle")}
        description={
          <>
            {t("office.homeToday.exploreSubtitle")}
            <span className="office-home-explore-meta">
              · {t("office.homeToday.departmentCount", { count: dashboard.departments?.length ?? 0 })}
            </span>
          </>
        }
      >
        <OfficeFloorPlan
          departments={dashboard.departments ?? []}
          agents={dashboard.agents}
          onReceptionClick={openReception}
        />
      </OfficeHomeAccordion>

      <OfficePulseDrawer
        dashboard={dashboard}
        spendPct={spendPct}
        portfolioRoi={portfolioRoi}
      />

      <OfficeHomeAccordion
        sectionId="portfolio"
        className="office-home-portfolio"
        title={t("office.homeToday.portfolioTitle")}
        description={t("office.homeToday.portfolioDesc")}
      >
        <div className="office-grid office-grid-secondary">
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
                  <p className="office-service-label">
                    {t(service.labelKey as "office.serviceTemplates.marketScan.label")}
                  </p>
                  <p className="office-service-desc">
                    {t(service.descKey as "office.serviceTemplates.marketScan.desc")}
                  </p>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <aside className="office-panel">
          <h2 className="office-panel-title">{t("office.roi.title")}</h2>
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
                      <span className="office-roi-phase">{item.phase}</span>
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
      </OfficeHomeAccordion>

      <OfficeReceptionOverlay
        open={receptionOpen}
        onClose={() => setReceptionOpen(false)}
        orgUnitId={orgUnitId || undefined}
        productId={resolvedProductId}
        parentRunId={revisionContext.parentRunId}
        serviceId={serviceId}
        initialUserMessage={chatSeed}
        welcomeMessageKey={
          revisionContext.parentRunId ? "office.revision.welcome" : undefined
        }
        onExecuted={() => void refresh()}
      />
    </PageFrame>
  );
}
