import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { toISODateString } from '../utils/date.js';
import { BottomSheet } from './BottomSheet.jsx';

export function IncomeFormModal({ mode = 'add', entry }) {
  const { dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [date, setDate] = useState(isEdit ? entry.date : toISODateString());
  const [source, setSource] = useState(isEdit ? entry.source : '');
  const [amount, setAmount] = useState(isEdit ? String(entry.amount) : '');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!source.trim()) {
      setError('Enter where this income came from.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    if (isEdit) {
      dispatch({
        type: 'income/update',
        payload: { id: entry.id, date, source: source.trim(), amount: amountValue },
      });
    } else {
      dispatch({ type: 'income/add', payload: { date, source: source.trim(), amount: amountValue } });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Income' : 'Add Income'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Date</span>
          <input
            type="date"
            className="form__input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label">Source</span>
          <input
            type="text"
            className="form__input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. Allotment"
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
          {isEdit ? 'Save Changes' : 'Add Income'}
        </button>
      </form>
    </BottomSheet>
  );
}
