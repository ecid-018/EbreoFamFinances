import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { toISODateString } from '../utils/date.js';
import { Modal } from './Modal.jsx';

export function AddExpenseModal() {
  const { state, dispatch, closeModal } = useApp();
  const [date, setDate] = useState(toISODateString());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    dispatch({
      type: 'transaction/add',
      payload: { date, amount: amountValue, note: note.trim(), categoryId: categoryId || null },
    });
    closeModal();
  }

  return (
    <Modal title="Add expense" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label eyebrow">Date</span>
          <input
            type="date"
            className="form__input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
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
            required
          />
        </label>
        <label className="form__field">
          <span className="form__label eyebrow">Note</span>
          <input
            type="text"
            className="form__input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
          />
        </label>
        <label className="form__field">
          <span className="form__label eyebrow">Envelope</span>
          <select
            className="form__input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Needs a category</option>
            {state.envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="form__error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
