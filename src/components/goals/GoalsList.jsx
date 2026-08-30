import { useApp } from '../../context/AppContext.jsx';
import { GoalRow } from './GoalRow.jsx';

export function GoalsList() {
  const { state, openModal } = useApp();

  return (
    <section className="section" id="section-goals">
      <div className="section__header">
        <h2 className="section__title">Savings goals</h2>
      </div>
      <div className="goal-list">
        {state.goals.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary section__add"
        onClick={() => openModal('goalForm')}
      >
        + Add goal
      </button>
    </section>
  );
}
