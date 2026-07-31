import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FileText, X } from "lucide-react";
import {
  api,
  type DecisionProposalEvidence,
  type OfficeEncargoDocument,
} from "../../lib/api";
import { buildEvidenceChipItems } from "../../lib/decision-evidence";
import { avatarGradient } from "../../lib/office-visual";
import RichMarkdownView from "../ui/RichMarkdownView";

export interface DecisionEvidencePanelProps {
  proposalId: string;
  runId?: string | null;
  evidence: DecisionProposalEvidence[];
  /** When provided, skips fetching documents from the API. */
  documents?: OfficeEncargoDocument[] | null;
}

interface OpenDocument {
  title: string;
  markdown: string;
  displayName: string;
  roleLabel: string;
  partial: boolean;
}

export default function DecisionEvidencePanel({
  proposalId,
  runId,
  evidence,
  documents: documentsProp,
}: DecisionEvidencePanelProps) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<OfficeEncargoDocument[] | null>(
    documentsProp ?? null,
  );
  const [loading, setLoading] = useState(!documentsProp && Boolean(runId));
  const [openDoc, setOpenDoc] = useState<OpenDocument | null>(null);

  useEffect(() => {
    if (documentsProp) {
      setDocuments(documentsProp);
      setLoading(false);
      return;
    }
    if (!runId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.decisions
      .documents(proposalId)
      .then((res) => {
        if (!cancelled) setDocuments(res.documents);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId, runId, documentsProp]);

  const chips = useMemo(
    () => buildEvidenceChipItems(evidence, documents, t),
    [evidence, documents, t],
  );

  const closeDoc = useCallback(() => setOpenDoc(null), []);

  useEffect(() => {
    if (!openDoc) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDoc();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openDoc, closeDoc]);

  if (evidence.length === 0) return null;

  const openChip = (chip: (typeof chips)[number]) => {
    const markdown = chip.document?.markdown?.trim() || chip.summary.trim();
    setOpenDoc({
      title: chip.document?.title?.trim() || chip.displayName,
      markdown,
      displayName: chip.displayName,
      roleLabel: chip.roleLabel,
      partial: !chip.document?.markdown?.trim(),
    });
  };

  return (
    <>
      <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted-foreground)]">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t("decisions.evidenceAuthors", { count: evidence.length })}
        </p>
        {loading ? (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {t("decisions.documentLoading")}
          </p>
        ) : (
          <div className="office-agent-chips mt-3">
            {chips.map((chip) => (
              <button
                key={chip.agent}
                type="button"
                className="office-agent-chip cursor-pointer text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                onClick={() => openChip(chip)}
                aria-label={t("decisions.viewDocument", { name: chip.displayName })}
              >
                <span
                  className="office-agent-chip-avatar"
                  style={{ background: avatarGradient(chip.agent) }}
                  aria-hidden
                >
                  {chip.emoji}
                </span>
                <span>
                  <strong className="block text-sm leading-tight">{chip.displayName}</strong>
                  <span className="text-[0.72rem] text-[var(--color-muted-foreground)]">
                    {chip.roleLabel}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {openDoc &&
        createPortal(
          <div
            className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/40 backdrop-blur-sm"
            role="presentation"
            onClick={closeDoc}
          >
            <div
              className="flex w-[85%] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--background)] shadow-xl"
              style={{ marginTop: 50, marginBottom: 50, maxHeight: "calc(100vh - 100px)" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`decision-doc-title-${proposalId}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <h2
                    id={`decision-doc-title-${proposalId}`}
                    className="truncate text-lg font-semibold text-[var(--foreground)]"
                  >
                    {openDoc.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                    {openDoc.displayName} · {openDoc.roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  onClick={closeDoc}
                  aria-label={t("common.close", { defaultValue: "Cerrar" })}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                {openDoc.partial ? (
                  <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                    {t("decisions.documentUnavailable")}
                  </p>
                ) : null}
                <RichMarkdownView
                  value={openDoc.markdown}
                  emptyMessage={t("decisions.documentEmpty", {
                    defaultValue: "No hay contenido disponible para este informe.",
                  })}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
