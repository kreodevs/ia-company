import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownChartBlock from "./MarkdownChartBlock";
import MermaidDiagram from "./MermaidDiagram";

export interface RichMarkdownViewProps {
  value: string;
  className?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1]?.toLowerCase();
    const text = String(children).replace(/\n$/, "");

    if (lang === "mermaid") {
      return <MermaidDiagram chart={text} />;
    }
    if (lang === "chart") {
      return <MarkdownChartBlock specText={text} />;
    }

    const inline = !className;
    if (inline) {
      return (
        <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 text-[0.85em]" {...props}>
          {children}
        </code>
      );
    }

    return (
      <pre className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
};

export default function RichMarkdownView({
  value,
  className = "",
  ariaLabel,
  emptyMessage,
}: RichMarkdownViewProps) {
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
      className={`office-rich-markdown min-h-[8rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert ${className}`}
    >
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {value}
      </Markdown>
    </article>
  );
}
