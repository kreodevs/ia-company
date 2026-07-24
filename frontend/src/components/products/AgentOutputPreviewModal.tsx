import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import Button from "../ui/Button";
import RichMarkdownView from "../ui/RichMarkdownView";

export interface AgentOutputPreviewModalProps {
  open: boolean;
  agentName: string;
  stepOrder: number;
  output: string;
  onClose: () => void;
}

export default function AgentOutputPreviewModal({
  open,
  agentName,
  stepOrder,
  output,
  onClose,
}: AgentOutputPreviewModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-output-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[min(88vh,900px)] w-full max-w-4xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <div>
            <h2 id="agent-output-preview-title" className="text-base font-semibold">
              {t("consensus.lastRun.previewTitle", { agent: agentName, step: stepOrder })}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {t("consensus.lastRun.previewSubtitle")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <RichMarkdownView
            value={output}
            ariaLabel={t("consensus.lastRun.previewAria", { agent: agentName })}
            emptyMessage={t("consensus.lastRun.emptyOutput")}
          />
        </div>
        <div className="border-t border-[var(--color-border)] px-4 py-3 sm:px-5 sm:text-right">
          <Button variant="secondary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
