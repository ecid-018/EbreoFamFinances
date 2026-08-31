import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { toISODateString, getMonthKey } from '../utils/date.js';
import { SegmentedControl } from '../components/shared/SegmentedControl.jsx';
import { BudgetMonthStepper } from '../components/shared/BudgetMonthStepper.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function AddContributionModal({ goalId, goalName }) {
  const { state, dispatch, closeModal } = useApp();
  const [fundingSource, setFundingSource] = useState('account');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? '');
  const [incomeSource, setIncomeSource] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(state.month);
  const [error, setError] = useState('');

  const isFromIncome = fundingSource === 'income';

  function handleSubmit(e) {
    e.preventDefault();
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than ₱0.');
      return;
    }

    if (isFromIncome) {
      if (!incomeSource.trim()) {
        setError('Enter where this income came from.');
        return;
      }
      if (state.accounts.length > 0 && !accountId) {
        setError('Choose which account this was deposited into.');
        return;
      }
      dispatch({
        type: 'income/add',
        payload: {
          date: toISODateString(),
          source: incomeSource.trim(),
          amount: amountValue,
          accountId: accountId || null,
          budgetMonthKey: getMonthKey(budgetMonth.year, budgetMonth.monthIndex),
        },
      });
      dispatch({ type: 'goal/contribute', payload: { id: goalId, amount: amountValue, via: 'income' } });
    } else {
      if (state.accounts.length > 0 && !accountId) {
        setError('Choose which account this is coming from.');
        return;
      }
      dispatch({
        type: 'goal/contribute',
        payload: { id: goalId, amount: amountValue, accountId: accountId || null, via: 'account' },
      });
    }

    closeModal();
  }

  return (
    <BottomSheet title={`Contribute to ${goalName}`} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__field">
          <span className="form__label">Fund From</span>
          <SegmentedControl
            value={fundingSource}
            onChange={setFundingSource}
            options={[
              { value: 'account', label: 'Account' },
              { value: 'income', label: 'New Income' },
            ]}
          />
        </div>
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
        {isFromIncome && (
          <label className="form__field">
            <span className="form__label">Source</span>
            <input
              type="text"
              className="form__input"
              value={incomeSource}
              onChange={(e) => setIncomeSource(e.target.value)}
              placeholder="e.g. Bonus"
              required
            />
          </label>
        )}
        <label className="form__field">
          <span className="form__label">{isFromIncome ? 'Deposit Into' : 'Account'}</span>
          {state.accounts.length > 0 ? (
            <select className="form__input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {state.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="form__label">No accounts yet — add one in Accounts first.</p>
          )}
        </label>
        {isFromIncome && (
          <div className="form__field">
            <span className="form__label">Counts Toward Budget Month</span>
            <BudgetMonthStepper value={budgetMonth} onChange={setBudgetMonth} />
          </div>
        )}
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          Add Contribution
        </button>
      </form>
    </BottomSheet>
  );
}
