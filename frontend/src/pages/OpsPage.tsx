import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Package, Sparkles, Target, Wallet } from "lucide-react";
import { api, type OpsPortfolio, type OpsNextRun } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { formatWorkflowTitle } from "../lib/workflow-display";
import OpsFlowStepper from "../components/ops/OpsFlowStepper";
import OpsSchedulesPanel from "../components/ops/OpsSchedulesPanel";
import OrchestrationPreviewPanel from "../components/ops/OrchestrationPreviewPanel";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import StatusPill from "../components/ui/StatusPill";

function workflowLabel(name: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const translated = t(`workflowDisplay.titles.${name}`, { defaultValue: "" });
  return translated || formatWorkflowTitle(name);
}

export default function OpsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<OpsPortfolio | null>(null);
  const [nextRun, setNextRun] = useState<OpsNextRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningMeta, setRunningMeta] = useState(false);
  const [metaRunError, setMetaRunError] = useState<string | null>(null);

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
    const target =
      portfolio?.schedules
        .filter((schedule) => schedule.enabled)
        .sort((a, b) => b.priority - a.priority)[0] ?? null;

    if (!target) {
      setMetaRunError(t("ops.orchestrationPreview.empty"));
      return;
    }

    setRunningMeta(true);
    setMetaRunError(null);

    try {
      const { runId } = await api.schedules.runNow(target.id);
      if (!runId) {
        throw new Error(t("settings.metaSchedule.runFailed"));
      }
      await load();
      navigate(`/runs/${runId}`);
    } catch (err) {
      setMetaRunError(translateApiError(err, t, "settings.metaSchedule.runFailed"));
    } finally {
      setRunningMeta(false);
    }
  };

  if (loading) {
    return <PageLoading message={t("ops.loading")} />;
  }

  if (!portfolio) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loadFailed")}</p>;
  }

  const primarySchedule =
    portfolio.schedules
      .filter((schedule) => schedule.enabled)
      .sort((a, b) => b.priority - a.priority)[0] ?? null;
  const nextWorkflowLabel = nextRun ? workflowLabel(nextRun.workflowName, t) : null;
  const launchBlocked = nextRun?.canExecute === false;
  const totalRevenue = portfolio.stats.totalRevenueUsd;
  const buildingCount = portfolio.stats.building + portfolio.stats.growing;
  const pendingOpportunities = portfolio.pipeline.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <Sparkles className="h-3 w-3" aria-hidden /> {t("ops.eyebrow")}
          </span>
        }
        title={t("ops.title")}
        subtitle={t("ops.subtitle")}
        actions={
          primarySchedule ? (
            <Button onClick={() => void runMetaNow()} disabled={runningMeta || launchBlocked}>
              {runningMeta ? t("common.starting") : t("ops.runScheduledNow")}
            </Button>
          ) : (
            <Link to="/office">
              <Button variant="secondary">{t("ops.goToOffice")}</Button>
            </Link>
          )
        }
      />

      <section className="hero-strip" data-testid="ops-kpis">
        <KpiCard
          label={t("ops.kpis.cycle")}
          value={`#${portfolio.cycleNumber}`}
          delta={
            nextWorkflowLabel
              ? t("ops.kpis.cycleNextDelta", { workflow: nextWorkflowLabel })
              : t("ops.kpis.cycleIdle")
          }
        />
        <KpiCard
          label={t("ops.kpis.products")}
          value={portfolio.stats.products}
          delta={t("ops.kpis.productsDelta", {
            building: buildingCount,
            pipeline: portfolio.stats.pipeline,
          })}
        />
        <KpiCard
          label={t("ops.kpis.revenue")}
          value={`$${totalRevenue.toFixed(2)}`}
          delta={
            portfolio.products.some((p) => p.revenueUsd > 0)
              ? t("ops.kpis.revenueGrowing")
              : t("ops.kpis.revenueZero")
          }
          trend={totalRevenue > 0 ? "up" : "flat"}
        />
        <KpiCard
          label={t("ops.kpis.decisions")}
          value={portfolio.pendingDecisions}
          delta={
            portfolio.pendingDecisions > 0
              ? t("ops.kpis.decisionsWaiting")
              : t("ops.kpis.decisionsCaughtUp")
          }
          trend={portfolio.pendingDecisions > 0 ? "down" : "up"}
        />
      </section>

      {launchBlocked && nextRun?.blockedMessage && (
        <Panel tone="warn">
          <p className="font-semibold">{t("ops.launchBlocked.title")}</p>
          <p className="mt-1 text-sm">{nextRun.blockedMessage}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nextRun.blockedCode === "PENDING_DECISIONS" && (
              <Link to="/decisions">
                <Button>{t("ops.reviewDecisions")}</Button>
              </Link>
            )}
            {nextRun.blockedCode === "ACTIVE_RUN" && (
              <Link to="/runs">
                <Button variant="secondary">{t("ops.launchBlocked.viewRuns")}</Button>
              </Link>
            )}
          </div>
        </Panel>
      )}

      {portfolio.pendingDecisions > 0 && (
        <Panel tone="warn">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">{t("decisions.title")}</p>
              <p className="text-sm">
                {t("ops.pendingDecisionsMessage", { count: portfolio.pendingDecisions })}
              </p>
            </div>
            <Link to="/decisions">
              <Button>
                {t("ops.reviewDecisions")} <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Panel>
      )}

      {(pendingOpportunities > 0 || portfolio.products.length > 0) && (
        <Panel>
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">{t("ops.productsShortcut.title")}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {t("ops.productsShortcut.description", {
                  opportunities: pendingOpportunities,
                  products: portfolio.products.length,
                })}
              </p>
            </div>
            <Link to="/products">
              <Button variant="secondary">
                <Package className="mr-1.5 h-4 w-4" aria-hidden />
                {t("nav.products")}
              </Button>
            </Link>
          </div>
        </Panel>
      )}

      <Panel
        title={t("ops.cycleBanner.title", {
          phase: t(`phase.${portfolio.companyPhase}`, { defaultValue: portfolio.companyPhase }),
        })}
        subtitle={
          nextWorkflowLabel
            ? t("ops.cycleBanner.subtitleWithRun", { workflow: nextWorkflowLabel })
            : t("ops.cycleBanner.subtitleIdle")
        }
        actions={
          portfolio.focusProduct ? (
            <Link
              to={`/war-room/${portfolio.focusProduct.id}`}
              className="interactive inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium hover:border-[var(--color-primary)]"
            >
              <Target className="h-3.5 w-3.5" aria-hidden />
              {portfolio.focusProduct.name}
            </Link>
          ) : null
        }
      >
        <OpsFlowStepper companyPhase={portfolio.companyPhase} />
        {nextRun?.reason ? (
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            {launchBlocked ? t("ops.status.nextReasonBlocked") : t("ops.status.nextReason")}{" "}
            {nextRun.reason}
          </p>
        ) : null}
        {portfolio.nextAction ? (
          <p className="mt-3 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
            <Wallet className="mr-2 inline h-4 w-4 align-text-bottom text-[var(--color-muted-foreground)]" aria-hidden />
            <span className="text-[var(--color-muted-foreground)]">{t("ops.nextActionLabel")}:</span>{" "}
            {portfolio.nextAction}
          </p>
        ) : null}
        {metaRunError ? (
          <p
            className="mt-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {metaRunError}
          </p>
        ) : null}
      </Panel>

      <OpsSchedulesPanel schedules={portfolio.schedules} onRefresh={load} />

      <OrchestrationPreviewPanel />

      {portfolio.recentRuns.length > 0 && (
        <Panel
          title={t("ops.recentRuns.title")}
          actions={
            <Link to="/runs" className="interactive text-sm text-[var(--color-primary)] hover:underline">
              {t("ops.recentRuns.viewAll")}
            </Link>
          }
          bodySize="sm"
        >
          <ul className="divide-y divide-[var(--color-border)]">
            {portfolio.recentRuns.map((run) => (
              <li key={run.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/runs/${run.id}`}
                  className="interactive flex flex-wrap items-center justify-between gap-2 rounded px-1 py-1 hover:bg-[var(--color-surface)]"
                >
                  <span className="font-medium">
                    {workflowLabel(run.workflow?.name ?? t("ops.recentRuns.defaultWorkflow"), t)}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <StatusPill status={run.status} />
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title={t("ops.metaCycle.title")} bodySize="sm">
        <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.metaCycle.description")}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-[var(--color-muted-foreground)]">
          <li>{t("ops.metaCycle.step1")}</li>
          <li>{t("ops.metaCycle.step2")}</li>
          <li>{t("ops.metaCycle.step3")}</li>
        </ol>
      </Panel>
    </div>
  );
}
