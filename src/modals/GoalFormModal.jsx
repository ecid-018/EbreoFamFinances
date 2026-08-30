import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Modal } from './Modal.jsx';

export function GoalFormModal() {
  const { dispatch, closeModal } = useApp();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const targetValue = Number(target);
    const savedValue = saved === '' ? 0 : Number(saved);
    if (!name.trim()) {
      setError('Give this goal a name.');
      return;
    }
    if (!targetValue || targetValue <= 0) {
      setError('Enter a target amount greater than ₱0.');
      return;
    }
    dispatch({
      type: 'goal/add',
      payload: { name: name.trim(), target: targetValue, saved: savedValue },
    });
    closeModal();
  }

  return (
    <Modal title="Add savings goal" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label eyebrow">Name</span>
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
          <span className="form__label eyebrow">Target amount (₱)</span>
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
        <label className="form__field">
          <span className="form__label eyebrow">Already saved (₱)</span>
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
        {error && <p className="form__error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add goal
          </button>
        </div>
      </form>
    </Modal>
  );
}
