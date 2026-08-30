import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Modal } from './Modal.jsx';

export function AddAccountModal() {
  const { dispatch, closeModal } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [balance, setBalance] = useState('');
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
    dispatch({ type: 'account/add', payload: { name: name.trim(), type, balance: balanceValue } });
    closeModal();
  }

  return (
    <Modal title="Add account" onClose={closeModal}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__field">
          <span className="form__label eyebrow">Name</span>
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
          <span className="form__label eyebrow">Type</span>
          <div className="form__radio-group">
            <label className={`form__radio-option ${type === 'bank' ? 'form__radio-option--checked' : ''}`.trim()}>
              <input
                type="radio"
                name="account-type"
                value="bank"
                checked={type === 'bank'}
                onChange={() => setType('bank')}
              />
              Bank
            </label>
            <label
              className={`form__radio-option ${type === 'ewallet' ? 'form__radio-option--checked' : ''}`.trim()}
            >
              <input
                type="radio"
                name="account-type"
                value="ewallet"
                checked={type === 'ewallet'}
                onChange={() => setType('ewallet')}
              />
              E-wallet
            </label>
          </div>
        </div>
        <label className="form__field">
          <span className="form__label eyebrow">Balance (₱)</span>
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
        <div className="form__actions">
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add account
          </button>
        </div>
      </form>
    </Modal>
  );
}
