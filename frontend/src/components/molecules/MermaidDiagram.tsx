import { useEffect, useId, useMemo, useState } from "react";
import { AlertCircle, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { initMermaidTheme } from "./mermaidRenderUtils";
import { repairMermaidSource } from "./mermaidRepairUtils";

export interface MermaidDiagramProps {
  code: string;
  autoRepair?: boolean;
  compact?: boolean;
  className?: string;
  emptyMessage?: string;
  allowFullscreen?: boolean;
  onStatus?: (status: { valid: boolean; error?: string }) => void;
}

function MermaidSvgCanvas({
  svg,
  loading,
  variant,
}: {
  svg: string;
  loading: boolean;
  variant: "inline" | "fullscreen";
}) {
  return (
    <div
      className={cn(
        "mermaid-diagram flex justify-center [&_svg]:h-auto [&_svg]:w-auto",
        variant === "inline"
          ? "[&_svg]:max-h-full [&_svg]:max-w-full"
          : "[&_svg]:max-h-none [&_svg]:max-w-none [&_svg]:min-w-max",
        loading && "opacity-60",
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const MermaidDiagram = ({
  code,
  autoRepair = true,
  compact = false,
  className,
  emptyMessage = "Diagrama Mermaid vacío.",
  allowFullscreen = true,
  onStatus,
}: MermaidDiagramProps) => {
  const renderId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const renderCode = useMemo(() => {
    if (!code.trim()) return "";
    return autoRepair ? repairMermaidSource(code).repaired : code;
  }, [code, autoRepair]);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!renderCode.trim()) {
        setSvg("");
        setError(null);
        onStatus?.({ valid: false, error: "Diagrama vacío" });
        return;
      }

      setLoading(true);
      try {
        const mermaid = await initMermaidTheme();
        await mermaid.parse(renderCode);
        const { svg: rendered } = await mermaid.render(
          `mermaid-${renderId}-${Date.now()}`,
          renderCode,
        );
        if (cancelled) return;
        setSvg(rendered);
        setError(null);
        onStatus?.({ valid: true });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setSvg("");
        setError(message);
        onStatus?.({ valid: false, error: message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [renderCode, onStatus, renderId]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  if (!renderCode.trim()) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-[var(--spacing-md)] text-sm italic text-[var(--foreground-muted)]",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-md)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 p-[var(--spacing-md)]",
          className,
        )}
      >
        <div className="flex items-start gap-[var(--spacing-sm)] text-sm text-[var(--destructive)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Error Mermaid</p>
            <pre className="mt-[var(--spacing-xs)] whitespace-pre-wrap font-mono text-xs leading-relaxed opacity-90">
              {error}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  const shellClass = cn(
    "overflow-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)]",
    compact ? "p-[var(--spacing-sm)]" : "p-[var(--spacing-lg)]",
  );

  return (
    <>
      <div className={cn("relative", className)}>
        <div className={shellClass}>
          <MermaidSvgCanvas svg={svg} loading={loading} variant="inline" />
        </div>

        {allowFullscreen && (
          <button
            type="button"
            aria-label="Ver diagrama a pantalla completa"
            onClick={() => setFullscreen(true)}
            className={cn(
              "absolute top-[var(--spacing-sm)] right-[var(--spacing-sm)] z-[var(--z-sticky)]",
              "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]",
              "border border-[var(--border)] bg-[var(--background)]/80 text-[var(--foreground)]",
              "opacity-80 shadow-sm backdrop-blur-sm",
              "transition-transform duration-[var(--transition-base)]",
              "focus-visible:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              "active:scale-95",
            )}
          >
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-[var(--background)]/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Diagrama a pantalla completa"
        >
          <div className="flex shrink-0 items-center justify-end gap-[var(--spacing-sm)] border-b border-[var(--border)] px-[var(--spacing-md)] py-[var(--spacing-sm)]">
            <button
              type="button"
              aria-label="Cerrar pantalla completa"
              onClick={() => setFullscreen(false)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]",
                "border border-[var(--border)] bg-[var(--card)]/90 text-[var(--foreground)]",
                "backdrop-blur-sm transition-all duration-[var(--transition-base)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                "active:scale-95",
              )}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-[var(--spacing-md)] sm:p-[var(--spacing-lg)]">
            <div className={cn(shellClass, "mx-auto min-h-full w-max max-w-none")}>
              <MermaidSvgCanvas svg={svg} loading={loading} variant="fullscreen" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

MermaidDiagram.displayName = "MermaidDiagram";

export default MermaidDiagram;
