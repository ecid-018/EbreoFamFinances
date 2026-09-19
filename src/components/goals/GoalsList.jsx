import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { splitGoals } from '../../utils/plan/goals.js';
import { GoalRow } from './GoalRow.jsx';
import { ChevronRightIcon, ChevronDownIcon } from '../shared/Icon.jsx';

function CollapsibleSection({ title, subtitle, goals }) {
  const [open, setOpen] = useState(false);
  if (goals.length === 0) return null;
  return (
    <div className="ios-card">
      <button type="button" className="ios-row-wrap list-row" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <div className="list-row__main">
          <span className="list-row__title">
            {title} ({goals.length})
          </span>
          {subtitle && <span className="list-row__meta">{subtitle}</span>}
        </div>
        {open ? (
          <ChevronDownIcon size={16} className="list-row__chevron" />
        ) : (
          <ChevronRightIcon size={16} className="list-row__chevron" />
        )}
      </button>
      {open && goals.map((goal) => <GoalRow key={goal.id} goal={goal} />)}
    </div>
  );
}

export function GoalsList() {
  const { state, openModal } = useApp();
  // Goals, sinking funds, achieved and archived answer different questions,
  // so they get their own sections rather than one undifferentiated list.
  const { goals, sinkingFunds, achieved, archived } = splitGoals(state.goals);

  return (
    <div id="section-goals">
      <div className="ios-group">
        <div className="ios-group__header">
          <span className="ios-group__title">Savings Goals</span>
        </div>
        <div className="ios-card">
          {goals.length === 0 ? (
            <div className="ios-row-wrap list-row">
              <span className="list-row__meta">No goals yet.</span>
            </div>
          ) : (
            goals.map((goal) => <GoalRow key={goal.id} goal={goal} />)
          )}
          <button type="button" className="ios-row-wrap list-row-plain" onClick={() => openModal('goalForm')}>
            + Add Goal
          </button>
        </div>
      </div>

      {sinkingFunds.length > 0 && (
        <div className="ios-group">
          <div className="ios-group__header">
            <span className="ios-group__title">Sinking Funds</span>
          </div>
          <div className="ios-card">
            {sinkingFunds.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {(achieved.length > 0 || archived.length > 0) && (
        <div className="ios-group">
          <CollapsibleSection title="Achieved" subtitle="Target reached" goals={achieved} />
          <CollapsibleSection title="Archived" subtitle="Tap a goal to restore it" goals={archived} />
        </div>
      )}
    </div>
  );
}
