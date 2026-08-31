import { AccountsList } from '../accounts/AccountsList.jsx';
import { GoalsList } from '../goals/GoalsList.jsx';

export function AccountsTab() {
  return (
    <>
      <AccountsList />
      <GoalsList />
    </>
  );
}
