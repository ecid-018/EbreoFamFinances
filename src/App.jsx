import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { loadTheme } from './data/storage.js';
import { applyTheme } from './utils/theme.js';
import { ProfilePicker } from './components/auth/ProfilePicker.jsx';
import { LockScreen } from './components/auth/LockScreen.jsx';
import { LockIcon } from './components/shared/Icon.jsx';
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
  const { activeTab, loading, syncError } = useApp();
  const ActiveTabComponent = TABS[activeTab] ?? HomeTab;

  if (loading) {
    return (
      <div className="lock-screen">
        <div className="lock-screen__content">
          <LockIcon size={32} className="lock-screen__icon" />
          <p className="lock-screen__subtitle">Loading your household's data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <NavBar />
      {syncError && <p className="lock-screen__error" style={{ textAlign: 'center', padding: '8px 16px' }}>{syncError}</p>}
      <main className="content">
        <ActiveTabComponent />
      </main>
      <BottomTabBar />
      <ModalRoot />
    </div>
  );
}

function App() {
  const { session } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  useEffect(() => {
    if (session === null) {
      setSelectedProfile(null);
      setUnlocked(false);
    }
  }, [session]);

  if (!selectedProfile) {
    return <ProfilePicker onSelect={setSelectedProfile} />;
  }

  if (!unlocked) {
    return (
      <LockScreen
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
