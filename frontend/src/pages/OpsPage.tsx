import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles, Target, Wallet } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { api, type OpsPortfolio, type OpsNextRun, type TenantProduct } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { formatWorkflowTitle } from "../lib/workflow-display";
import { toast } from "../components/molecules/Sonner";
import OpsFlowStepper from "../components/ops/OpsFlowStepper";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";

function workflowLabel(name: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const translated = t(`workflowDisplay.titles.${name}`, { defaultValue: "" });
  return translated || formatWorkflowTitle(name);
}

function productPhaseLabel(
  phase: TenantProduct["phase"],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  return t(`ops.portfolio.phase.${phase}`, { defaultValue: phase });
}

export default function OpsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<OpsPortfolio | null>(null);
  const [nextRun, setNextRun] = useState<OpsNextRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningMeta, setRunningMeta] = useState(false);
  const [evaluatingIdeaId, setEvaluatingIdeaId] = useState<string | null>(null);
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

      if (!portfolioData.schedules.some((s) => s.scheduleKind === "meta")) {
        await api.schedules.ensureMeta();
        setPortfolio(await api.ops.portfolio());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runMetaNow = async () => {
    let meta = portfolio?.schedules.find((s) => s.scheduleKind === "meta");
    if (!meta) {
      try {
        meta = await api.schedules.ensureMeta();
        await load();
      } catch (err) {
        setMetaRunError(translateApiError(err, t, "settings.metaSchedule.runFailed"));
        return;
      }
    }

    setRunningMeta(true);
    setMetaRunError(null);

    try {
      const { runId } = await api.schedules.runNow(meta.id);
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

  const evaluateIdea = async (ideaId: string) => {
    setEvaluatingIdeaId(ideaId);
    try {
      const { runId } = await api.products.evaluateIdea(ideaId);
      toast.success(t("ops.toast.evaluateStarted"));
      await load();
      navigate(`/runs/${runId}`);
    } catch (err) {
      toast.error(translateApiError(err, t, "ops.toast.evaluateFailed"));
    } finally {
      setEvaluatingIdeaId(null);
    }
  };

  const rejectIdea = async (ideaId: string) => {
    try {
      await api.products.pipelineDecision(ideaId, "no_go");
      toast.success(t("ops.toast.noGoDone"));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    }
  };

  const focusProduct = async (product: TenantProduct) => {
    try {
      await api.products.focus(product.id);
      toast.success(t("ops.toast.focusSet", { name: product.name }));
      await load();
    } catch (err) {
      toast.error(translateApiError(err, t, "common.saveFailed"));
    }
  };

  const productPhaseData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of portfolio?.products ?? []) {
      counts.set(product.phase, (counts.get(product.phase) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([phase, count]) => ({
        phase: productPhaseLabel(phase as TenantProduct["phase"], t),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [portfolio?.products, t]);

  if (loading) {
    return <PageLoading message={t("ops.loading")} />;
  }

  if (!portfolio) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loadFailed")}</p>;
  }

  const metaSchedule = portfolio.schedules.find((s) => s.scheduleKind === "meta");
  const pendingIdeas = portfolio.pipeline.filter((idea) => idea.goNoGo === "pending");
  const nextWorkflowLabel = nextRun ? workflowLabel(nextRun.workflowName, t) : null;
  const totalRevenue = portfolio.stats.totalRevenueUsd;
  const buildingCount = portfolio.stats.building + portfolio.stats.growing;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <Sparkles className="h-3 w-3" aria-hidden /> {t("ops.eyebrow")}
          </span>
        }
        title={t("ops.title")}
        subtitle={t("ops.subtitle")}
        actions={
          metaSchedule ? (
            <Button onClick={() => void runMetaNow()} disabled={runningMeta}>
              {runningMeta ? t("common.starting") : t("ops.runMetaCycleNow")}
            </Button>
          ) : (
            <Link to="/settings">
              <Button variant="secondary">{t("ops.metaCycle.enableSchedule")}</Button>
            </Link>
          )
        }
      />

      {/* KPI hero strip */}
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
              <Button>{t("ops.reviewDecisions")} <ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
            </Link>
          </div>
        </Panel>
      )}

      {/* Main two-column layout */}
      <div className="two-col two-col--main-aside">
        <div className="space-y-6">
          {/* Cycle banner */}
          <Panel
            title={t("ops.cycleBanner.title", { phase: t(`phase.${portfolio.companyPhase}`, { defaultValue: portfolio.companyPhase }) })}
            subtitle={
              nextWorkflowLabel
                ? t("ops.cycleBanner.subtitleWithRun", { workflow: nextWorkflowLabel })
                : t("ops.cycleBanner.subtitleIdle")
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {portfolio.focusProduct && (
                  <Link
                    to={`/products/${portfolio.focusProduct.id}/team`}
                    className="interactive inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-xs font-medium hover:border-[var(--color-primary)]"
                  >
                    <Target className="h-3.5 w-3.5" aria-hidden />
                    {portfolio.focusProduct.name}
                  </Link>
                )}
              </div>
            }
          >
            <OpsFlowStepper companyPhase={portfolio.companyPhase} />
            {nextRun?.reason ? (
              <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
                {t("ops.status.nextReason")} {nextRun.reason}
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

          {/* Pipeline ideas */}
          <Panel
            title={t("ops.pipeline.title")}
            subtitle={t("ops.pipeline.evaluateHint")}
            actions={
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("ops.pipeline.count", { count: pendingIdeas.length })}
              </span>
            }
            bodySize="sm"
          >
            {portfolio.pipeline.length === 0 ? (
              <EmptyState
                title={t("ops.pipeline.emptyTitle")}
                description={t("ops.pipeline.emptyHint")}
                action={
                  portfolio.lastDiscoveryRun ? (
                    <Link to={`/runs/${portfolio.lastDiscoveryRun.id}`}>
                      <Button variant="ghost">{t("ops.pipeline.viewLastDiscovery")}</Button>
                    </Link>
                  ) : null
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {portfolio.pipeline.map((idea) => {
                  const isEvaluating = evaluatingIdeaId === idea.id;
                  return (
                    <li key={idea.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{idea.title}</span>
                            {idea.goNoGo === "go" && <StatusPill status="completed">{t("ops.pipeline.approved")}</StatusPill>}
                            {idea.interestScore > 0 && (
                              <span className="text-[10px] font-semibold uppercase text-[var(--color-muted-foreground)]">
                                {t("ops.pipeline.score", { score: idea.interestScore.toFixed(1) })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-muted-foreground)]">
                            {idea.description || t("ops.portfolio.noDescription")}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {idea.goNoGo === "pending" && (
                            <>
                              <Button
                                disabled={isEvaluating}
                                onClick={() => void evaluateIdea(idea.id)}
                                size="sm"
                              >
                                {isEvaluating ? t("ops.pipeline.evaluating") : t("ops.pipeline.evaluate")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[var(--color-destructive)]"
                                onClick={() => void rejectIdea(idea.id)}
                              >
                                {t("ops.pipeline.noGo")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Recent runs */}
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
        </div>

        {/* Right column: portfolio + meta info */}
        <aside className="space-y-6">
          {/* Phase distribution mini-chart */}
          {productPhaseData.length > 0 && (
            <Panel
              title={t("ops.phaseChart.title")}
              subtitle={t("ops.phaseChart.subtitle")}
              bodySize="sm"
            >
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productPhaseData} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="phase"
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      width={72}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(56,189,248,0.08)" }}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {/* Portfolio */}
          <Panel
            title={t("ops.portfolio.title")}
            subtitle={t("ops.portfolio.subtitle")}
            actions={
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {t("ops.portfolio.count", { count: portfolio.products.length })}
              </span>
            }
            bodySize="sm"
          >
            {portfolio.products.length === 0 ? (
              <EmptyState
                title={t("ops.portfolio.emptyTitle", { defaultValue: "No products yet" })}
                description={t("ops.portfolio.emptyHint")}
              />
            ) : (
              <ul className="space-y-3">
                {portfolio.products.map((product) => {
                  const isFocused = portfolio.focusProduct?.id === product.id;
                  return (
                    <li key={product.id}>
                      <div
                        className={`group rounded-lg border p-3 transition lift ${
                          isFocused
                            ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
                            : "border-[var(--color-border)] bg-[var(--color-background)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{product.name}</span>
                              <StatusPill status={product.phase} />
                              {product.goNoGo === "no_go" && (
                                <span className="text-[10px] font-semibold uppercase text-[var(--color-destructive)]">
                                  {t("ops.portfolio.noGo")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              {product.description || t("ops.portfolio.noDescription")}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                              <code>projects/{product.slug}/</code>
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Link
                            to={`/products/${product.id}/team`}
                            className="interactive inline-flex items-center rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                          >
                            {t("ops.portfolio.warRoom")}
                          </Link>
                          <Link
                            to={`/products/${product.id}/code`}
                            className="interactive inline-flex items-center rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:border-[var(--color-primary)]/40"
                          >
                            {t("ops.portfolio.code")}
                          </Link>
                          <Link
                            to={`/products/${product.id}/consensus`}
                            className="interactive inline-flex items-center rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs hover:border-[var(--color-primary)]/40"
                          >
                            {t("ops.portfolio.memory")}
                          </Link>
                          {!isFocused && (
                            <button
                              type="button"
                              onClick={() => void focusProduct(product)}
                              className="interactive ml-auto rounded-md px-2 py-1 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                            >
                              {t("ops.portfolio.focus")}
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Meta cycle explainer */}
          <Panel title={t("ops.metaCycle.title")} bodySize="sm">
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("ops.metaCycle.description")}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-[var(--color-muted-foreground)]">
              <li>{t("ops.metaCycle.step1")}</li>
              <li>{t("ops.metaCycle.step2")}</li>
              <li>{t("ops.metaCycle.step3")}</li>
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}