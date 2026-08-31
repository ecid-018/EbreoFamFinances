import { useState } from 'react';
import { BackspaceIcon } from '../shared/Icon.jsx';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function PinPad({ length = 6, onChange, onComplete, disabled }) {
  const [digits, setDigits] = useState('');

  function handleKey(key) {
    if (disabled) return;
    if (key === '') return;
    if (key === '⌫') {
      const next = digits.slice(0, -1);
      setDigits(next);
      onChange?.(next.length);
      return;
    }
    if (digits.length >= length) return;
    const next = digits + key;
    setDigits(next);
    onChange?.(next.length);
    if (next.length === length) {
      onComplete?.(next);
    }
  }

  return (
    <div className="pin-pad">
      {KEYS.map((key, i) => {
        if (key === '') return <div key={i} className="pin-pad__key pin-pad__key--blank" />;
        return (
          <button
            key={i}
            type="button"
            className="pin-pad__key"
            disabled={disabled}
            onClick={() => handleKey(key)}
          >
            {key === '⌫' ? <BackspaceIcon size={22} /> : key}
          </button>
        );
      })}
    </div>
  );
}
