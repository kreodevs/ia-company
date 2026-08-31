import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, GitBranch, History, Sparkles, X } from "lucide-react";
import { api, type DecisionProposal, type DecisionStatus } from "../lib/api";
import { useDecisionActorEmail } from "../hooks/useDecisionActorEmail";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Panel from "../components/ui/Panel";
import KpiCard from "../components/ui/KpiCard";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";
import DecisionEvidencePanel from "../components/decisions/DecisionEvidencePanel";
import DecisionExecutiveSummary from "../components/decisions/DecisionExecutiveSummary";

function statusLabel(t: (k: string) => string, s: DecisionStatus): string {
  const key = `decisions.status.${s}`;
  const out = t(key);
  return out === key ? s : out;
}

function statusToPill(status: DecisionStatus): string {
  switch (status) {
    case "approved":
      return "completed";
    case "rejected":
    case "cancelled":
      return "cancelled";
    case "drilling":
      return "running";
    case "pending_review":
      return "pending";
    default:
      return "queued";
  }
}

export default function DecisionsPage() {
  const { t } = useTranslation();
  const actorEmail = useDecisionActorEmail();
  const [proposals, setProposals] = useState<DecisionProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pivotFor, setPivotFor] = useState<string | null>(null);
  const [pivotText, setPivotText] = useState("");

  const refresh = () =>
    api.decisions
      .list()
      .then(setProposals)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  const submitPivot = async (id: string) => {
    if (!pivotText.trim()) return;
    await act(id, () => api.decisions.pivot(id, { pivot: pivotText.trim(), actorEmail }));
    setPivotFor(null);
    setPivotText("");
  };

  const { pending, history, goCount, noGoCount, approvedCount, drillingCount } = useMemo(() => {
    const pending = proposals.filter(
      (p) => p.status === "pending_review" || p.status === "drilling",
    );
    const history = proposals.filter(
      (p) =>
        p.status === "approved" || p.status === "rejected" || p.status === "cancelled",
    );
    const goCount = proposals.filter((p) => p.recommended === "go").length;
    const noGoCount = proposals.filter((p) => p.recommended === "no_go").length;
    const approvedCount = proposals.filter((p) => p.status === "approved").length;
    const drillingCount = proposals.filter((p) => p.status === "drilling").length;
    return { pending, history, goCount, noGoCount, approvedCount, drillingCount };
  }, [proposals]);

  if (loading) return <PageLoading message={t("decisions.loading")} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("nav.ops"), to: "/ops" },
              { label: t("decisions.title") },
            ]}
          />
        }
        title={t("decisions.title")}
        subtitle={t("decisions.subtitle")}
      />

      <section className="hero-strip">
        <KpiCard
          label={t("decisions.kpis.pending")}
          value={pending.length}
          delta={
            pending.length > 0
              ? t("decisions.kpis.pendingDelta", { drilling: drillingCount })
              : t("decisions.kpis.pendingClear")
          }
          trend={pending.length > 0 ? "down" : "up"}
        />
        <KpiCard
          label={t("decisions.kpis.goRecommended")}
          value={goCount}
          delta={t("decisions.kpis.goRecommendedDelta")}
        />
        <KpiCard
          label={t("decisions.kpis.noGoRecommended")}
          value={noGoCount}
          delta={t("decisions.kpis.noGoRecommendedDelta")}
        />
        <KpiCard
          label={t("decisions.kpis.approved")}
          value={approvedCount}
          trend={approvedCount > 0 ? "up" : "flat"}
          delta={t("decisions.kpis.approvedDelta", { total: proposals.length })}
        />
      </section>

      <Panel
        title={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
            {t("decisions.pendingHeading", { count: pending.length })}
          </span>
        }
        subtitle={
          pending.length === 0
            ? t("decisions.empty")
            : t("decisions.pendingSubtitle", { count: pending.length })
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title={t("decisions.emptyTitle", { defaultValue: "All caught up" })}
            description={t("decisions.empty")}
          />
        ) : (
          <ol className="space-y-6">
            {pending.map((p, i) => (
              <li
                key={p.id}
                className="relative pl-8"
                data-testid={`decision-${p.id}`}
              >
                <span
                  className={`absolute left-0 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                    i === 0
                      ? "border-[color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,var(--card))] text-[var(--warning)]"
                      : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  {i + 1}
                </span>
                {i < pending.length - 1 && (
                  <span
                    className="absolute left-[9px] top-7 bottom-0 w-px bg-[var(--color-border)]"
                    aria-hidden
                  />
                )}
                <div className="lift rounded-xl border border-[var(--color-border)] bg-[var(--card)] p-5 shadow-xs hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusPill status={statusToPill(p.status)}>
                      {statusLabel(t, p.status)}
                    </StatusPill>
                    <span className="font-semibold text-sm">{p.idea.title}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {new Date(p.createdAt).toLocaleString()}
                    </span>
                    {p.runId && (
                      <Link
                        to={`/runs/${p.runId}`}
                        className="interactive inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                      >
                        <GitBranch className="h-3 w-3" aria-hidden /> run:{p.runId.slice(0, 8)}
                      </Link>
                    )}
                  </div>

                  <DecisionExecutiveSummary
                    recommended={p.recommended}
                    rationale={p.rationale}
                    encargoSummary={p.encargoSummary}
                    encargoSummaryKind={p.encargoSummaryKind}
                    evidence={p.evidence}
                    ideaTitle={p.idea.title}
                  />

                  {p.evidence.length > 0 && (
                    <DecisionEvidencePanel
                      proposalId={p.id}
                      runId={p.runId}
                      evidence={p.evidence}
                    />
                  )}

                  {pivotFor === p.id ? (
                    <div className="mt-4 space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <Input
                        label={t("decisions.pivotPrompt")}
                        value={pivotText}
                        onChange={(e) => setPivotText(e.target.value)}
                        placeholder={t("decisions.pivotPlaceholder")}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busy === p.id || !pivotText.trim()}
                          onClick={() => void submitPivot(p.id)}
                        >
                          {t("decisions.requestDrilldown")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPivotFor(null);
                            setPivotText("");
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        disabled={busy === p.id}
                        onClick={() => void act(p.id, () => api.decisions.approve(p.id, { actorEmail }))}
                        size="sm"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("decisions.approve", {
                          decision: p.recommended === "go" ? t("decisions.go") : t("decisions.noGo"),
                        })}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy === p.id}
                        onClick={() => {
                          setPivotFor(p.id);
                          setPivotText(p.pivotPrompt ?? "");
                        }}
                      >
                        {t("decisions.pivotMore")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy === p.id}
                        onClick={() => void act(p.id, () => api.decisions.reject(p.id, { actorEmail }))}
                      >
                        <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                        {t("decisions.reject")}
                      </Button>
                      <ChevronRight className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]" aria-hidden />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {history.length > 0 && (
        <Panel
          title={
            <span className="inline-flex items-center gap-2">
              <History className="h-4 w-4" aria-hidden />
              {t("decisions.historyHeading", { count: history.length })}
            </span>
          }
          subtitle={t("decisions.historySubtitle", { defaultValue: "Decisions you've already made." })}
          bodySize="sm"
          hover
        >
          <ol className="divide-y divide-[var(--color-border)]">
            {history.map((p) => (
              <li
                key={p.id}
                className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={statusToPill(p.status)}>
                      {statusLabel(t, p.status)}
                    </StatusPill>
                    <span className="font-medium">{p.idea.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-muted-foreground)]">
                    {p.decidedAt && <span>{new Date(p.decidedAt).toLocaleString()}</span>}
                    {p.decidedBy && <span>· {t("decisions.by", { actor: p.decidedBy })}</span>}
                  </div>
                </div>
                <ChevronRight className="hidden h-4 w-4 text-[var(--color-muted-foreground)] sm:block" aria-hidden />
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}