import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { useMonthSnapshot } from './hooks/useMonthSnapshot.js';
import { useAuth } from './context/AuthContext.jsx';
import { loadTheme } from './data/storage.js';
import { applyTheme } from './utils/theme.js';
import { ProfilePicker } from './components/auth/ProfilePicker.jsx';
import { AddProfileScreen } from './components/auth/AddProfileScreen.jsx';
import { LockScreen } from './components/auth/LockScreen.jsx';
import { ConfirmDialog } from './components/shared/ConfirmDialog.jsx';
import { LockIcon } from './components/shared/Icon.jsx';
import { NavBar } from './components/layout/NavBar.jsx';
import { BottomTabBar } from './components/layout/BottomTabBar.jsx';
import { SideNav } from './components/layout/SideNav.jsx';
import { HouseholdSnapshot } from './components/home/HouseholdSnapshot.jsx';
import { NeedsAttentionCard } from './components/home/NeedsAttentionCard.jsx';
import { PlanSummaryCard } from './components/plan/PlanSummaryCard.jsx';
import { HomeTab } from './components/tabs/HomeTab.jsx';
import { PlanTab } from './components/tabs/PlanTab.jsx';
import { BillsTab } from './components/tabs/BillsTab.jsx';
import { DueSoonCard } from './components/bills/DueSoonCard.jsx';
import { BudgetTab } from './components/tabs/BudgetTab.jsx';
import { TransactionsTab } from './components/tabs/TransactionsTab.jsx';
import { GoalsTab } from './components/tabs/GoalsTab.jsx';
import { AccountsTab } from './components/tabs/AccountsTab.jsx';
import { ModalRoot } from './modals/ModalRoot.jsx';

const TABS = {
  home: HomeTab,
  plan: PlanTab,
  bills: BillsTab,
  budget: BudgetTab,
  goals: GoalsTab,
  transactions: TransactionsTab,
  accounts: AccountsTab,
};

function AppShell({ shortPin, onDismissShortPin }) {
  const { activeTab, loading, syncError, openModal } = useApp();
  // Records the month that just ended, once, on first open in a new month.
  useMonthSnapshot();
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
      {/* One grid for all three widths: the nav and overview columns are
          created by layout.css at 600px and 1024px respectively. Below 600px
          only `main` exists and BottomTabBar renders instead. */}
      <SideNav />
      <div className="page__main">
        <NavBar />
        {syncError && <p className="lock-screen__error" style={{ textAlign: 'center', padding: '8px 16px' }}>{syncError}</p>}
        <main className="content">
          <ActiveTabComponent />
        </main>
      </div>
      {/* Overview column (>=1024px). Hidden below 1024px, where these cards
          stay inside HomeTab and the Plan and Bills have their own tabs. */}
      <aside className="page__overview" aria-label="Overview">
        <DueSoonCard />
        <PlanSummaryCard />
        <HouseholdSnapshot />
        <NeedsAttentionCard />
      </aside>
      <BottomTabBar />
      <ModalRoot />
      {shortPin && !loading && (
        <ConfirmDialog
          title="Your PIN is shorter than 8 digits"
          message="Longer PINs are much harder to guess. You can change it now, or later from Settings."
          confirmLabel="Change PIN"
          cancelLabel="Not now"
          onConfirm={() => {
            onDismissShortPin();
            openModal('changePin');
          }}
          onCancel={onDismissShortPin}
        />
      )}
    </div>
  );
}

function App() {
  const { session } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [addingProfile, setAddingProfile] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [shortPin, setShortPin] = useState(false);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  useEffect(() => {
    if (session === null) {
      setSelectedProfile(null);
      setAddingProfile(false);
      setUnlocked(false);
      setShortPin(false);
    }
  }, [session]);

  if (!selectedProfile) {
    return addingProfile ? (
      <AddProfileScreen
        onBack={() => setAddingProfile(false)}
        onContinue={(profile) => {
          setAddingProfile(false);
          setSelectedProfile(profile);
        }}
      />
    ) : (
      <ProfilePicker onSelect={setSelectedProfile} onAddProfile={() => setAddingProfile(true)} />
    );
  }

  if (!unlocked) {
    return (
      <LockScreen
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onUnlock={({ shortPin: isShort }) => {
          setUnlocked(true);
          setShortPin(isShort);
        }}
      />
    );
  }

  return (
    <AppProvider>
      <AppShell shortPin={shortPin} onDismissShortPin={() => setShortPin(false)} />
    </AppProvider>
  );
}

export default App;
