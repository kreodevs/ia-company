import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCollaborationMap, type CollaborationEdge } from "../../lib/api";
import Panel from "../ui/Panel";
import EmptyState from "../ui/EmptyState";
import PageLoading from "../ui/PageLoading";

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
      )}
    </Panel>
  );
}
