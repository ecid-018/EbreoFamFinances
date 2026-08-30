import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { SegmentedControl } from '../components/shared/SegmentedControl.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function AccountFormModal({ mode = 'add', account }) {
  const { dispatch, closeModal } = useApp();
  const isEdit = mode === 'edit';
  const [name, setName] = useState(isEdit ? account.name : '');
  const [type, setType] = useState(isEdit ? account.type : 'bank');
  const [balance, setBalance] = useState(isEdit ? String(account.balance) : '');
  const [error, setError] = useState('');

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
        payload: { id: account.id, name: name.trim(), type, balance: balanceValue },
      });
    } else {
      dispatch({ type: 'account/add', payload: { name: name.trim(), type, balance: balanceValue } });
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
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. BPI Savings"
            required
          />
        </label>
        <div className="form__field">
          <span className="form__label">Type</span>
          <SegmentedControl
            value={type}
            onChange={setType}
            options={[
              { value: 'bank', label: 'Bank' },
              { value: 'ewallet', label: 'E-wallet' },
            ]}
          />
        </div>
        <label className="form__field">
          <span className="form__label">Balance (₱)</span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
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
