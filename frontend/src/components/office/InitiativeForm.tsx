import React, { useState } from 'react';
import { createInitiative, updateInitiative, deleteInitiative } from '../../lib/api';

/**
 * Simple form for creating or editing an Initiative.
 * Props `initial` can be used for edit mode; if omitted, the form creates a new initiative.
 */
export const InitiativeForm: React.FC<{ initial?: any; onSuccess?: () => void }> = ({ initial, onSuccess }) => {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [status, setStatus] = useState(initial?.status || 'planned');
  const [companyGoalId, setCompanyGoalId] = useState(initial?.companyGoalId || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { name, description, status, companyGoalId };
    try {
      if (isEdit) {
        await updateInitiative(initial.id, payload);
      } else {
        await createInitiative(payload);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Error saving initiative');
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!window.confirm('Delete this initiative?')) return;
    try {
      await deleteInitiative(initial.id);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Error deleting initiative');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="initiative-form">
      <h3>{isEdit ? 'Editar iniciativa' : 'Crear iniciativa'}</h3>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Nombre:</label>
        <input value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <label>Descripción:</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <label>Estado:</label>
        <input value={status} onChange={e => setStatus(e.target.value)} />
      </div>
      <div>
        <label>CompanyGoal ID:</label>
        <input value={companyGoalId} onChange={e => setCompanyGoalId(e.target.value)} />
      </div>
      <button type="submit">{isEdit ? 'Actualizar' : 'Crear'}</button>
      {isEdit && (
        <button type="button" onClick={handleDelete} style={{ marginLeft: '8px' }}>
          Eliminar
        </button>
      )}
    </form>
  );
};
