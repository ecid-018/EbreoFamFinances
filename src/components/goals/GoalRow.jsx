import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { ProgressBar } from './ProgressBar.jsx';

export function GoalRow({ goal }) {
  const { dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('addContribution', { goalId: goal.id, goalName: goal.name })}
      >
        <div className="stack-row">
          <div className="stack-row__top">
            <span className="stack-row__name">{goal.name}</span>
            <span className="stack-row__action">+ Contribute</span>
          </div>
          <span className="stack-row__amount">
            {formatPHP(goal.saved)} of {formatPHP(goal.target)}
          </span>
          <ProgressBar value={goal.saved} max={goal.target} />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${goal.name}"?`}
          message={`${formatPHP(goal.saved)} saved toward this goal will no longer be tracked.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'goal/remove', payload: { id: goal.id } });
          }}
        />
      )}
    </>
  );
}
