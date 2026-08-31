import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PinDots } from '../components/auth/PinDots.jsx';
import { PinPad } from '../components/auth/PinPad.jsx';
import { BottomSheet } from './BottomSheet.jsx';

const STEP_COPY = {
  current: { title: 'Enter Current PIN', subtitle: 'Confirm it’s you before changing your PIN.' },
  new: { title: 'Enter New PIN', subtitle: 'Choose a new 6-digit PIN.' },
  confirm: { title: 'Confirm New PIN', subtitle: 'Enter your new PIN again.' },
};

export function ChangePinModal() {
  const { closeModal } = useApp();
  const { currentProfile, signIn, changePassword } = useAuth();
  const [step, setStep] = useState('current');
  const [draftPin, setDraftPin] = useState('');
  const [filled, setFilled] = useState(0);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [attemptKey, setAttemptKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function fail(message) {
    setError(message);
    setShake(true);
    setFilled(0);
    setAttemptKey((k) => k + 1);
    setTimeout(() => setShake(false), 400);
  }

  async function handleComplete(pin) {
    setError('');
    if (step === 'current') {
      setSubmitting(true);
      const ok = await signIn(currentProfile.email, pin);
      setSubmitting(false);
      if (!ok) {
        fail('Incorrect PIN');
        return;
      }
      setStep('new');
      setFilled(0);
      return;
    }
    if (step === 'new') {
      setDraftPin(pin);
      setStep('confirm');
      setFilled(0);
      return;
    }
    if (step === 'confirm') {
      if (pin !== draftPin) {
        fail('PINs did not match — try again');
        setDraftPin('');
        setStep('new');
        return;
      }
      setSubmitting(true);
      const ok = await changePassword(pin);
      setSubmitting(false);
      if (!ok) {
        fail("Couldn't save your new PIN — try again");
        return;
      }
      closeModal();
    }
  }

  const copy = STEP_COPY[step];

  return (
    <BottomSheet title={copy.title} onClose={closeModal}>
      <div className="pin-change">
        <p className="pin-change__subtitle">{copy.subtitle}</p>
        <PinDots length={6} filled={filled} shake={shake} />
        {error && <p className="form__error pin-change__error">{error}</p>}
        <PinPad
          key={`${step}-${attemptKey}`}
          length={6}
          onChange={setFilled}
          onComplete={handleComplete}
          disabled={submitting}
        />
      </div>
    </BottomSheet>
  );
}
