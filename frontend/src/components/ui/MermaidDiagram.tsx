import KreoMermaidDiagram from "@/components/molecules/MermaidDiagram";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export default function MermaidDiagram({ chart, className = "" }: MermaidDiagramProps) {
  return (
    <KreoMermaidDiagram
      code={chart}
      compact
      className={className}
      allowFullscreen={false}
      autoRepair
    />
  );
}
