import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type OpsPortfolio, type OpsNextRun } from "../lib/api";
import { translateApiError } from "../lib/translate-error";
import { formatWorkflowTitle } from "../lib/workflow-display";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import StatusBadge from "../components/ui/StatusBadge";

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

  if (loading) {
    return <PageLoading message={t("ops.loading")} />;
  }

  if (!portfolio) {
    return <p className="text-[var(--color-muted-foreground)]">{t("ops.loadFailed")}</p>;
  }

  const metaSchedule = portfolio.schedules.find((s) => s.scheduleKind === "meta");
  const pendingIdeas = portfolio.pipeline.filter((idea) => idea.goNoGo === "pending");
  const workflowLabel = nextRun ? formatWorkflowTitle(nextRun.workflowName) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("ops.title")} subtitle={t("ops.subtitle")} />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>
                {t(`phase.${portfolio.companyPhase}`, { defaultValue: portfolio.companyPhase })}
              </Badge>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {t("ops.status.cycle", { number: portfolio.cycleNumber })}
              </span>
            </div>
            {workflowLabel ? (
              <p className="text-sm">
                {t("ops.status.nextWorkflow")}{" "}
                <span className="font-medium">{workflowLabel}</span>
              </p>
            ) : null}
            {portfolio.nextAction ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">{portfolio.nextAction}</p>
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

        <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-3 text-sm">
          <Link to="/consensus" className="interactive text-[var(--color-primary)] hover:underline">
            {t("nav.consensus")}
          </Link>
          <Link to="/runs" className="interactive text-[var(--color-primary)] hover:underline">
            {t("nav.runs")}
          </Link>
          <Link to="/settings" className="interactive text-[var(--color-primary)] hover:underline">
            {t("nav.settings")}
          </Link>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("ops.pipeline.title")}</h2>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {t("ops.pipeline.count", { count: pendingIdeas.length })}
          </span>
        </div>

        {portfolio.pipeline.length === 0 ? (
          <Card className="space-y-3 text-sm">
            <p className="font-medium">{t("ops.pipeline.emptyTitle")}</p>
            <p className="text-[var(--color-muted-foreground)]">{t("ops.pipeline.emptyHint")}</p>
            {portfolio.lastDiscoveryRun ? (
              <Link
                to={`/runs/${portfolio.lastDiscoveryRun.id}`}
                className="interactive inline-flex text-[var(--color-primary)] hover:underline"
              >
                {t("ops.pipeline.viewLastDiscovery")}
              </Link>
            ) : null}
          </Card>
        ) : (
          <ul className="space-y-2">
            {portfolio.pipeline.map((idea) => (
              <li
                key={idea.id}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{idea.title}</div>
                    {idea.description ? (
                      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {idea.description}
                      </p>
                    ) : null}
                  </div>
                  {idea.goNoGo !== "pending" ? (
                    <Badge>{idea.goNoGo === "go" ? t("ops.pipeline.go") : t("ops.pipeline.noGo")}</Badge>
                  ) : null}
                </div>
                {idea.goNoGo === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      onClick={() => void api.products.pipelineDecision(idea.id, "go").then(() => load())}
                    >
                      {t("ops.pipeline.go")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-[var(--color-destructive)]"
                      onClick={() => void api.products.pipelineDecision(idea.id, "no_go").then(() => load())}
                    >
                      {t("ops.pipeline.noGo")}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {portfolio.products.length > 0 ? (
        <section className="space-y-3">
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
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{t(`phase.${product.phase}`, { defaultValue: product.phase })}</Badge>
                  <button
                    type="button"
                    onClick={() => void api.products.focus(product.id).then(() => load())}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs"
                  >
                    {t("ops.portfolio.focus")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                  <span>{formatWorkflowTitle(run.workflow?.name ?? t("ops.recentRuns.defaultWorkflow"))}</span>
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
