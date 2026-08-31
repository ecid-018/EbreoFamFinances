import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { HomeIcon, BudgetIcon, PlusIcon, IncomeIcon, ExpenseIcon, ActivityIcon, MoreIcon } from '../shared/Icon.jsx';

export function BottomTabBar() {
  const { activeTab, setActiveTab, openModal } = useApp();
  const [chooserOpen, setChooserOpen] = useState(false);

  function goToTab(tab) {
    setChooserOpen(false);
    setActiveTab(tab);
  }

  function openAddExpense() {
    setChooserOpen(false);
    openModal('addExpense');
  }

  function openAddIncome() {
    setChooserOpen(false);
    openModal('incomeForm', { mode: 'add' });
  }

  return (
    <nav className="tabbar" aria-label="Primary">
      {chooserOpen && <div className="tabbar__scrim" onClick={() => setChooserOpen(false)} />}
      <div className="tabbar__inner">
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'home' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => goToTab('home')}
        >
          <HomeIcon size={22} />
          Home
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'budget' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => goToTab('budget')}
        >
          <BudgetIcon size={22} />
          Budget
        </button>
        <div className="tabbar__add-wrap">
          {chooserOpen && (
            <div className="tabbar__bubbles">
              <button type="button" className="tabbar__bubble" onClick={openAddIncome}>
                <span className="tabbar__bubble-icon">
                  <IncomeIcon size={18} />
                </span>
                Add Income
              </button>
              <button type="button" className="tabbar__bubble" onClick={openAddExpense}>
                <span className="tabbar__bubble-icon">
                  <ExpenseIcon size={18} />
                </span>
                Add Expense
              </button>
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
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'transactions' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => goToTab('transactions')}
        >
          <ActivityIcon size={22} />
          Transactions
        </button>
        <button
          type="button"
          className={`tabbar__item ${activeTab === 'accounts' ? 'tabbar__item--active' : ''}`.trim()}
          onClick={() => goToTab('accounts')}
        >
          <MoreIcon size={22} />
          Accounts
        </button>
      </div>
    </nav>
  );
}
