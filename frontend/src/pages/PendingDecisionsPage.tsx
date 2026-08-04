import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, GitBranch, ScrollText, X } from "lucide-react";
import { api, type DecisionProposal, type DecisionStatus } from "../lib/api";
import { useDecisionActorEmail } from "../hooks/useDecisionActorEmail";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Panel from "../components/ui/Panel";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import EmptyState from "../components/ui/EmptyState";
import StatusPill from "../components/ui/StatusPill";
import DecisionEvidencePanel from "../components/decisions/DecisionEvidencePanel";

type InboxTab = "pending" | "approved" | "rejected";

const INBOX_TABS: InboxTab[] = ["pending", "approved", "rejected"];

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

function parseInboxTab(value: string | null): InboxTab {
  if (value === "approved" || value === "rejected") return value;
  return "pending";
}

export default function PendingDecisionsPage() {
  const { t } = useTranslation();
  const actorEmail = useDecisionActorEmail();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseInboxTab(searchParams.get("tab"));
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
    await act(id, () =>
      api.decisions.pivot(id, { pivot: pivotText.trim(), actorEmail }),
    );
    setPivotFor(null);
    setPivotText("");
  };

  const { pending, approved, rejected } = useMemo(() => {
    const pending = proposals.filter(
      (p) => p.status === "pending_review" || p.status === "drilling",
    );
    const approved = proposals.filter((p) => p.status === "approved");
    const rejected = proposals.filter(
      (p) => p.status === "rejected" || p.status === "cancelled",
    );
    return { pending, approved, rejected };
  }, [proposals]);

  const tabCounts: Record<InboxTab, number> = {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
  };

  const visible =
    tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  const setTab = (next: InboxTab) => {
    setSearchParams(next === "pending" ? {} : { tab: next }, { replace: true });
  };

  if (loading) return <PageLoading message={t("decisions.loading")} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              { label: t("office.encargos.breadcrumbOffice"), to: "/office" },
              { label: t("pendientes.title") },
            ]}
          />
        }
        title={t("pendientes.title")}
        subtitle={t("pendientes.subtitle")}
      />

      <div
        className="office-encargos-filters office-inbox-filters-sticky"
        role="tablist"
        aria-label={t("pendientes.filterLabel")}
      >
        {INBOX_TABS.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={tab === filter}
            className={`office-encargos-filter ${tab === filter ? "office-encargos-filter-active" : ""}`}
            onClick={() => setTab(filter)}
          >
            {t(`pendientes.tabs.${filter}`)} ({tabCounts[filter]})
          </button>
        ))}
      </div>

      <Panel
        title={t(`pendientes.tabs.${tab}`)}
        subtitle={
          visible.length === 0
            ? t(`pendientes.empty.${tab}`)
            : t(
                tab === "pending"
                  ? "decisions.pendingSubtitle"
                  : "decisions.historySubtitle",
                { count: visible.length },
              )
        }
      >
        {visible.length === 0 ? (
          <EmptyState
            title={t("decisions.emptyTitle")}
            description={t(`pendientes.empty.${tab}`)}
          />
        ) : (
          <ol className="space-y-6">
            {visible.map((p, i) => (
              <li
                key={p.id}
                className="relative pl-8"
                data-testid={`decision-${p.id}`}
              >
                {tab === "pending" ? (
                  <span
                    className={`absolute left-0 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                      i === 0
                        ? "border-[color-mix(in_srgb,var(--warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,var(--card))] text-[var(--warning)]"
                        : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                ) : null}
                {tab === "pending" && i < visible.length - 1 ? (
                  <span
                    className="absolute left-[9px] top-7 bottom-0 w-px bg-[var(--color-border)]"
                    aria-hidden
                  />
                ) : null}
                <div className="lift rounded-xl border border-[var(--color-border)] bg-[var(--card)] p-5 shadow-xs hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusPill status={statusToPill(p.status)}>
                      {statusLabel(t, p.status)}
                    </StatusPill>
                    <span className="text-sm font-semibold">{p.idea.title}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {new Date(p.createdAt).toLocaleString()}
                    </span>
                    {p.decidedAt ? (
                      <span className="text-[var(--color-muted-foreground)]">
                        · {new Date(p.decidedAt).toLocaleString()}
                      </span>
                    ) : null}
                    {p.decidedBy ? (
                      <span className="text-[var(--color-muted-foreground)]">
                        · {t("decisions.by", { actor: p.decidedBy })}
                      </span>
                    ) : null}
                    {p.runId ? (
                      <Link
                        to={`/office/encargos/${p.runId}`}
                        className="interactive inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline"
                      >
                        <GitBranch className="h-3 w-3" aria-hidden />
                        {t("pendientes.viewEncargo")}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      <ScrollText className="h-3 w-3" aria-hidden />
                      {t("decisions.rationale")}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{p.rationale}</p>
                  </div>

                  {p.evidence.length > 0 ? (
                    <DecisionEvidencePanel
                      proposalId={p.id}
                      runId={p.runId}
                      evidence={p.evidence}
                    />
                  ) : null}

                  {tab === "pending" ? (
                    pivotFor === p.id ? (
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
                          onClick={() =>
                            void act(p.id, () => api.decisions.approve(p.id, { actorEmail }))
                          }
                          size="sm"
                        >
                          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("decisions.approve", {
                            decision:
                              p.recommended === "go" ? t("decisions.go") : t("decisions.noGo"),
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
                          onClick={() =>
                            void act(p.id, () => api.decisions.reject(p.id, { actorEmail }))
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("decisions.reject")}
                        </Button>
                        <ChevronRight
                          className="ml-auto h-4 w-4 text-[var(--color-muted-foreground)]"
                          aria-hidden
                        />
                      </div>
                    )
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
