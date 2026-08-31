import { useState } from 'react';
import { loadPin, resetPin, DEFAULT_PIN } from '../../data/storage.js';
import { PinDots } from './PinDots.jsx';
import { PinPad } from './PinPad.jsx';
import { LockIcon } from '../shared/Icon.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

export function LockScreen({ onUnlock }) {
  const [filled, setFilled] = useState(0);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [attemptKey, setAttemptKey] = useState(0);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function handleComplete(pin) {
    if (pin === loadPin()) {
      onUnlock();
      return;
    }
    setShake(true);
    setError('Incorrect PIN');
    setFilled(0);
    setAttemptKey((k) => k + 1);
    setTimeout(() => setShake(false), 400);
  }

  function handleResetConfirm() {
    resetPin();
    setConfirmingReset(false);
    setResetDone(true);
    setError('');
    setFilled(0);
    setAttemptKey((k) => k + 1);
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen__content">
        <LockIcon size={32} className="lock-screen__icon" />
        <h1 className="lock-screen__title">Ebreo Family Finances</h1>
        <p className="lock-screen__subtitle">Enter your PIN to continue</p>
        <PinDots length={6} filled={filled} shake={shake} />
        {error && <p className="lock-screen__error">{error}</p>}
        {resetDone && <p className="lock-screen__hint">PIN reset to default ({DEFAULT_PIN}).</p>}
        <PinPad key={attemptKey} length={6} onChange={setFilled} onComplete={handleComplete} />
        <button
          type="button"
          className="lock-screen__forgot"
          onClick={() => setConfirmingReset(true)}
        >
          Forgot PIN?
        </button>
      </div>
      {confirmingReset && (
        <ConfirmDialog
          title="Reset PIN to default?"
          message="Your financial data will not be affected."
          confirmLabel="Reset"
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}
