import React from 'react';
import { Objectives } from '../components/office/Objectives';
import { Initiatives } from '../components/office/Initiatives';
import { Dashboard as CostDashboard } from '../components/office/Dashboard'; // Reuse Dashboard component for cost metrics

/**
 * Page that aggregates Corte 4 UI: objectives, initiatives and cost metrics.
 */
export const OfficeStrategyPage: React.FC = () => (
  <div className="office-strategy-page">
    <h1>Estrategia empresarial</h1>
    <Objectives />
    <Initiatives />
    {/* Cost metrics can be displayed using the existing Dashboard component */}
    <CostDashboard />
  </div>
);
