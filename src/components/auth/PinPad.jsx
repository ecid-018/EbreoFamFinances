import { useState } from 'react';
import { BackspaceIcon, CheckIcon } from '../shared/Icon.jsx';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// PINs are variable length (8-12 for anything set from now on; 6 still works
// for PINs set before that rule). When `expectedLength` is known — the lock
// screen remembers it per device after the first successful sign-in — the pad
// auto-submits at exactly that many digits, which keeps the original
// "type six, it just unlocks" feel. Otherwise the member confirms with the
// check key, which enables once `minLength` is reached.
export function PinPad({ minLength = 6, maxLength = 12, expectedLength, onChange, onComplete, disabled }) {
  const [digits, setDigits] = useState('');
  const cap = expectedLength ?? maxLength;
  const canSubmit = digits.length >= minLength;

  function update(next) {
    setDigits(next);
    onChange?.(next.length);
    return next;
  }

  function handleDigit(key) {
    if (disabled || digits.length >= cap) return;
    const next = update(digits + key);
    if (next.length === cap) onComplete?.(next);
  }

  function handleBackspace() {
    if (disabled) return;
    update(digits.slice(0, -1));
  }

  function handleSubmit() {
    if (disabled || !canSubmit) return;
    onComplete?.(digits);
  }

  return (
    <div className="pin-pad">
      {DIGITS.map((key) => (
        <button key={key} type="button" className="pin-pad__key" disabled={disabled} onClick={() => handleDigit(key)}>
          {key}
        </button>
      ))}
      {expectedLength ? (
        <div className="pin-pad__key pin-pad__key--blank" />
      ) : (
        <button
          type="button"
          className="pin-pad__key pin-pad__key--confirm"
          disabled={disabled || !canSubmit}
          aria-label="Confirm PIN"
          onClick={handleSubmit}
        >
          <CheckIcon size={22} />
        </button>
      )}
      <button type="button" className="pin-pad__key" disabled={disabled} onClick={() => handleDigit('0')}>
        0
      </button>
      <button
        type="button"
        className="pin-pad__key"
        disabled={disabled}
        aria-label="Delete last digit"
        onClick={handleBackspace}
      >
        <BackspaceIcon size={22} />
      </button>
    </div>
  );
}
