import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function EditTithesSetAsideModal({ current }) {
  const { dispatch, closeModal } = useApp();
  const [amount, setAmount] = useState(current > 0 ? String(current) : '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (amount === '' || Number.isNaN(value) || value < 0) {
      setError('Enter a valid amount.');
      return;
    }
    dispatch({ type: 'tithes/setAside', payload: { amount: value } });
    closeModal();
  }

  return (
    <BottomSheet title="Set Aside This Month" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Amount (₱)</span>
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
        <button type="submit" className="btn-block">
          Save
        </button>
      </form>
    </BottomSheet>
  );
}
