import { AUTH_PROFILES } from '../../data/authProfiles.js';
import { LockIcon } from '../shared/Icon.jsx';

export function ProfilePicker({ onSelect }) {
  return (
    <div className="lock-screen">
      <div className="lock-screen__content">
        <LockIcon size={32} className="lock-screen__icon" />
        <h1 className="lock-screen__title">Ebreo Family Finances</h1>
        <p className="lock-screen__subtitle">Who's using the app?</p>
        <div className="profile-picker">
          {AUTH_PROFILES.map((profile) => (
            <button
              key={profile.key}
              type="button"
              className="profile-picker__tile"
              onClick={() => onSelect(profile)}
            >
              <span className="profile-picker__avatar">{profile.displayName.charAt(0)}</span>
              <span className="profile-picker__name">{profile.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
