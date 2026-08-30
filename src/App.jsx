import { AppProvider, useApp } from './context/AppContext.jsx';
import { NavBar } from './components/layout/NavBar.jsx';
import { BottomTabBar } from './components/layout/BottomTabBar.jsx';
import { HomeTab } from './components/tabs/HomeTab.jsx';
import { BudgetTab } from './components/tabs/BudgetTab.jsx';
import { ActivityTab } from './components/tabs/ActivityTab.jsx';
import { MoreTab } from './components/tabs/MoreTab.jsx';
import { ModalRoot } from './modals/ModalRoot.jsx';

const TABS = {
  home: HomeTab,
  budget: BudgetTab,
  activity: ActivityTab,
  more: MoreTab,
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
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
