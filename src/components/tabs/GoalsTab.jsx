import { GoalsList } from '../goals/GoalsList.jsx';

// Goals used to sit under Accounts. They are the whole point of the plan
// layer — priorities, sinking funds, what each payday funds — so they earn a
// tab rather than being the second half of another screen.
export function GoalsTab() {
  return <GoalsList />;
}
