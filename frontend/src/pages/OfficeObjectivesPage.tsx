import React, { useCallback, useState } from 'react';
import { Objectives } from '../components/office/Objectives';
import { ObjectiveForm } from '../components/office/ObjectiveForm';

/**
 * Page that shows the list of objectives and the form to create/edit them.
 * After a successful create/update/delete, it refreshes the list.
 */
export const OfficeObjectivesPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    // Increment key to force re‑render of the list component (which fetches data on mount).
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="office-objectives-page" style={{ padding: '1rem' }}>
      <h1>Objetivos empresariales</h1>
      <ObjectiveForm onSuccess={handleSuccess} />
      <hr />
      {/* Pass a key so the component reloads when refreshKey changes */}
      <Objectives key={refreshKey} />
    </div>
  );
};
