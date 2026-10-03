import React, { useEffect, useState } from 'react';
import { getObjectives } from '../../lib/api';

/**
 * Simple component that lists business objectives.
 */
export const Objectives: React.FC = () => {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getObjectives()
      .then((data) => setObjectives(data))
      .catch((e: any) => setError(e.message ?? 'Error loading objectives'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!objectives.length) return <div>Loading objectives…</div>;

  return (
    <div className="objectives">
      <h2>Objetivos empresariales</h2>
      <ul>
        {objectives.map((obj) => (
          <li key={obj.id}>
            <strong>{obj.name}</strong>: {obj.description}<br />
            Meta: {obj.targetValue}% – Actual: {obj.currentValue}%
          </li>
        ))}
      </ul>
    </div>
  );
};
