import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { toISODateString } from '../utils/date.js';
import { BottomSheet } from './BottomSheet.jsx';

export function AddExpenseModal() {
  const { state, dispatch, closeModal } = useApp();
  const [date, setDate] = useState(toISODateString());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [fundGoalId, setFundGoalId] = useState('');
  const [error, setError] = useState('');

  const selectedEnvelope = state.envelopes.find((env) => env.id === categoryId);
  const isSavingsEnvelope = selectedEnvelope?.group === 'Savings';

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    if (state.accounts.length > 0 && !accountId) {
      setError('Choose which account or cash this was paid from.');
      return;
    }
    if (isSavingsEnvelope && state.goals.length > 0 && !fundGoalId) {
      setError('Choose which goal this funds.');
      return;
    }

    dispatch({
      type: 'transaction/add',
      payload: {
        date,
        amount: amountValue,
        note: note.trim(),
        categoryId: categoryId || null,
        accountId: accountId || null,
      },
    });

    if (isSavingsEnvelope && fundGoalId) {
      dispatch({ type: 'goal/contributeViaSavings', payload: { id: fundGoalId, amount: amountValue } });
    }

    closeModal();
  }

  return (
    <BottomSheet title="Add Expense" onClose={closeModal}>
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
        <label className="form__field">
          <span className="form__label">Note</span>
          <input
            type="text"
            className="form__input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
          />
        </label>
        <label className="form__field">
          <span className="form__label">Paid From</span>
          {state.accounts.length > 0 ? (
            <select
              className="form__input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {state.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="form__label">No accounts yet — add one in More first.</p>
          )}
        </label>
        <label className="form__field">
          <span className="form__label">Envelope</span>
          <select
            className="form__input"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setFundGoalId('');
            }}
          >
            <option value="">Needs a category</option>
            {state.envelopes.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </label>
        {isSavingsEnvelope && state.goals.length > 0 && (
          <label className="form__field">
            <span className="form__label">Fund Goal</span>
            <select
              className="form__input"
              value={fundGoalId}
              onChange={(e) => setFundGoalId(e.target.value)}
            >
              <option value="">Choose a goal…</option>
              {state.goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          Add Expense
        </button>
      </form>
    </BottomSheet>
  );
}
