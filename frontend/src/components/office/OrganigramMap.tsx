import { useEffect, useMemo, useState } from "react";
import { getDashboard, getOrganigram, type OrganigramNode, type OfficeDepartmentRoom } from "../../lib/api";
import PageLoading from "../ui/PageLoading";
import EmptyState from "../ui/EmptyState";
import { DepartmentOrgCard } from "./DepartmentOrgCard";

/**
 * Fase E — mapa jerárquico de departamentos con tarjetas Kreo y enlaces a salas.
 */
export const OrganigramMap: React.FC = () => {
  const [tree, setTree] = useState<OrganigramNode[]>([]);
  const [rooms, setRooms] = useState<OfficeDepartmentRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrganigram(), getDashboard()])
      .then(([org, dash]) => {
        setTree(org);
        setRooms(dash.departments ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error loading organigram"))
      .finally(() => setLoading(false));
  }, []);

  const roomBySlug = useMemo(() => {
    const map = new Map<string, OfficeDepartmentRoom>();
    for (const room of rooms) {
      map.set(room.slug, room);
    }
    return map;
  }, [rooms]);

  if (loading) return <PageLoading message="Cargando organigrama…" />;
  if (error) {
    return (
      <EmptyState title="Organigrama no disponible" description={error} />
    );
  }
  if (!tree.length) {
    return (
      <EmptyState
        title="Sin unidades organizativas"
        description="Crea departamentos en Ajustes → Unidades org. o usa Org Studio."
      />
    );
  }

  return (
    <div className="organigram-map space-y-4">
      {tree.map((node) => {
        const room = roomBySlug.get(node.slug);
        return (
          <DepartmentOrgCard
            key={node.id}
            node={node}
            roomStatus={room?.status}
            agentCount={room?.agentNames?.length}
          />
        );
      })}
    </div>
  );
};
