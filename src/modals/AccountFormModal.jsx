import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { SegmentedControl } from '../components/shared/SegmentedControl.jsx';
import { ACCOUNT_TYPES, ACCOUNT_ROLES, canCountTowardFloor } from '../utils/plan/accountTypes.js';
import { getCardStyle } from '../utils/cardStyle.js';
import { getBrandfetchUrlForAccountName } from '../utils/brandfetch.js';
import { BottomSheet } from './BottomSheet.jsx';

export function AccountFormModal({ mode = 'add', account }) {
  const { dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? account.name : '');
  const [type, setType] = useState(isEdit ? account.type : 'bank');
  const [currency, setCurrency] = useState(isEdit ? account.currency ?? 'PHP' : 'PHP');
  const [balance, setBalance] = useState(isEdit ? String(account.balance) : '');
  const [role, setRole] = useState(isEdit ? account.role ?? '' : '');
  const [countsTowardFloor, setCountsTowardFloor] = useState(isEdit ? account.countsTowardFloor ?? false : false);
  const [error, setError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);

  const floorEligible = canCountTowardFloor(type);

  function handleTypeChange(nextType) {
    setType(nextType);
    // The flag is meaningless on anything but a bank account, so drop it
    // rather than leave an invisible true behind on e.g. a cash account.
    if (!canCountTowardFloor(nextType)) setCountsTowardFloor(false);
  }

  // Live preview of which logo (if any) this account name will resolve to —
  // same lookup chain AccountCard.jsx uses: hand-picked local asset first,
  // then Brandfetch, then nothing.
  const trimmedName = name.trim();
  const previewStyle = trimmedName ? getCardStyle({ name: trimmedName, type }) : null;
  const previewLogo = previewStyle?.logo ?? (trimmedName ? getBrandfetchUrlForAccountName(trimmedName) : null);

  function handleSubmit(e) {
    e.preventDefault();
    const balanceValue = Number(balance);
    if (!name.trim()) {
      setError('Give this account a name.');
      return;
    }
    if (balance === '' || Number.isNaN(balanceValue)) {
      setError('Enter a starting balance.');
      return;
    }
    if (isEdit) {
      dispatch({
        type: 'account/update',
        payload: {
          id: account.id,
          name: name.trim(),
          type,
          balance: balanceValue,
          currency,
          role: role || null,
          countsTowardFloor: floorEligible && countsTowardFloor,
        },
      });
    } else {
      dispatch({
        type: 'account/add',
        payload: {
          name: name.trim(),
          type,
          balance: balanceValue,
          currency,
          role: role || null,
          countsTowardFloor: floorEligible && countsTowardFloor,
        },
      });
    }
    closeModal();
  }

  return (
    <BottomSheet title={isEdit ? 'Edit Account' : 'Add Account'} onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label">Name</span>
          <input
            type="text"
            className="form__input"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPreviewFailed(false);
            }}
            placeholder="e.g. BPI Savings"
            required
          />
          {previewLogo && !previewFailed && (
            <div className="form__logo-preview">
              <img
                key={previewLogo}
                src={previewLogo}
                alt=""
                onError={() => setPreviewFailed(true)}
              />
              <span className="form__label">Logo found for this name</span>
            </div>
          )}
        </label>
        <label className="form__field">
          <span className="form__label">Type</span>
          <select className="form__input" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {type === 'receivable' && (
            <p className="form__label" style={{ marginTop: 6 }}>
              Money owed to you. Kept out of Total Balance and shown as &ldquo;Owed to Us&rdquo;.
            </p>
          )}
          {type === 'cooperative' && (
            <p className="form__label" style={{ marginTop: 6 }}>
              Counts toward Total Balance, but stays out of expense pickers.
            </p>
          )}
        </label>
        <label className="form__field">
          <span className="form__label">Role (optional)</span>
          <select className="form__input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">No role</option>
            {ACCOUNT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {floorEligible && (
          <label className="form__field form__checkbox">
            <input
              type="checkbox"
              checked={countsTowardFloor}
              onChange={(e) => setCountsTowardFloor(e.target.checked)}
            />
            <span>
              Counts toward the bank floor
              <span className="form__checkbox-hint">The balance you aim to keep untouched.</span>
            </span>
          </label>
        )}
        <div className="form__field">
          <span className="form__label">Currency</span>
          <SegmentedControl
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'PHP', label: 'PHP (₱)' },
              { value: 'USD', label: 'USD ($)' },
            ]}
          />
        </div>
        <label className="form__field">
          <span className="form__label">Balance ({currency === 'USD' ? '$' : '₱'})</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            className="form__input"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0"
            required
          />
        </label>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="btn-block">
          {isEdit ? 'Save Changes' : 'Add Account'}
        </button>
      </form>
    </BottomSheet>
  );
}
