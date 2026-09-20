import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { formatPHP } from '../utils/currency.js';
import { BottomSheet } from './BottomSheet.jsx';

// Spending a sinking fund — the insurance premium falls due, the trip happens.
// This only reduces what the fund holds. It deliberately does NOT move money
// out of an account: the expense or transfer that actually paid already did
// that, and doing both would double-count.
export function WithdrawFromGoalModal({ goalId, goalName }) {
  const { state, dispatch, closeModal } = useApp();
  const goal = state.goals.find((g) => g.id === goalId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const available = goal?.saved ?? 0;

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    if (amountValue > available) {
      setError(`Only ${formatPHP(available)} is saved in this fund.`);
      return;
    }
    dispatch({ type: 'goal/withdraw', payload: { id: goalId, amount: amountValue, note: note.trim() } });
    closeModal();
  }

  return (
    <BottomSheet title={`Spend from ${goalName}`} onClose={closeModal} fullScreen>
      <form className="form" onSubmit={handleSubmit}>
        <p className="form__label">
          {formatPHP(available)} saved. This lowers the fund only — log the expense itself separately.
        </p>
        <label className="form__field">
          <span className="form__label">Amount (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="form__input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Note (optional)</span>
          <input
            type="text"
            className="form__input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Annual premium paid"
          />
        </label>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          Spend from Fund
        </button>
      </form>
    </BottomSheet>
  );
}
