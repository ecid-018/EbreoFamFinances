import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { PlusIcon } from '../shared/Icon.jsx';
import { NAV_ITEMS, ADD_ACTIONS } from './navItems.js';

// Phone-only navigation (hidden from 600px up, where SideNav takes over).
// Items come from navItems.js so this and SideNav can never disagree.
export function BottomTabBar() {
  const { activeTab, setActiveTab, openModal } = useApp();
  const [chooserOpen, setChooserOpen] = useState(false);

  function goToTab(tab) {
    setChooserOpen(false);
    setActiveTab(tab);
  }

  function openAdd(action) {
    setChooserOpen(false);
    openModal(action.modal, action.props);
  }

  // Rail-only items (the Plan) are left out here: the bar is full at six.
  const [first, second, ...rest] = NAV_ITEMS.filter((item) => !item.railOnly);

  // On phones the Plan and Bills are segments inside Home, so Home stays lit
  // while either is open — nothing else would be, and an unlit bar reads as a
  // bug.
  const activeKey = activeTab === 'plan' || activeTab === 'bills' ? 'home' : activeTab;

  function renderTab({ key, label, Icon }) {
    return (
      <button
        key={key}
        type="button"
        className={`tabbar__item ${activeKey === key ? 'tabbar__item--active' : ''}`.trim()}
        onClick={() => goToTab(key)}
      >
        <Icon size={22} />
        {label}
      </button>
    );
  }

  return (
    <nav className="tabbar" aria-label="Primary">
      {chooserOpen && <div className="tabbar__scrim" onClick={() => setChooserOpen(false)} />}
      <div className="tabbar__inner">
        {[first, second].map(renderTab)}
        <div className="tabbar__add-wrap">
          {chooserOpen && (
            <div className="tabbar__bubbles">
              {ADD_ACTIONS.map((action) => (
                <button key={action.key} type="button" className="tabbar__bubble" onClick={() => openAdd(action)}>
                  <span className="tabbar__bubble-icon">
                    <action.Icon size={18} />
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="tabbar__item tabbar__item--add"
            onClick={() => setChooserOpen((v) => !v)}
          >
            <span className={`tabbar__add-circle ${chooserOpen ? 'tabbar__add-circle--open' : ''}`.trim()}>
              <PlusIcon size={22} stroke="#fff" />
            </span>
            Add
          </button>
        </div>
        {rest.map(renderTab)}
      </div>
    </nav>
  );
}
