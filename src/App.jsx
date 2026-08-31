import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { loadTheme } from './data/storage.js';
import { applyTheme } from './utils/theme.js';
import { LockScreen } from './components/auth/LockScreen.jsx';
import { NavBar } from './components/layout/NavBar.jsx';
import { BottomTabBar } from './components/layout/BottomTabBar.jsx';
import { HomeTab } from './components/tabs/HomeTab.jsx';
import { BudgetTab } from './components/tabs/BudgetTab.jsx';
import { TransactionsTab } from './components/tabs/TransactionsTab.jsx';
import { AccountsTab } from './components/tabs/AccountsTab.jsx';
import { ModalRoot } from './modals/ModalRoot.jsx';

const TABS = {
  home: HomeTab,
  budget: BudgetTab,
  transactions: TransactionsTab,
  accounts: AccountsTab,
};

function AppShell() {
  const { activeTab } = useApp();
  const ActiveTabComponent = TABS[activeTab] ?? HomeTab;

  return (
    <div className="page">
      <NavBar />
      <main className="content">
        <ActiveTabComponent />
      </main>
      <BottomTabBar />
      <ModalRoot />
    </div>
  );
}

function App() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
