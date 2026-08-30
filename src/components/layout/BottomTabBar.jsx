import { useApp } from '../../context/AppContext.jsx';
import { HomeIcon, BudgetIcon, PlusIcon, ActivityIcon, MoreIcon } from '../shared/Icon.jsx';

export function BottomTabBar() {
  const { activeTab, setActiveTab, openModal } = useApp();

  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar__inner">
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'home' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon size={22} />
          Home
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'budget' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => setActiveTab('budget')}
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
          onClick={() => setActiveTab('activity')}
        >
          <ActivityIcon size={22} />
          Activity
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'more' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => setActiveTab('more')}
        >
          <MoreIcon size={22} />
          More
        </button>
      </div>
    </nav>
  );
}
