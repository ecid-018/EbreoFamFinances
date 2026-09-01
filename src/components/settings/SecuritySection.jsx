import { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { repo } from '../../data/repo.js';
import { Avatar } from '../shared/Avatar.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function SecuritySection() {
  const { state, refetchAll, openModal } = useApp();
  const { session, currentProfile, signOut } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const liveProfile = state.profiles.find((p) => p.id === session?.user?.id);
  const displayProfile = currentProfile && {
    displayName: currentProfile.displayName,
    avatarUrl: liveProfile?.avatarUrl,
  };

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('That image is too large — please choose one under 5MB.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      await repo.uploadAvatar(session.user.id, file);
      await refetchAll();
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError("Couldn't upload that photo — try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Security</span>
      </div>
      <div className="ios-card">
        {displayProfile && (
          <div className="ios-row-wrap list-row">
            <Avatar profile={displayProfile} size={40} />
            <div className="list-row__main">
              <span className="list-row__title">Signed in as</span>
              <span className="list-row__meta">{displayProfile.displayName}</span>
              {error && <span className="form__error">{error}</span>}
            </div>
            <button
              type="button"
              className="settings-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Change Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </div>
        )}
        <button type="button" className="ios-row-wrap list-row" onClick={() => openModal('changePin')}>
          <div className="list-row__main">
            <span className="list-row__title">Change PIN</span>
          </div>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>
        <button type="button" className="ios-row-wrap list-row" onClick={signOut}>
          <div className="list-row__main">
            <span className="list-row__title">Switch User</span>
          </div>
          <ChevronRightIcon size={16} className="list-row__chevron" />
        </button>
      </div>
    </div>
  );
}
