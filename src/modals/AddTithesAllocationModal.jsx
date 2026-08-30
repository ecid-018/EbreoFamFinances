import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function AddTithesAllocationModal() {
  const { dispatch, closeModal } = useApp();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!name.trim()) {
      setError('Give this allocation a name.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    dispatch({ type: 'tithes/addAllocation', payload: { name: name.trim(), amount: amountValue } });
    closeModal();
  }

  return (
    <BottomSheet title="Allocate to Activity" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sunday Offering"
            required
          />
        </label>
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
            required
          />
        </label>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          Add Allocation
        </button>
      </form>
    </BottomSheet>
  );
}
