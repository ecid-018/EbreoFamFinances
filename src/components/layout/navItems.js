import { HomeIcon, BudgetIcon, ActivityIcon, MoreIcon, IncomeIcon, ExpenseIcon, TransferIcon } from '../shared/Icon.jsx';

// The tab keys here must match the TABS map in App.jsx. Both the phone
// BottomTabBar and the wider-screen SideNav render from this list, so a new
// tab only needs adding in two places (here and TABS) rather than in every nav.
export const NAV_ITEMS = [
  { key: 'home', label: 'Home', Icon: HomeIcon },
  { key: 'budget', label: 'Budget', Icon: BudgetIcon },
  { key: 'transactions', label: 'Transactions', Icon: ActivityIcon },
  { key: 'accounts', label: 'Accounts', Icon: MoreIcon },
];

// The three things the centre "+" (phone) and the SideNav's Add button open.
export const ADD_ACTIONS = [
  { key: 'income', label: 'Add Income', Icon: IncomeIcon, modal: 'incomeForm', props: { mode: 'add' } },
  { key: 'expense', label: 'Add Expense', Icon: ExpenseIcon, modal: 'addExpense', props: undefined },
  { key: 'transfer', label: 'Transfer Money', Icon: TransferIcon, modal: 'transferMoney', props: undefined },
];
