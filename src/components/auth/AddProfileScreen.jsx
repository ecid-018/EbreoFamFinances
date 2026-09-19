import { useState } from 'react';
import { AppLogo } from '../shared/AppLogo.jsx';
import { ChevronLeftIcon } from '../shared/Icon.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// First use of a device: the member types the email they sign in with, once.
// After a successful sign-in the device remembers them by display name (see
// deviceProfiles.js), so the picker never needs the email baked into the app.
export function AddProfileScreen({ onBack, onContinue }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter the email address you sign in with.');
      return;
    }
    onContinue({ email: trimmed, displayName: trimmed });
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen__content">
        <button type="button" className="lock-screen__back" onClick={onBack} aria-label="Back to profiles">
          <ChevronLeftIcon size={18} />
          Back
        </button>
        <AppLogo size={56} className="lock-screen__icon" />
        <h1 className="lock-screen__title">Add a profile</h1>
        <p className="lock-screen__subtitle">Enter your email once — this device will remember you by name.</p>
        <form className="form add-profile" onSubmit={handleSubmit}>
          <label className="form__field">
            <span className="form__label">Email</span>
            <input
              type="email"
              className="form__input"
              autoComplete="username"
              inputMode="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              required
            />
          </label>
          {error && <p className="form__error">{error}</p>}
          <button type="submit" className="btn-block">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
