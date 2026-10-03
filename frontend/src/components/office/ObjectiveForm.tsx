import React, { useState } from 'react';
import { createObjective, updateObjective, deleteObjective } from '../../lib/api';

/**
 * Simple form for creating or editing a CompanyGoal.
 * Props `initial` can be used for edit mode; if omitted, the form creates a new objective.
 */
export const ObjectiveForm: React.FC<{ initial?: any; onSuccess?: () => void }> = ({ initial, onSuccess }) => {
  const isEdit = !!initial?.id;
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [targetValue, setTargetValue] = useState(initial?.targetValue ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { name, description, targetValue: Number(targetValue) };
    try {
      if (isEdit) {
        await updateObjective(initial.id, payload);
      } else {
        await createObjective(payload);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Error saving objective');
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!window.confirm('Delete this objective?')) return;
    try {
      await deleteObjective(initial.id);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message ?? 'Error deleting objective');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="objective-form">
      <h3>{isEdit ? 'Editar objetivo' : 'Crear objetivo'}</h3>
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
        <label>Meta (%):</label>
        <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
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
