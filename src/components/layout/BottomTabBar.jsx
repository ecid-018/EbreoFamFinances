import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { HomeIcon, BudgetIcon, PlusIcon, ActivityIcon, MoreIcon } from '../shared/Icon.jsx';

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function BottomTabBar() {
  const { openModal } = useApp();
  const [activeTab, setActiveTab] = useState('home');

  function handleTabClick(tab, sectionId) {
    setActiveTab(tab);
    if (sectionId === null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollToSection(sectionId);
    }
  }

  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar__inner">
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'home' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => handleTabClick('home', null)}
        >
          <HomeIcon size={22} />
          Home
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'budget' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => handleTabClick('budget', 'section-envelopes')}
        >
          <BudgetIcon size={22} />
          Budget
        </button>
        <button
          type="button"
          className="tabbar__item tabbar__item--add"
          onClick={() => openModal('addExpense')}
        >
          <span className="tabbar__add-circle">
            <PlusIcon size={22} stroke="#fff" />
          </span>
          Add
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'activity' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => handleTabClick('activity', 'section-needs-category')}
        >
          <ActivityIcon size={22} />
          Activity
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'more' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => handleTabClick('more', 'section-accounts')}
        >
          <MoreIcon size={22} />
          More
        </button>
      </div>
    </nav>
  );
}
