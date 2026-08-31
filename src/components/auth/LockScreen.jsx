import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PinDots } from './PinDots.jsx';
import { PinPad } from './PinPad.jsx';
import { LockIcon, ChevronLeftIcon } from '../shared/Icon.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

export function LockScreen({ profile, onBack, onUnlock }) {
  const { signIn, sendPasswordReset } = useAuth();
  const [filled, setFilled] = useState(0);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [attemptKey, setAttemptKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleComplete(pin) {
    setSubmitting(true);
    const ok = await signIn(profile.email, pin);
    setSubmitting(false);

    if (ok) {
      onUnlock();
      return;
    }
    setShake(true);
    setError('Incorrect PIN');
    setFilled(0);
    setAttemptKey((k) => k + 1);
    setTimeout(() => setShake(false), 400);
  }

  async function handleResetConfirm() {
    setConfirmingReset(false);
    const ok = await sendPasswordReset(profile.email);
    setError(ok ? '' : "Couldn't send reset email — check your connection.");
    setResetSent(ok);
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen__content">
        <button type="button" className="lock-screen__back" onClick={onBack} aria-label="Choose a different user">
          <ChevronLeftIcon size={18} />
          Switch User
        </button>
        <LockIcon size={32} className="lock-screen__icon" />
        <h1 className="lock-screen__title">{profile.displayName}</h1>
        <p className="lock-screen__subtitle">Enter your PIN to continue</p>
        <PinDots length={6} filled={filled} shake={shake} />
        {error && <p className="lock-screen__error">{error}</p>}
        {resetSent && <p className="lock-screen__hint">Check {profile.email} for a reset link.</p>}
        <PinPad key={attemptKey} length={6} onChange={setFilled} onComplete={handleComplete} disabled={submitting} />
        <button type="button" className="lock-screen__forgot" onClick={() => setConfirmingReset(true)}>
          Forgot PIN?
        </button>
      </div>
      {confirmingReset && (
        <ConfirmDialog
          title="Send a reset link?"
          message={`We'll email ${profile.email} a link to set a new PIN.`}
          confirmLabel="Send"
          onConfirm={handleResetConfirm}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}
