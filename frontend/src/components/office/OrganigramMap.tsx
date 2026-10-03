import React, { useEffect, useState } from "react";
import { getOrganigram, type OrganigramNode } from "../../lib/api";

export const OrganigramMap: React.FC = () => {
  const [data, setData] = useState<OrganigramNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrganigram()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Error loading organigram"));
  }, []);

  const renderNode = (node: OrganigramNode) => (
    <li key={node.id}>
      {node.name}
      <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {node.type}
      </span>
      <span className="ml-2 text-xs">({node.workItemCount} work items)</span>
      {node.children.length > 0 && <ul className="ml-4 mt-1">{node.children.map(renderNode)}</ul>}
    </li>
  );

  if (error) return <div className="error">{error}</div>;
  if (!data.length) return <div>Loading organigram…</div>;

  return (
    <div className="organigram-map">
      <h2>Organigrama de departamentos</h2>
      <ul>{data.map(renderNode)}</ul>
    </div>
  );
};
