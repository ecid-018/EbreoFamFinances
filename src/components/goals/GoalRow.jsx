import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { ProgressBar } from './ProgressBar.jsx';

export function GoalRow({ goal }) {
  const { dispatch, openModal } = useApp();

  return (
    <div className="goal-row">
      <div className="goal-row__top">
        <span className="goal-row__name">{goal.name}</span>
        <button
          type="button"
          className="btn-text"
          onClick={() => openModal('addContribution', { goalId: goal.id, goalName: goal.name })}
        >
          + Contribute
        </button>
        <button
          type="button"
          className="btn-icon btn-icon--danger"
          aria-label={`Remove ${goal.name}`}
          onClick={() => dispatch({ type: 'goal/remove', payload: { id: goal.id } })}
        >
          ×
        </button>
      </div>
      <div className="goal-row__amount">
        {formatPHP(goal.saved)} of {formatPHP(goal.target)}
      </div>
      <ProgressBar value={goal.saved} max={goal.target} />
    </div>
  );
}
