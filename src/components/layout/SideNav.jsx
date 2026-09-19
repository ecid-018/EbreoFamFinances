import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar } from '../shared/Avatar.jsx';
import { AppLogo } from '../shared/AppLogo.jsx';
import { PlusIcon } from '../shared/Icon.jsx';
import { NAV_ITEMS, ADD_ACTIONS } from './navItems.js';

// Replaces BottomTabBar from 600px up: an icon-only rail on tablets, and a
// full labelled sidebar from 1024px. Same activeTab state as the phone nav —
// there is no router, so this only ever reads/writes AppContext.
export function SideNav() {
  const { state, activeTab, setActiveTab, openModal } = useApp();
  const { session, currentProfile } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const liveProfile = state.profiles.find((p) => p.id === session?.user?.id);
  const displayProfile = currentProfile && {
    displayName: currentProfile.displayName,
    avatarUrl: liveProfile?.avatarUrl,
  };

  function openAdd(action) {
    setAddOpen(false);
    openModal(action.modal, action.props);
  }

  return (
    <nav className="sidenav" aria-label="Primary">
      <div className="sidenav__brand">
        <AppLogo size={28} />
        <span className="sidenav__brand-name">Ebreo Family</span>
      </div>

      <div className="sidenav__add-wrap">
        <button
          type="button"
          className="sidenav__add"
          aria-expanded={addOpen}
          onClick={() => setAddOpen((v) => !v)}
        >
          <span className="sidenav__add-icon">
            <PlusIcon size={20} stroke="#fff" />
          </span>
          <span className="sidenav__label">Add</span>
        </button>
        {addOpen && (
          <>
            <div className="sidenav__scrim" onClick={() => setAddOpen(false)} />
            <div className="sidenav__add-menu">
              {ADD_ACTIONS.map((action) => (
                <button key={action.key} type="button" className="sidenav__add-item" onClick={() => openAdd(action)}>
                  <action.Icon size={18} />
                  {action.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ul className="sidenav__list">
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <li key={key}>
            <button
              type="button"
              className={`sidenav__item ${activeTab === key ? 'sidenav__item--active' : ''}`.trim()}
              aria-current={activeTab === key ? 'page' : undefined}
              title={label}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={22} />
              <span className="sidenav__label">{label}</span>
            </button>
          </li>
        ))}
      </ul>

      {displayProfile && (
        <button
          type="button"
          className="sidenav__profile"
          title={`Signed in as ${displayProfile.displayName}`}
          onClick={() => openModal('settings')}
        >
          <Avatar profile={displayProfile} size={32} />
          <span className="sidenav__label sidenav__profile-name">{displayProfile.displayName}</span>
        </button>
      )}
    </nav>
  );
}
