import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Modal } from './Modal.jsx';

export function EnvelopeFormModal({ mode, envelope }) {
  const { dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? envelope.name : '');
  const [monthlyBudget, setMonthlyBudget] = useState(isEdit ? String(envelope.monthlyBudget) : '');
  const [error, setError] = useState('');

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
    if (isEdit) {
      dispatch({
        type: 'envelope/update',
        payload: { id: envelope.id, name: name.trim(), monthlyBudget: budgetValue },
      });
    } else {
      dispatch({
        type: 'envelope/add',
        payload: { name: name.trim(), monthlyBudget: budgetValue },
      });
    }
    closeModal();
  }

  return (
    <Modal title={isEdit ? 'Edit envelope' : 'Add envelope'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label eyebrow">Name</span>
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
          <span className="form__label eyebrow">Monthly budget (₱)</span>
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
        {error && <p className="form__error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save changes' : 'Add envelope'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
