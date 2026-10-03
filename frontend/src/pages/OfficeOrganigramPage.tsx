import React from 'react';
import { OrganigramMap } from '../components/office/OrganigramMap';

/**
 * Page showing the department organigram.
 */
export const OfficeOrganigramPage: React.FC = () => (
  <div className="office-organigram-page">
    <h1>Organigrama de la empresa</h1>
    <OrganigramMap />
  </div>
);
