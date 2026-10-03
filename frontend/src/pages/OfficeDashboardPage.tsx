import React from 'react';
import { Dashboard } from '../components/office/Dashboard';

/**
 * Page showing the business dashboard.
 */
export const OfficeDashboardPage: React.FC = () => (
  <div className="office-dashboard-page">
    <h1>Dashboard empresarial</h1>
    <Dashboard />
  </div>
);
