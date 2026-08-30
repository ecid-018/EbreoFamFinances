import { AppProvider } from './context/AppContext.jsx';
import { Header } from './components/layout/Header.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { SafeToSpend } from './components/hero/SafeToSpend.jsx';
import { StatsRow } from './components/stats/StatsRow.jsx';
import { EnvelopeList } from './components/envelopes/EnvelopeList.jsx';
import { NeedsCategoryList } from './components/uncategorized/NeedsCategoryList.jsx';
import { IncomeList } from './components/income/IncomeList.jsx';
import { AccountsList } from './components/accounts/AccountsList.jsx';
import { GoalsList } from './components/goals/GoalsList.jsx';
import { ModalRoot } from './modals/ModalRoot.jsx';

function AppShell() {
  return (
    <div className="page">
      <Header />
      <main className="content">
        <SafeToSpend />
        <StatsRow />
        <EnvelopeList />
        <NeedsCategoryList />
        <IncomeList />
        <AccountsList />
        <GoalsList />
      </main>
      <BottomNav />
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
