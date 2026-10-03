import React, { useCallback, useState } from 'react';
import { Initiatives } from '../components/office/Initiatives';
import { InitiativeForm } from '../components/office/InitiativeForm';

/**
 * Page that shows the list of initiatives and the form to create/edit them.
 */
export const OfficeInitiativesPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="office-initiatives-page" style={{ padding: '1rem' }}>
      <h1>Iniciativas empresariales</h1>
      <InitiativeForm onSuccess={handleSuccess} />
      <hr />
      <Initiatives key={refreshKey} />
    </div>
  );
};
