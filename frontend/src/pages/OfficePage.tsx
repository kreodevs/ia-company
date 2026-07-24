import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  api,
  type OfficeDashboard,
  type OfficeServiceTemplate,
  type TenantProduct,
} from "../lib/api";
import CoordinatorChat from "../components/office/CoordinatorChat";
import { NotificationPermissionPrompt } from "../components/office/NotificationBell";
import PageLoading from "../components/ui/PageLoading";
import KpiCard from "../components/ui/KpiCard";

const AGENT_EMOJI: Record<string, string> = {
  "coordinator-chief": "🎩",
  "ceo-bezos": "👔",
  "cto-vogels": "🛠️",
  "cfo-campbell": "💰",
  "critic-munger": "🧐",
  "research-thompson": "🔍",
  "product-norman": "🧭",
  "interaction-cooper": "🎯",
  "ui-duarte": "🎨",
  "fullstack-dhh": "💻",
  "qa-bach": "🧪",
  "devops-hightower": "🚀",
  "marketing-godin": "📣",
  "operations-pg": "📈",
  "sales-ross": "💼",
};

function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `radial-gradient(circle at 30% 25%, hsl(${hue} 90% 70%) 0%, hsl(${hue} 70% 45%) 55%, hsl(${(hue + 25) % 360} 80% 30%) 100%)`;
}

export default function OfficePage() {
  const { t } = useTranslation();
  const [dashboard, setDashboard] = useState<OfficeDashboard | null>(null);
  const [products, setProducts] = useState<TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [chatSeed, setChatSeed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [dash, overview] = await Promise.all([
      api.office.dashboard(),
      api.products.overview().catch(() => null),
    ]);
    setDashboard(dash);
    if (overview?.products) setProducts(overview.products.filter((p) => p.phase !== "archived"));
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

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
      </header>

      <NotificationPermissionPrompt />

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

          <h2 className="office-panel-title" style={{ marginTop: "1.25rem" }}>
            {t("office.agents.title")}
          </h2>
          <div className="office-roster">
            {dashboard.agents.slice(0, 14).map((agent) => (
              <span
                key={agent.id}
                className="office-roster-dot"
                data-status={agent.status}
                title={`${agent.name} — ${agent.status === "busy" ? t("office.agents.busy") : t("office.agents.idle")}`}
                style={{ background: avatarGradient(agent.name) }}
              >
                {AGENT_EMOJI[agent.name] ?? "🧑‍💼"}
              </span>
            ))}
          </div>
          <Link to="/agents" className="office-roi-link">
            {t("office.agents.viewAll")}
          </Link>
        </aside>

        <section className="office-task-panel office-chat-panel">
          <div className="office-task-meta" style={{ marginBottom: "0.75rem" }}>
            <div>
              <label htmlFor="office-product">{t("office.task.productLabel")}</label>
              <select
                id="office-product"
                className="office-task-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">{t("office.task.productAny")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <CoordinatorChat
            key={chatSeed ?? "default"}
            productId={productId || undefined}
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
