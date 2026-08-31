import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { toISODateString, getMonthKey, parseMonthKey } from '../utils/date.js';
import { getSpendableAccounts } from '../utils/accounts.js';
import { BudgetMonthStepper } from '../components/shared/BudgetMonthStepper.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function IncomeFormModal({ mode = 'add', entry }) {
  const { state, dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const spendableAccounts = getSpendableAccounts(state.accounts);
  const [date, setDate] = useState(isEdit ? entry.date : toISODateString());
  const [source, setSource] = useState(isEdit ? entry.source : '');
  const [amount, setAmount] = useState(isEdit ? String(entry.amount) : '');
  const [accountId, setAccountId] = useState(isEdit ? entry.accountId ?? '' : spendableAccounts[0]?.id ?? '');
  const [budgetMonth, setBudgetMonth] = useState(
    isEdit ? parseMonthKey(entry.budgetMonthKey) : state.month
  );
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
    if (spendableAccounts.length > 0 && !accountId) {
      setError('Choose which account this was deposited into.');
      return;
    }

    const payload = {
      date,
      source: source.trim(),
      amount: amountValue,
      accountId: accountId || null,
      budgetMonthKey: getMonthKey(budgetMonth.year, budgetMonth.monthIndex),
    };

    if (isEdit) {
      dispatch({ type: 'income/update', payload: { id: entry.id, ...payload } });
    } else {
      dispatch({ type: 'income/add', payload });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Income' : 'Add Income'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Date Received</span>
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
        <label className="form__field">
          <span className="form__label">Deposit Into</span>
          {spendableAccounts.length > 0 ? (
            <select className="form__input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
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
        <div className="form__field">
          <span className="form__label">Counts Toward Budget Month</span>
          <BudgetMonthStepper value={budgetMonth} onChange={setBudgetMonth} />
        </div>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Income'}
        </button>
      </form>
    </BottomSheet>
  );
}
