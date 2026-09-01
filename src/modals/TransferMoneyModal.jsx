import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatByCurrency } from '../utils/currency.js';
import { BottomSheet } from './BottomSheet.jsx';

// The one deliberate exception to the per-user account scoping used
// elsewhere (AddExpenseModal, IncomeFormModal, AddContributionModal) —
// transfers exist specifically to cross both the ownership and currency
// boundary, so both pickers list every account, either owner, either
// currency. Grouped by owner (optgroup) since both of you having a "Maya"
// or "BPI Savings" makes a flat list ambiguous.
export function TransferMoneyModal() {
  const { state, dispatch, closeModal } = useApp();
  const { session } = useAuth();
  const accounts = state.accounts;
  const myId = session?.user?.id;

  function ownerGroupLabel(account) {
    if (account.ownerId === myId) return 'Your Accounts';
    return `${state.profiles.find((p) => p.id === account.ownerId)?.displayName ?? 'Shared'}'s Accounts`;
  }

  function groupByOwner(list) {
    const groups = [];
    for (const account of list) {
      const label = ownerGroupLabel(account);
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, accounts: [] };
        groups.push(group);
      }
      group.accounts.push(account);
    }
    return groups;
  }

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts.find((a) => a.id !== accounts[0]?.id)?.id ?? '');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  const toOptions = accounts.filter((a) => a.id !== fromAccountId);
  const needsRate = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;
  const fromGroups = groupByOwner(accounts);
  const toGroups = groupByOwner(toOptions);

  const amountValue = Number(amount);
  const rateValue = Number(rate);
  let toAmount = amountValue;
  if (needsRate && rateValue > 0) {
    toAmount = fromAccount.currency === 'USD' ? amountValue * rateValue : amountValue / rateValue;
  }

  function handleFromChange(id) {
    setFromAccountId(id);
    if (id === toAccountId) {
      setToAccountId(accounts.find((a) => a.id !== id)?.id ?? '');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      setError('Choose both accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setError('Choose two different accounts.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (needsRate && (!rateValue || rateValue <= 0)) {
      setError('Enter the exchange rate you used.');
      return;
    }

    dispatch({
      type: 'transfer/create',
      payload: {
        fromAccountId,
        toAccountId,
        fromAmount: amountValue,
        toAmount,
        note: note.trim(),
      },
    });
    closeModal();
  }

  return (
    <BottomSheet title="Transfer Money" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">From</span>
          <select className="form__input" value={fromAccountId} onChange={(e) => handleFromChange(e.target.value)}>
            {fromGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency ?? 'PHP'})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span className="form__label">To</span>
          <select className="form__input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            {toGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency ?? 'PHP'})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span className="form__label">Amount ({fromAccount?.currency === 'USD' ? '$' : '₱'})</span>
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

        {needsRate && (
          <label className="form__field">
            <span className="form__label">Exchange Rate (1 USD = ⟨rate⟩ PHP)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="form__input"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 58.20"
              required
            />
          </label>
        )}

        {needsRate && amountValue > 0 && rateValue > 0 && (
          <p className="form__label">
            {toAccount.name} ({ownerGroupLabel(toAccount).replace(/ Accounts$/, '')}) receives:{' '}
            {formatByCurrency(toAmount, toAccount.currency)}
          </p>
        )}

        <label className="form__field">
          <span className="form__label">Note (optional)</span>
          <input
            type="text"
            className="form__input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Moving savings"
          />
        </label>

        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          Transfer
        </button>
      </form>
    </BottomSheet>
  );
}
