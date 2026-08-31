import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function SecuritySection() {
  const { openModal } = useApp();
  const { currentProfile, signOut } = useAuth();

  return (
    <div className="ios-group">
      <div className="ios-group__header">
        <span className="ios-group__title">Security</span>
      </div>
      <div className="ios-card">
        {currentProfile && (
          <div className="ios-row-wrap list-row">
            <div className="list-row__main">
              <span className="list-row__title">Signed in as</span>
            </div>
            <span className="list-row__value">{currentProfile.displayName}</span>
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
