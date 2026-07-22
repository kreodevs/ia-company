import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Focus } from "lucide-react";
import { api, type OpsPortfolio, type OpsNextRun, type TenantProduct } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { formatWorkflowTitle } from "../lib/workflow-display";
import { toast } from "../components/molecules/Sonner";
import OpsFlowStepper from "../components/ops/OpsFlowStepper";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import StatusBadge from "../components/ui/StatusBadge";

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

  if (loading) {
    return <PageLoading message={t("ops.loading")} />;
  }

  if (!portfolio) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loadFailed")}</p>;
  }

  const metaSchedule = portfolio.schedules.find((s) => s.scheduleKind === "meta");
  const pendingIdeas = portfolio.pipeline.filter((idea) => idea.goNoGo === "pending");
  const nextWorkflowLabel = nextRun ? workflowLabel(nextRun.workflowName, t) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("ops.title")} subtitle={t("ops.subtitle")} />

      {portfolio.pendingDecisions > 0 && (
        <Card className="flex flex-col items-start justify-between gap-3 border-amber-300 bg-amber-50 text-amber-900 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">{t("decisions.title")}</p>
            <p className="text-sm">
              {t("ops.pendingDecisionsMessage", { count: portfolio.pendingDecisions })}
            </p>
          </div>
          <Link to="/decisions">
            <Button>{t("ops.reviewDecisions")}</Button>
          </Link>
        </Card>
      )}

      <OpsFlowStepper companyPhase={portfolio.companyPhase} />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">
                {t(`phase.${portfolio.companyPhase}`, { defaultValue: portfolio.companyPhase })}
              </Badge>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {t("ops.status.cycle", { number: portfolio.cycleNumber })}
              </span>
            </div>

            {nextWorkflowLabel ? (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                <span className="text-[var(--color-muted-foreground)]">
                  {t("ops.status.nextWorkflow")}
                </span>
                <span className="font-medium">{nextWorkflowLabel}</span>
                {nextRun?.productSlug ? (
                  <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs">
                    {nextRun.productSlug}
                  </code>
                ) : null}
              </div>
            ) : null}

            {nextRun?.reason ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">{nextRun.reason}</p>
            ) : null}

            {portfolio.nextAction ? (
              <p className="rounded-lg bg-[var(--color-muted)]/40 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                {portfolio.nextAction}
              </p>
            ) : null}
          </div>

          {metaSchedule ? (
            <Button disabled={runningMeta} onClick={() => void runMetaNow()} fullWidthMobile>
              {runningMeta ? t("common.starting") : t("ops.runMetaCycleNow")}
            </Button>
          ) : (
            <Link
              to="/settings"
              className="interactive inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium"
            >
              {t("ops.metaCycle.enableSchedule")}
            </Link>
          )}
        </div>

        {metaRunError ? (
          <p
            className="rounded-lg border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]"
            role="alert"
          >
            {metaRunError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-3 text-xs">
          <Link to="/consensus" className="interactive text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            {t("nav.consensus")}
          </Link>
          <Link to="/runs" className="interactive text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            {t("nav.runs")}
          </Link>
          <Link to="/decisions" className="interactive text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            {t("decisions.title")}
          </Link>
          <Link to="/settings" className="interactive text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]">
            {t("nav.settings")}
          </Link>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("ops.pipeline.title")}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t("ops.pipeline.evaluateHint")}</p>
          </div>
          <span className="shrink-0 text-sm text-[var(--color-muted-foreground)]">
            {t("ops.pipeline.count", { count: pendingIdeas.length })}
          </span>
        </div>

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
          <ul className="space-y-3">
            {portfolio.pipeline.map((idea) => {
              const isEvaluating = evaluatingIdeaId === idea.id;
              return (
                <li
                  key={idea.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-4"
                >
                  <div className="space-y-2">
                    <div className="font-medium">{idea.title}</div>
                    <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                      {idea.description || t("ops.portfolio.noDescription")}
                    </p>
                    {idea.goNoGo === "go" ? (
                      <Badge variant="primary">{t("ops.pipeline.approved")}</Badge>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={isEvaluating}
                      onClick={() => void evaluateIdea(idea.id)}
                      className="text-sm"
                    >
                      {isEvaluating ? t("ops.pipeline.evaluating") : t("ops.pipeline.evaluate")}
                    </Button>
                    {idea.goNoGo === "pending" ? (
                      <Button
                        variant="ghost"
                        className="text-sm text-[var(--color-destructive)]"
                        onClick={() => void rejectIdea(idea.id)}
                      >
                        {t("ops.pipeline.noGo")}
                      </Button>
                    ) : null}
                  </div>
                  {idea.goNoGo === "pending" ? (
                    <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{t("ops.pipeline.noGoHint")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("ops.portfolio.title")}</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{t("ops.portfolio.emptyHint")}</p>
        </div>

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
                <li
                  key={product.id}
                  className={`rounded-xl border px-4 py-4 ${
                    isFocused
                      ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-card)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {isFocused ? (
                          <Badge variant="primary">
                            <Focus className="mr-1 inline h-3 w-3" aria-hidden />
                            {t("ops.portfolio.focused")}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                        {product.description || t("ops.portfolio.noDescription")}
                      </p>
                      <dl className="grid gap-1 text-xs text-[var(--color-muted-foreground)] sm:grid-cols-2">
                        <div>
                          <dt className="inline font-medium">{t("ops.portfolio.statusLabel")}: </dt>
                          <dd className="inline">{productPhaseLabel(product.phase, t)}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium">{t("ops.portfolio.workspaceLabel")}: </dt>
                          <dd className="inline">
                            <code>projects/{product.slug}/</code>
                          </dd>
                        </div>
                      </dl>
                      {isFocused && nextRun?.productSlug === product.slug && nextWorkflowLabel ? (
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {t("ops.portfolio.nextStepLabel")}:{" "}
                          <span className="font-medium text-[var(--color-foreground)]">{nextWorkflowLabel}</span>
                        </p>
                      ) : null}
                      {product.lastRunId ? (
                        <Link
                          to={`/runs/${product.lastRunId}`}
                          className="interactive inline-flex text-xs text-[var(--color-primary)] hover:underline"
                        >
                          {t("ops.portfolio.viewLastRun")}
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/products/${product.id}/team`}
                        className="interactive inline-flex min-h-9 items-center rounded-lg border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                      >
                        {t("ops.portfolio.warRoom")}
                      </Link>
                      <Link
                        to={`/products/${product.id}/code`}
                        className="interactive inline-flex min-h-9 items-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-foreground)] hover:border-[var(--color-primary)]/40"
                      >
                        {t("ops.portfolio.code")}
                      </Link>
                      <Link
                        to={`/products/${product.id}/consensus`}
                        className="interactive inline-flex min-h-9 items-center rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-foreground)] hover:border-[var(--color-primary)]/40"
                      >
                        {t("ops.portfolio.memory")}
                      </Link>
                      {!isFocused ? (
                        <Button
                          variant="secondary"
                          className="text-xs"
                          onClick={() => void focusProduct(product)}
                        >
                          {t("ops.portfolio.focus")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {portfolio.recentRuns.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("ops.recentRuns.title")}</h2>
            <Link to="/runs" className="interactive text-sm text-[var(--color-primary)] hover:underline">
              {t("ops.recentRuns.viewAll")}
            </Link>
          </div>
          <ul className="space-y-2">
            {portfolio.recentRuns.map((run) => (
              <li key={run.id}>
                <Link
                  to={`/runs/${run.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm hover:border-[var(--color-primary)]"
                >
                  <span>{workflowLabel(run.workflow?.name ?? t("ops.recentRuns.defaultWorkflow"), t)}</span>
                  <span className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
                    <StatusBadge
                      status={run.status}
                      label={t(`status.${run.status}`, { defaultValue: run.status })}
                    />
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">{t("ops.metaCycle.title")}</summary>
        <p className="mt-3 text-[var(--color-muted-foreground)]">{t("ops.metaCycle.description")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--color-muted-foreground)]">
          <li>{t("ops.metaCycle.step1")}</li>
          <li>{t("ops.metaCycle.step2")}</li>
          <li>{t("ops.metaCycle.step3")}</li>
        </ol>
      </details>
    </div>
  );
}
