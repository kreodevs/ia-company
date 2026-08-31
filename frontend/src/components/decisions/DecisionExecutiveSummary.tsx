import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Sparkles } from "lucide-react";
import type {
  DecisionProposalEvidence,
  GoNoGoDecision,
} from "../../lib/api";
import { resolveEvidenceChip } from "../../lib/decision-evidence";
import RichMarkdownView from "../ui/RichMarkdownView";

export type EncargoSummaryKind = "summary" | "agent" | "none";

export interface DecisionExecutiveSummaryProps {
  recommended: GoNoGoDecision;
  rationale: string;
  encargoSummary?: string | null;
  encargoSummaryKind?: EncargoSummaryKind | null;
  evidence?: DecisionProposalEvidence[];
  ideaTitle?: string;
}

function isWeakRationale(rationale: string, ideaTitle?: string): boolean {
  const trimmed = rationale.trim();
  if (!/^Recommended (GO|NO-GO):/i.test(trimmed)) return false;
  if (!ideaTitle) return true;
  const tail = trimmed.replace(/^Recommended (GO|NO-GO):\s*/i, "").trim();
  return tail === ideaTitle.trim();
}

function truncateSummary(text: string, max = 280): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}…`;
}

export default function DecisionExecutiveSummary({
  recommended,
  rationale,
  encargoSummary,
  encargoSummaryKind,
  evidence = [],
  ideaTitle,
}: DecisionExecutiveSummaryProps) {
  const { t } = useTranslation();

  const showRationale = useMemo(
    () => rationale.trim() && !isWeakRationale(rationale, ideaTitle),
    [rationale, ideaTitle],
  );

  const evidenceExtracts = useMemo(
    () =>
      evidence
        .filter((entry) => entry.summary.trim())
        .map((entry) => ({
          ...resolveEvidenceChip(entry.agent, entry.summary, t),
          excerpt: truncateSummary(entry.summary),
        })),
    [evidence, t],
  );

  const hasEncargoSummary = Boolean(encargoSummary?.trim());
  const recommendationLabel =
    recommended === "go" ? t("decisions.go") : t("decisions.noGo");

  return (
    <div className="mt-4 space-y-3">
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 ${
          recommended === "go"
            ? "border-[color-mix(in_srgb,var(--success)_40%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,var(--card))]"
            : "border-[color-mix(in_srgb,var(--destructive)_35%,transparent)] bg-[color-mix(in_srgb,var(--destructive)_8%,var(--card))]"
        }`}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {t("decisions.recommendationLabel")}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
            recommended === "go"
              ? "bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]"
              : "bg-[color-mix(in_srgb,var(--destructive)_15%,transparent)] text-[var(--destructive)]"
          }`}
        >
          {recommendationLabel}
        </span>
        {isWeakRationale(rationale, ideaTitle) ? (
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {rationale}
          </span>
        ) : null}
      </div>

      {hasEncargoSummary ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            <FileText className="h-3 w-3" aria-hidden />
            {t("decisions.encargoSummaryTitle")}
          </p>
          {encargoSummaryKind === "summary" ? (
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              {t("decisions.encargoSummarySubtitle")}
            </p>
          ) : encargoSummaryKind === "agent" ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
              {t("decisions.encargoSummaryFallback")}
            </p>
          ) : null}
          <div className="mt-3 max-h-[28rem] overflow-y-auto">
            <RichMarkdownView
              value={encargoSummary!}
              emptyMessage={t("decisions.encargoSummaryEmpty")}
            />
          </div>
        </div>
      ) : evidenceExtracts.length > 0 ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            <FileText className="h-3 w-3" aria-hidden />
            {t("decisions.evidenceExtractsTitle")}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {t("decisions.evidenceExtractsSubtitle")}
          </p>
          <ul className="mt-3 space-y-3">
            {evidenceExtracts.map((entry) => (
              <li
                key={entry.agent}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3"
              >
                <p className="text-sm font-semibold">
                  <span aria-hidden>{entry.emoji} </span>
                  {entry.displayName}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  {entry.excerpt}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
          {t("decisions.encargoSummaryEmpty")}
        </p>
      )}

      {showRationale ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t("decisions.rationale")}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{rationale}</p>
        </div>
      ) : null}
    </div>
  );
}
