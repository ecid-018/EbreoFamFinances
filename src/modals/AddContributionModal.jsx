import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Modal } from './Modal.jsx';

export function AddContributionModal({ goalId, goalName }) {
  const { dispatch, closeModal } = useApp();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    dispatch({ type: 'goal/contribute', payload: { id: goalId, amount: amountValue } });
    closeModal();
  }

  return (
    <Modal title={`Contribute to ${goalName}`} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label eyebrow">Amount (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            className="form__input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            required
          />
        </label>
        {error && <p className="form__error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add contribution
          </button>
        </div>
      </form>
    </Modal>
  );
}
