import React, { useEffect, useState } from 'react';
import { getOrganigram } from '../../lib/api';

/**
 * Simple component that displays the department organigram as a nested list.
 * It fetches data from `/office/organigram` via the API helper.
 */
export const OrganigramMap: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrganigram()
      .then((data) => setData(data))
      .catch((e: any) => setError(e.message ?? 'Error loading organigram'));
  }, []);

  const renderNode = (node: any) => (
    <li key={node.id}>
      {node.name} (work items: {node.workItemCount})
      {node.children && node.children.length > 0 && (
        <ul>{node.children.map(renderNode)}</ul>
      )}
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
