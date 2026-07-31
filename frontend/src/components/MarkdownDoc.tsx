import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import {
  createHeadingSlugger,
  extractHashId,
  getNodeText,
  isSamePageHashLink,
  scrollToHeading,
} from "../lib/markdown-slug";
import MermaidDiagram from "./ui/MermaidDiagram";

function makeHeading(
  Tag: "h1" | "h2" | "h3" | "h4",
  className: string,
  slugger: (text: string) => string,
) {
  return ({ children }: { children?: ReactNode }) => {
    const id = slugger(getNodeText(children));
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  };
}

interface MarkdownDocProps {
  content: string;
  className?: string;
  tocId?: string;
  onSectionLink?: (sectionId: string) => void;
}

export default function MarkdownDoc({
  content,
  className = "",
  tocId,
  onSectionLink,
}: MarkdownDocProps) {
  const { t } = useTranslation();
  const [showBackToToc, setShowBackToToc] = useState(false);

  const components = useMemo(() => {
    const slugger = createHeadingSlugger();

    const handleHashClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      event.preventDefault();
      const sectionId = extractHashId(href);
      if (!sectionId) return;
      if (onSectionLink) {
        onSectionLink(sectionId);
        return;
      }
      scrollToHeading(sectionId);
    };

    const base: Components = {
      h1: makeHeading(
        "h1",
        "mb-4 mt-8 scroll-mt-28 border-b border-[var(--color-border)] pb-3 text-3xl font-bold tracking-tight first:mt-0",
        slugger,
      ),
      h2: makeHeading(
        "h2",
        "mb-3 mt-10 scroll-mt-28 border-b border-[var(--color-border)]/60 pb-2 text-xl font-semibold",
        slugger,
      ),
      h3: makeHeading(
        "h3",
        "mb-2 mt-8 scroll-mt-28 text-lg font-semibold text-[var(--color-foreground)]",
        slugger,
      ),
      h4: makeHeading(
        "h4",
        "mb-2 mt-6 scroll-mt-28 text-base font-medium text-[var(--color-muted-foreground)]",
        slugger,
      ),
      p: ({ children }) => (
        <p className="mb-4 leading-7 text-[var(--color-muted-foreground)] [&+ol]:mt-0 [&+ul]:mt-0">
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
      a: ({ href, children }) => {
        const isHash = href ? isSamePageHashLink(href) : false;
        const isExternal = href?.startsWith("http");

        return (
          <a
            href={href}
            className="interactive font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            onClick={isHash && href ? (event) => handleHashClick(event, href) : undefined}
          >
            {children}
          </a>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="mb-4 border-l-4 border-[var(--color-primary)] bg-[var(--color-muted)]/40 py-2 pl-4 pr-3 italic text-[var(--color-foreground)]/90">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-10 border-[var(--color-border)]" />,
      code: ({ className: codeClassName, children, ...props }) => {
        const match = /language-(\w+)/.exec(codeClassName ?? "");
        const lang = match?.[1]?.toLowerCase();
        const text = String(children).replace(/\n$/, "");

        if (lang === "mermaid") {
          return <MermaidDiagram chart={text} className="my-4" />;
        }

        const isBlock = codeClassName?.includes("language-");
        if (isBlock) {
          return (
            <code
              className={`block font-mono text-[13px] leading-relaxed text-[var(--color-foreground)] ${codeClassName ?? ""}`}
              {...props}
            >
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
      pre: ({ children, ...props }) => {
        const child = Array.isArray(children) ? children[0] : children;
        if (
          child &&
          typeof child === "object" &&
          "props" in child &&
          child.props?.className?.includes("language-mermaid")
        ) {
          return <>{children}</>;
        }
        return (
          <pre
            className="mb-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4"
            {...props}
          >
            {children}
          </pre>
        );
      },
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

    return base;
  }, [content, onSectionLink]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const id = extractHashId(hash);
    if (!id) return;
    const timer = window.setTimeout(() => scrollToHeading(id), 0);
    return () => window.clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (!tocId) return;

    const tocEl = document.getElementById(tocId);
    if (!tocEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBackToToc(!entry?.isIntersecting);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    observer.observe(tocEl);
    return () => observer.disconnect();
  }, [content, tocId]);

  return (
    <>
      <article className={`markdown-doc max-w-none ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </article>

      {tocId && showBackToToc ? (
        <button
          type="button"
          onClick={() => scrollToHeading(tocId)}
          className="interactive fixed bottom-6 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/25 backdrop-blur-sm sm:bottom-8 sm:right-8"
          aria-label={t("help.backToToc")}
        >
          <span aria-hidden>↑</span>
          {t("help.backToToc")}
        </button>
      ) : null}
    </>
  );
}
