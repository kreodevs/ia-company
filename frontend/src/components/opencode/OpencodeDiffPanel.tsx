import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface OpencodeDiffEntry {
  path: string;
  additions: number | null;
  deletions: number | null;
}

interface OpencodeDiffPanelProps {
  diff: OpencodeDiffEntry[];
  resultSummary?: string | null;
  sessionId?: string | null;
  title?: string;
}

export default function OpencodeDiffPanel({
  diff,
  resultSummary,
  sessionId,
  title,
}: OpencodeDiffPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (!resultSummary && diff.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <h3 className="font-semibold">{title ?? t("opencode.diff.title")}</h3>
        <span className="text-xs text-[var(--color-muted-foreground)]">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {sessionId && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {t("opencode.diff.session")}: <code>{sessionId}</code>
            </p>
          )}
          {resultSummary && (
            <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--color-background)] p-3 text-xs whitespace-pre-wrap">
              {resultSummary}
            </pre>
          )}
          {diff.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {diff.map((entry) => (
                <li
                  key={entry.path}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-2 py-1 font-mono text-xs"
                >
                  <span className="truncate">{entry.path}</span>
                  <span className="shrink-0 text-[var(--color-muted-foreground)]">
                    {entry.additions != null || entry.deletions != null
                      ? t("opencode.diff.stats", {
                          add: entry.additions ?? 0,
                          del: entry.deletions ?? 0,
                        })
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">{t("opencode.diff.empty")}</p>
          )}
        </div>
      )}
    </section>
  );
}
