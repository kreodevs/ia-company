import React, { useEffect, useState } from 'react';
import { getInitiatives } from '../lib/api';

/**
 * Simple component that lists initiatives linked to objectives.
 */
export const Initiatives: React.FC = () => {
  const [initiatives, setInitiatives] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInitiatives()
      .then(setInitiatives)
      .catch((e) => setError(e.message ?? 'Error loading initiatives'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!initiatives.length) return <div>Loading initiatives…</div>;

  return (
    <div className="initiatives">
      <h2>Iniciativas</h2>
      <ul>
        {initiatives.map((init) => (
          <li key={init.id}>
            <strong>{init.name}</strong> – Estado: {init.status}
          </li>
        ))}
      </ul>
    </div>
  );
};
