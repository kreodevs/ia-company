import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCollaborationMap, type CollaborationEdge } from "../../lib/api";
import Panel from "../ui/Panel";
import EmptyState from "../ui/EmptyState";
import PageLoading from "../ui/PageLoading";

function CollaborationGraph({ edges }: { edges: CollaborationEdge[] }) {
  const layout = useMemo(() => {
    const nodes = new Map<string, { id: string; label: string; slug: string }>();
    for (const edge of edges) {
      nodes.set(edge.fromOrgUnitId, {
        id: edge.fromOrgUnitId,
        label: edge.fromName,
        slug: edge.fromSlug,
      });
      nodes.set(edge.toOrgUnitId, {
        id: edge.toOrgUnitId,
        label: edge.toName,
        slug: edge.toSlug,
      });
    }
    const list = [...nodes.values()];
    const cx = 160;
    const cy = 120;
    const r = 90;
    const positions = new Map<string, { x: number; y: number }>();
    list.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(list.length, 1) - Math.PI / 2;
      positions.set(node.id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    });
    return { list, positions, width: 320, height: 240 };
  }, [edges]);

  if (layout.list.length < 2) return null;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="mx-auto mb-4 max-w-full text-[var(--foreground-muted)]"
      role="img"
      aria-label="Grafo de colaboración entre departamentos"
    >
      {edges.map((edge) => {
        const from = layout.positions.get(edge.fromOrgUnitId);
        const to = layout.positions.get(edge.toOrgUnitId);
        if (!from || !to) return null;
        const strokeWidth = Math.min(4, 1 + edge.totalCount * 0.35);
        return (
          <line
            key={`${edge.fromOrgUnitId}-${edge.toOrgUnitId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="var(--primary)"
            strokeOpacity={0.35}
            strokeWidth={strokeWidth}
          />
        );
      })}
      {layout.list.map((node) => {
        const pos = layout.positions.get(node.id);
        if (!pos) return null;
        const href =
          node.slug.startsWith("virtual:") || node.id.startsWith("virtual:")
            ? `/office/departments/${node.slug.replace(/^virtual:/, "")}`
            : `/office/departments/${encodeURIComponent(node.slug)}`;
        return (
          <g key={node.id}>
            <circle cx={pos.x} cy={pos.y} r={18} fill="var(--background)" stroke="var(--primary)" strokeWidth={1.5} />
            <text
              x={pos.x}
              y={pos.y + 28}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
            >
              <title>{node.label}</title>
              {node.label.slice(0, 14)}
            </text>
            <a href={href} aria-hidden>
              <circle cx={pos.x} cy={pos.y} r={18} fill="transparent" />
            </a>
          </g>
        );
      })}
    </svg>
  );
}

/** Fase E — mapa de colaboración entre departamentos (handoffs). */
export function CollaborationMapPanel() {
  const [edges, setEdges] = useState<CollaborationEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCollaborationMap()
      .then((m) => setEdges(m.edges))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Cargando colaboración…" />;
  if (error) return <EmptyState title="Colaboración" description={error} />;

  return (
    <Panel title="Colaboración entre departamentos" subtitle="Handoffs en los últimos 90 días (Fase E)">
      {edges.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)]">Sin handoffs entre unidades todavía.</p>
      ) : (
        <>
          <CollaborationGraph edges={edges} />
          <ul className="divide-y divide-[var(--border)] text-sm">
            {edges.map((edge) => (
              <li key={`${edge.fromOrgUnitId}-${edge.toOrgUnitId}`} className="flex flex-wrap items-center gap-2 py-2">
                <Link className="font-medium text-[var(--primary)] hover:underline" to={`/office/departments/${edge.fromSlug}`}>
                  {edge.fromName}
                </Link>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--foreground-muted)]" aria-hidden />
                <Link className="font-medium text-[var(--primary)] hover:underline" to={`/office/departments/${edge.toSlug}`}>
                  {edge.toName}
                </Link>
                <span className="ml-auto tabular-nums text-[var(--foreground-muted)]">
                  {edge.totalCount} total
                  {edge.pendingCount > 0 ? ` · ${edge.pendingCount} pend.` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
