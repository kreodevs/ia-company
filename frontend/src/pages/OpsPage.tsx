import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OpsPortfolio, type OpsNextRun } from "../lib/api";

function PhaseBadge({ phase }: { phase: string }) {
  const { t } = useTranslation();
  return (
    <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-0.5 text-xs capitalize">
      {t(`phase.${phase}`, { defaultValue: phase })}
    </span>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</div>}
    </div>
  );
}

export default function OpsPage() {
  const { t } = useTranslation();
  const [portfolio, setPortfolio] = useState<OpsPortfolio | null>(null);
  const [nextRun, setNextRun] = useState<OpsNextRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningMeta, setRunningMeta] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [portfolioData, nextRunData] = await Promise.all([
        api.ops.portfolio(),
        api.ops.nextRun(),
      ]);
      setPortfolio(portfolioData);
      setNextRun(nextRunData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runMetaNow = async () => {
    const meta = portfolio?.schedules.find((s) => s.scheduleKind === "meta");
    if (!meta) return;
    setRunningMeta(true);
    try {
      const { runId } = await api.schedules.runNow(meta.id);
      window.location.href = `/runs/${runId}`;
    } finally {
      setRunningMeta(false);
    }
  };

  if (loading) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loading")}</p>;
  }

  if (!portfolio) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loadFailed")}</p>;
  }

  const metaSchedule = portfolio.schedules.find((s) => s.scheduleKind === "meta");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("ops.title")}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t("ops.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {metaSchedule && (
            <button
              disabled={runningMeta}
              onClick={() => void runMetaNow()}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {runningMeta ? t("common.starting") : t("ops.runMetaCycleNow")}
            </button>
          )}
          <Link
            to="/consensus"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
          >
            {t("nav.consensus")}
          </Link>
          <Link
            to="/settings"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
          >
            {t("ops.schedulesLink")}
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("ops.stats.companyPhase")}
          value={t(`phase.${portfolio.companyPhase}`, { defaultValue: portfolio.companyPhase })}
          hint={t("ops.stats.cycleHint", { number: portfolio.cycleNumber })}
        />
        <StatCard
          label={t("ops.stats.productsBuilding")}
          value={portfolio.stats.building}
          hint={t("ops.stats.growingHint", { count: portfolio.stats.growing })}
        />
        <StatCard label={t("ops.stats.pipelineIdeas")} value={portfolio.stats.pipeline} />
        <StatCard
          label={t("ops.stats.revenueTracked")}
          value={`$${portfolio.stats.totalRevenueUsd.toFixed(0)}`}
        />
      </section>

      {(portfolio.nextAction || nextRun) && (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h2 className="font-semibold">{t("ops.nextAction.title")}</h2>
          {portfolio.nextAction && <p className="mt-2 text-sm">{portfolio.nextAction}</p>}
          {nextRun && (
            <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
              <div>
                <span className="text-[var(--color-muted-foreground)]">{t("ops.nextAction.workflow")}</span>{" "}
                {nextRun.workflowName}
              </div>
              {nextRun.productSlug && (
                <div>
                  <span className="text-[var(--color-muted-foreground)]">{t("ops.nextAction.product")}</span>{" "}
                  <code>projects/{nextRun.productSlug}/</code>
                </div>
              )}
              <div className="mt-1 text-[var(--color-muted-foreground)]">{nextRun.reason}</div>
            </div>
          )}
          {portfolio.focusProduct && (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              {t("ops.nextAction.focusProduct", {
                name: portfolio.focusProduct.name,
                slug: portfolio.focusProduct.slug,
              })}
            </p>
          )}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("ops.portfolio.title")}</h2>
          <ul className="space-y-2">
            {portfolio.products.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
              >
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    <code>projects/{product.slug}/</code>
                    {product.revenueUsd > 0 &&
                      t("ops.portfolio.revenue", { amount: product.revenueUsd.toFixed(0) })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PhaseBadge phase={product.phase} />
                  <button
                    onClick={() => void api.products.focus(product.id).then(() => load())}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                  >
                    {t("ops.portfolio.focus")}
                  </button>
                </div>
              </li>
            ))}
            {portfolio.products.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.portfolio.empty")}</p>
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t("ops.pipeline.title")}</h2>
          <ul className="space-y-2">
            {portfolio.pipeline.map((idea) => (
              <li
                key={idea.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{idea.title}</div>
                    {idea.description && (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{idea.description}</p>
                    )}
                  </div>
                  <PhaseBadge
                    phase={
                      idea.goNoGo === "go"
                        ? "growing"
                        : idea.goNoGo === "no_go"
                          ? "paused"
                          : "evaluating"
                    }
                  />
                </div>
                {idea.goNoGo === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        void api.products.pipelineDecision(idea.id, "go").then(() => load())
                      }
                      className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                    >
                      {t("ops.pipeline.go")}
                    </button>
                    <button
                      onClick={() =>
                        void api.products.pipelineDecision(idea.id, "no_go").then(() => load())
                      }
                      className="rounded-lg border border-[var(--color-destructive)] px-2 py-1 text-xs text-[var(--color-destructive)]"
                    >
                      {t("ops.pipeline.noGo")}
                    </button>
                  </div>
                )}
              </li>
            ))}
            {portfolio.pipeline.length === 0 && (
              <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.pipeline.empty")}</p>
            )}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("ops.recentRuns.title")}</h2>
        <ul className="space-y-2">
          {portfolio.recentRuns.map((run) => (
            <li key={run.id}>
              <Link
                to={`/runs/${run.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm hover:border-[var(--color-primary)]"
              >
                <span>{run.workflow?.name ?? t("nav.workflows")}</span>
                <span className="text-[var(--color-muted-foreground)]">
                  {t(`status.${run.status}`, { defaultValue: run.status })} ·{" "}
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
          {portfolio.recentRuns.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.recentRuns.empty")}</p>
          )}
        </ul>
      </section>
    </div>
  );
}
