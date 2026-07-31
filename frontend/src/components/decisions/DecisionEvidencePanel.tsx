import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import {
  api,
  type DecisionProposalEvidence,
  type OfficeEncargoDocument,
} from "../../lib/api";
import { buildEvidenceChipItems } from "../../lib/decision-evidence";
import { avatarGradient } from "../../lib/office-visual";
import { Dialog } from "../molecules/Dialog";
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

  if (evidence.length === 0) return null;

  const openChip = (chip: (typeof chips)[number]) => {
    if (chip.document?.markdown) {
      setOpenDoc({
        title: chip.document.title,
        markdown: chip.document.markdown,
        displayName: chip.displayName,
        roleLabel: chip.roleLabel,
        partial: false,
      });
      return;
    }
    setOpenDoc({
      title: chip.displayName,
      markdown: chip.summary,
      displayName: chip.displayName,
      roleLabel: chip.roleLabel,
      partial: true,
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
                className="office-agent-chip interactive text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
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

      <Dialog
        visible={openDoc !== null}
        onHide={() => setOpenDoc(null)}
        size="full"
        title={openDoc?.title ?? ""}
        description={
          openDoc
            ? `${openDoc.displayName} · ${openDoc.roleLabel}`
            : undefined
        }
        className="max-h-[90vh] flex flex-col"
      >
        {openDoc?.partial ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
            {t("decisions.documentUnavailable")}
          </p>
        ) : null}
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto pr-1">
          <RichMarkdownView value={openDoc?.markdown ?? ""} />
        </div>
      </Dialog>
    </>
  );
}
