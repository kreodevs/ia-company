import React, { useEffect, useState } from 'react';
import { getDashboardLegacy } from '../../lib/api';

/**
 * Dashboard component showing aggregated business metrics.
 * Fetches data from `/office/dashboard` via the API helper.
 */
export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardLegacy()
      .then(setMetrics)
      .catch((e) => setError(e.message ?? 'Error loading dashboard'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!metrics) return <div>Loading dashboard…</div>;

  const {
    totalCostUsd,
    activeRuns,
    pendingDecisions,
    pendingHandoffs,
    pendingReviews,
  } = metrics;

  return (
    <div className="dashboard">
      <h2>Dashboard empresarial</h2>
      <div className="cards">
        <div className="card"><strong>Total coste (USD):</strong> {totalCostUsd.toFixed(2)}</div>
        <div className="card"><strong>Runs activos:</strong> {activeRuns}</div>
        <div className="card"><strong>Decisiones pendientes:</strong> {pendingDecisions}</div>
        <div className="card"><strong>Handoffs pendientes:</strong> {pendingHandoffs}</div>
        <div className="card"><strong>Revisiones pendientes:</strong> {pendingReviews}</div>
      </div>
    </div>
  );
};
