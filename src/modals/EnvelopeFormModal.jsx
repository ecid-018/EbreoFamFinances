import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { GroupSelect } from '../components/shared/GroupSelect.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function EnvelopeFormModal({ mode, envelope }) {
  const { state, dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? envelope.name : '');
  const [monthlyBudget, setMonthlyBudget] = useState(isEdit ? String(envelope.monthlyBudget) : '');
  const [group, setGroup] = useState(isEdit ? envelope.group : '');
  const [error, setError] = useState('');

  const existingGroups = [...new Set(state.envelopes.map((env) => env.group))];

  function handleSubmit(e) {
    e.preventDefault();
    const budgetValue = Number(monthlyBudget);
    if (!name.trim()) {
      setError('Give this envelope a name.');
      return;
    }
    if (!budgetValue || budgetValue <= 0) {
      setError('Enter a monthly budget greater than ₱0.');
      return;
    }
    if (!group.trim()) {
      setError('Choose or create a group.');
      return;
    }
    if (isEdit) {
      dispatch({
        type: 'envelope/update',
        payload: { id: envelope.id, name: name.trim(), monthlyBudget: budgetValue, group: group.trim() },
      });
    } else {
      dispatch({
        type: 'envelope/add',
        payload: { name: name.trim(), monthlyBudget: budgetValue, group: group.trim() },
      });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Envelope' : 'Add Envelope'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Monthly budget (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className="form__input"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        <div className="form__field">
          <span className="form__label">Group</span>
          <GroupSelect groups={existingGroups} value={group} onChange={setGroup} />
        </div>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Envelope'}
        </button>
      </form>
    </BottomSheet>
  );
}
