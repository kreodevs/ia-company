import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 scroll-mt-24 border-b border-[var(--color-border)] pb-3 text-3xl font-bold tracking-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-10 scroll-mt-24 border-b border-[var(--color-border)]/60 pb-2 text-xl font-semibold">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-8 scroll-mt-24 text-lg font-semibold text-[var(--color-foreground)]">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-6 text-base font-medium text-[var(--color-muted-foreground)]">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-[var(--color-muted-foreground)] [&+ul]:mt-0 [&+ol]:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-2 pl-6 text-[var(--color-muted-foreground)]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-6 text-[var(--color-muted-foreground)]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--color-foreground)]">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-[var(--color-foreground)]/90">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-[var(--color-primary)] bg-[var(--color-muted)]/40 py-2 pl-4 pr-3 italic text-[var(--color-foreground)]/90">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-[var(--color-border)]" />,
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`block font-mono text-[13px] leading-relaxed text-[var(--color-foreground)] ${className ?? ""}`}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-accent)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-6 overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/60">{children}</thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-[var(--color-muted)]/30">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold text-[var(--color-foreground)]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{children}</td>
  ),
};

interface MarkdownDocProps {
  content: string;
  className?: string;
}

export default function MarkdownDoc({ content, className = "" }: MarkdownDocProps) {
  return (
    <article className={`markdown-doc max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
