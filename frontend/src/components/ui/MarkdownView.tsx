import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownViewProps {
  value: string;
  className?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}

export default function MarkdownView({
  value,
  className = "",
  ariaLabel,
  emptyMessage,
}: MarkdownViewProps) {
  if (!value.trim()) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6 text-center text-xs italic text-[var(--color-muted-foreground)]">
        {emptyMessage ?? "—"}
      </p>
    );
  }

  return (
    <article
      aria-label={ariaLabel}
      className={`min-h-[8rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
    </article>
  );
}
