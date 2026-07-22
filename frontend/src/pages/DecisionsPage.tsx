import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type DecisionProposal, type DecisionStatus } from "../lib/api";
import PageHeader from "../components/ui/PageHeader";
import PageLoading from "../components/ui/PageLoading";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";

function statusLabel(t: (k: string) => string, s: DecisionStatus): string {
  const key = `decisions.status.${s}`;
  const out = t(key);
  return out === key ? s : out;
}

export default function DecisionsPage() {
  const { t } = useTranslation();
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
    await act(id, () => api.decisions.pivot(id, { pivot: pivotText.trim() }));
    setPivotFor(null);
    setPivotText("");
  };

  if (loading) return <PageLoading message={t("decisions.loading")} />;

  const pending = proposals.filter((p) => p.status === "pending_review" || p.status === "drilling");
  const history = proposals.filter((p) => p.status === "approved" || p.status === "rejected" || p.status === "cancelled");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("decisions.title")}
        subtitle={t("decisions.subtitle")}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t("decisions.pendingHeading", { count: pending.length })}
        </h2>
        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("decisions.empty")}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pending.map((p) => (
              <Card key={p.id} className="space-y-3" data-testid={`decision-${p.id}`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge>{statusLabel(t, p.status)}</Badge>
                  <span className="font-semibold">{p.idea.title}</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {new Date(p.createdAt).toLocaleString()}
                  </span>
                  {p.runId && (
                    <Link
                      to={`/runs/${p.runId}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      run:{p.runId.slice(0, 8)}
                    </Link>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                    {t("decisions.rationale")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{p.rationale}</p>
                </div>

                {p.evidence.length > 0 && (
                  <details className="rounded border border-[var(--color-border)] p-2 text-sm">
                    <summary className="cursor-pointer text-xs font-semibold">
                      {t("decisions.evidence", { count: p.evidence.length })}
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {p.evidence.map((e, i) => (
                        <li key={i}>
                          <p className="text-xs font-semibold">{e.agent}</p>
                          <p className="whitespace-pre-wrap text-xs text-[var(--color-muted-foreground)]">
                            {e.summary}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {pivotFor === p.id ? (
                  <div className="space-y-2 rounded border border-[var(--color-border)] p-2">
                    <Input
                      label={t("decisions.pivotPrompt")}
                      value={pivotText}
                      onChange={(e) => setPivotText(e.target.value)}
                      placeholder={t("decisions.pivotPlaceholder")}
                    />
                    <div className="flex gap-2">
                      <Button
                        disabled={busy === p.id || !pivotText.trim()}
                        onClick={() => void submitPivot(p.id)}
                      >
                        {t("decisions.requestDrilldown")}
                      </Button>
                      <Button
                        variant="ghost"
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={busy === p.id}
                      onClick={() => void act(p.id, () => api.decisions.approve(p.id))}
                    >
                      {t("decisions.approve", {
                        decision: p.recommended === "go" ? t("decisions.go") : t("decisions.noGo"),
                      })}
                    </Button>
                    <Button
                      variant="ghost"
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
                      disabled={busy === p.id}
                      onClick={() => void act(p.id, () => api.decisions.reject(p.id))}
                    >
                      {t("decisions.reject")}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("decisions.historyHeading", { count: history.length })}
          </h2>
          <ul className="space-y-2 text-sm">
            {history.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
              >
                <Badge>{statusLabel(t, p.status)}</Badge>
                <span className="font-medium">{p.idea.title}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {p.decidedAt ? new Date(p.decidedAt).toLocaleString() : ""}
                </span>
                {p.decidedBy && (
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {t("decisions.by", { actor: p.decidedBy })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}