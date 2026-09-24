import { HomeIcon, BudgetIcon, ActivityIcon, MoreIcon, IncomeIcon, ExpenseIcon, TransferIcon, GoalIcon, PlanIcon } from '../shared/Icon.jsx';

// The tab keys here must match the TABS map in App.jsx. Both the phone
// BottomTabBar and the wider-screen SideNav render from this list, so a new
// tab only needs adding in two places (here and TABS) rather than in every nav.
// `railOnly` items appear in the SideNav but not in the phone tab bar. The
// bar already fits six items at 64-75px each on a 390px screen; a seventh
// would not. Below 600px the Plan is reached from the segment on Home
// instead, which sets the same activeTab.
export const NAV_ITEMS = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'plan', label: 'Plan', Icon: PlanIcon, railOnly: true },
  { key: 'budget', label: 'Budget', Icon: BudgetIcon },
  { key: 'goals', label: 'Goals', Icon: GoalIcon },
  { key: 'transactions', label: 'Transactions', Icon: ActivityIcon },
  { key: 'accounts', label: 'Accounts', Icon: MoreIcon },
];

// What the centre "+" (phone) and the SideNav's Add button open.
export const ADD_ACTIONS = [
  { key: 'income', label: 'Add Income', Icon: IncomeIcon, modal: 'incomeForm', props: { mode: 'add' } },
  { key: 'expense', label: 'Add Expense', Icon: ExpenseIcon, modal: 'addExpense', props: undefined },
  { key: 'transfer', label: 'Transfer Money', Icon: TransferIcon, modal: 'transferMoney', props: undefined },
  { key: 'payday', label: 'Payday', Icon: IncomeIcon, modal: 'payday', props: undefined },
];
