import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function GoalFormModal({ mode = 'add', goal }) {
  const { dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? goal.name : '');
  const [target, setTarget] = useState(isEdit ? String(goal.target) : '');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const targetValue = Number(target);
    if (!name.trim()) {
      setError('Give this goal a name.');
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setError('Enter a target amount greater than ₱0.');
      return;
    }

    if (isEdit) {
      dispatch({ type: 'goal/update', payload: { id: goal.id, name: name.trim(), target: targetValue } });
    } else {
      const savedValue = saved === '' ? 0 : Number(saved);
      dispatch({ type: 'goal/add', payload: { name: name.trim(), target: targetValue, saved: savedValue } });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Savings Goal' : 'Add Savings Goal'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency Fund"
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Target amount (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className="form__input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        {!isEdit && (
          <label className="form__field">
            <span className="form__label">Already saved (₱)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              className="form__input"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Goal'}
        </button>
      </form>
    </BottomSheet>
  );
}
