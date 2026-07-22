import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
}

export default function MarkdownPreview({
  value,
  onChange,
  rows = 16,
  placeholder,
  ariaLabel,
}: MarkdownPreviewProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
          {t("common.markdown")}
        </span>
        <div className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-background)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("edit")}
            aria-pressed={mode === "edit"}
            className={`interactive inline-flex items-center gap-1 rounded px-2 py-1 ${
              mode === "edit"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Pencil className="h-3 w-3" aria-hidden />
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            aria-pressed={mode === "preview"}
            className={`interactive inline-flex items-center gap-1 rounded px-2 py-1 ${
              mode === "preview"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            <Eye className="h-3 w-3" aria-hidden />
            {t("common.preview")}
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="interactive w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 font-mono text-xs sm:py-2"
        />
      ) : value.trim() ? (
        <article
          aria-label={ariaLabel}
          className="interactive min-h-[8rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
        </article>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 text-center text-xs italic text-[var(--color-muted-foreground)]">
          {t("common.emptyPreview")}
        </p>
      )}
    </div>
  );
}