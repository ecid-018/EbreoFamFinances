import { useState } from 'react';
import { loadDeviceProfiles, removeDeviceProfile } from '../../data/deviceProfiles.js';
import { AppLogo } from '../shared/AppLogo.jsx';
import { PlusIcon } from '../shared/Icon.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';

// Tiles come from this device's own memory (see deviceProfiles.js) rather
// than from a list baked into the bundle, so the app ships no email addresses.
export function ProfilePicker({ onSelect, onAddProfile }) {
  const [profiles, setProfiles] = useState(loadDeviceProfiles);
  const [editing, setEditing] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);

  function handleRemove() {
    const next = removeDeviceProfile(pendingRemoval.email);
    setProfiles(next);
    setPendingRemoval(null);
    if (next.length === 0) setEditing(false);
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen__content">
        <AppLogo size={56} className="lock-screen__icon" />
        <h1 className="lock-screen__title">Ebreo Family Finances</h1>
        <p className="lock-screen__subtitle">
          {profiles.length > 0 ? "Who's using the app?" : 'Add your profile to get started.'}
        </p>
        <div className="profile-picker">
          {profiles.map((profile) => (
            <div key={profile.email} className="profile-picker__slot">
              <button
                type="button"
                className="profile-picker__tile"
                disabled={editing}
                onClick={() => onSelect(profile)}
              >
                <span className="profile-picker__avatar">{profile.displayName.charAt(0).toUpperCase()}</span>
                <span className="profile-picker__name">{profile.displayName}</span>
              </button>
              {editing && (
                <button
                  type="button"
                  className="profile-picker__remove"
                  aria-label={`Remove ${profile.displayName} from this device`}
                  onClick={() => setPendingRemoval(profile)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="profile-picker__slot">
            <button type="button" className="profile-picker__tile profile-picker__tile--add" onClick={onAddProfile}>
              <span className="profile-picker__avatar profile-picker__avatar--add">
                <PlusIcon size={22} />
              </span>
              <span className="profile-picker__name">Add a profile</span>
            </button>
          </div>
        </div>
        {profiles.length > 0 && (
          <button type="button" className="lock-screen__forgot" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
      {pendingRemoval && (
        <ConfirmDialog
          title={`Remove ${pendingRemoval.displayName}?`}
          message="This only forgets them on this device. The account and all its data are untouched."
          confirmLabel="Remove"
          onConfirm={handleRemove}
          onCancel={() => setPendingRemoval(null)}
        />
      )}
    </div>
  );
}
