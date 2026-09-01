import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { toISODateString, getMonthKey, parseMonthKey } from '../utils/date.js';
import { getOwnAccounts, withCurrentAccount } from '../utils/accounts.js';
import { BudgetMonthStepper } from '../components/shared/BudgetMonthStepper.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function IncomeFormModal({ mode = 'add', entry }) {
  const { state, dispatch, closeModal } = useApp();
  const { session } = useAuth();
  const isEdit = mode === 'edit';
  // Income is the one flow that can target a USD account directly — everywhere
  // else (expenses, goal funding) stays PHP-only via getSpendableAccounts. Also
  // scoped to the logged-in user's own accounts (see getOwnAccounts) to avoid
  // confusion between the two of you both having e.g. a "Maya" account.
  const accounts = withCurrentAccount(
    getOwnAccounts(state.accounts, session?.user?.id),
    state.accounts,
    isEdit ? entry.accountId : null
  );
  const [date, setDate] = useState(isEdit ? entry.date : toISODateString());
  const [source, setSource] = useState(isEdit ? entry.source : '');
  const [amount, setAmount] = useState(isEdit ? String(entry.amount) : '');
  const [accountId, setAccountId] = useState(isEdit ? entry.accountId ?? '' : accounts[0]?.id ?? '');
  const [budgetMonth, setBudgetMonth] = useState(
    isEdit ? parseMonthKey(entry.budgetMonthKey) : state.month
  );
  const [error, setError] = useState('');

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isUsd = selectedAccount?.currency === 'USD';
  const currencySymbol = isUsd ? '$' : '₱';

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!source.trim()) {
      setError('Enter where this income came from.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError(`Enter an amount greater than ${currencySymbol}0.`);
      return;
    }
    if (accounts.length > 0 && !accountId) {
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
          <span className="form__label">Amount ({currencySymbol})</span>
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
          {accounts.length > 0 ? (
            <select className="form__input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                  {account.currency === 'USD' ? ' (USD)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="form__label">No accounts yet — add one in Accounts first.</p>
          )}
          {isUsd && (
            <p className="form__label" style={{ marginTop: 4 }}>
              This won't count toward this month's budget totals — those stay in pesos.
            </p>
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
