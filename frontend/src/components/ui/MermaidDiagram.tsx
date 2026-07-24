import { useEffect, useId, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const reactId = useId().replace(/:/g, "");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
        });
        const id = `mermaid-${reactId}-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not render diagram");
          setSvg("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <pre className={`overflow-x-auto rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100 ${className}`}>
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div
        className={`flex min-h-[4rem] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted-foreground)] ${className}`}
      >
        …
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`office-markdown-mermaid overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
