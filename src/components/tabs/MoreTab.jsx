import { IncomeList } from '../income/IncomeList.jsx';
import { AccountsList } from '../accounts/AccountsList.jsx';
import { GoalsList } from '../goals/GoalsList.jsx';

export function MoreTab() {
  return (
    <>
      <IncomeList />
      <AccountsList />
      <GoalsList />
    </>
  );
}
