import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { toISODateString } from '../utils/date.js';
import { getSpendableAccounts, withCurrentAccount } from '../utils/accounts.js';
import { getPaymentDraft } from '../utils/plan/bills.js';
import { generateId } from '../utils/id.js';
import { BottomSheet } from './BottomSheet.jsx';

// Paying a bill is this same form, prefilled, submitting to pay_bill instead
// of add_transaction. A bill is a reminder plus a prefilled form, so it would
// be strange for it to open a different one.
export function AddExpenseModal({ mode = 'add', transaction, bill = null }) {
  const { state, dispatch, closeModal, refetchAll } = useApp();
  const { session } = useAuth();
  const isEdit = mode === 'edit';
  const spendableAccounts = withCurrentAccount(
    getSpendableAccounts(state.accounts, session?.user?.id),
    state.accounts,
    isEdit ? transaction.accountId : null
  );
  const draft = bill ? getPaymentDraft(bill) : null;
  const [date, setDate] = useState(isEdit ? transaction.date : draft?.date ?? toISODateString());
  const [amount, setAmount] = useState(isEdit ? String(transaction.amount) : draft ? String(draft.amount) : '');
  const [note, setNote] = useState(isEdit ? transaction.note : draft?.note ?? '');
  const [categoryId, setCategoryId] = useState(isEdit ? transaction.categoryId ?? '' : draft?.categoryId ?? '');
  const [accountId, setAccountId] = useState(
    isEdit ? transaction.accountId ?? '' : draft?.accountId ?? spendableAccounts[0]?.id ?? ''
  );
  const [busy, setBusy] = useState(false);
  const [fundGoalId, setFundGoalId] = useState('');
  const [error, setError] = useState('');

  const selectedEnvelope = state.envelopes.find((env) => env.id === categoryId);
  // Never re-show the Fund Goal control on edit — the original transaction (if any) already
  // funded a goal when it was first created; re-showing it here would double-count.
  const isSavingsEnvelope = !isEdit && !bill && selectedEnvelope?.group === 'Savings';

  async function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }
    if (spendableAccounts.length > 0 && !accountId) {
      setError('Choose which account or cash this was paid from.');
      return;
    }
    if (isSavingsEnvelope && state.goals.length > 0 && !fundGoalId) {
      setError('Choose which goal this funds.');
      return;
    }

    const payload = {
      date,
      amount: amountValue,
      note: note.trim(),
      categoryId: categoryId || null,
      accountId: accountId || null,
    };

    if (bill) {
      // One RPC writes the expense, moves the bill's next due date and draws
      // down its sinking fund. Nothing is applied optimistically, so the
      // screen waits for the refetch rather than showing a half-done payment.
      setBusy(true);
      const result = await dispatch({
        type: 'bill/pay',
        payload: { billId: bill.id, transactionId: generateId(), ...payload },
      });
      setBusy(false);
      if (result && result.ok === false) {
        setError("That didn't save — check the amount and try again.");
        return;
      }
      await refetchAll();
      closeModal();
      return;
    }

    if (isEdit) {
      dispatch({ type: 'transaction/update', payload: { id: transaction.id, ...payload } });
    } else {
      dispatch({ type: 'transaction/add', payload });
      if (isSavingsEnvelope && fundGoalId) {
        dispatch({
          type: 'goal/contribute',
          payload: { id: fundGoalId, amount: amountValue, via: 'savingsEnvelope' },
        });
      }
    }

    closeModal();
  }

  return (
    <BottomSheet title={bill ? `Pay ${bill.name}` : isEdit ? 'Edit Expense' : 'Add Expense'} onClose={closeModal} fullScreen>
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
            step="0.01"
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
          {spendableAccounts.length > 0 ? (
            <select
              className="form__input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {spendableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="form__label">No accounts yet — add one in Accounts first.</p>
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
        <button type="submit" className="btn-block" disabled={busy}>
          {busy ? 'Paying…' : bill ? `Pay ${bill.name}` : isEdit ? 'Save Changes' : 'Add Expense'}
        </button>
      </form>
    </BottomSheet>
  );
}
