import { useApp } from '../../context/AppContext.jsx';
import { GoalRow } from './GoalRow.jsx';

export function GoalsList() {
  const { state, openModal } = useApp();

  return (
    <div className="ios-group" id="section-goals">
      <div className="ios-group__header">
        <span className="ios-group__title">Savings Goals</span>
      </div>
      <div className="ios-card">
        {state.goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
        <button
          type="button"
          className="ios-row-wrap list-row-plain"
          onClick={() => openModal('goalForm')}
        >
          + Add Goal
        </button>
      </div>
    </div>
  );
}
