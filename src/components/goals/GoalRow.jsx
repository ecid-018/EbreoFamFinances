import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { getDayLabel } from '../../utils/date.js';
import { isGoalAchieved } from '../../utils/plan/goals.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { PencilIcon } from '../shared/Icon.jsx';
import { ProgressBar } from './ProgressBar.jsx';

export function GoalRow({ goal }) {
  const { state, dispatch, openModal } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const heldIn = goal.heldInAccountId
    ? state.accounts.find((a) => a.id === goal.heldInAccountId)
    : null;
  const achieved = isGoalAchieved(goal);
  const archived = goal.archivedAt != null;
  // A goal holding money is archived rather than deleted, the same way an
  // account with history is — deleting would silently drop the record of what
  // was saved. An empty goal is just clutter and can go.
  const hasSavings = goal.saved > 0;

  // A sinking fund is spent down again rather than finished, so its main
  // action is spending it; everything else is funded.
  const primaryAction = goal.isSinkingFund
    ? { label: '− Spend', modal: 'withdrawFromGoal' }
    : { label: '+ Contribute', modal: 'addContribution' };

  const meta = [
    heldIn?.name,
    goal.targetDate ? `by ${getDayLabel(goal.targetDate)}` : null,
    goal.goalGroup,
  ].filter(Boolean);

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() =>
          archived
            ? dispatch({ type: 'goal/unarchive', payload: { id: goal.id } })
            : openModal(primaryAction.modal, { goalId: goal.id, goalName: goal.name })
        }
      >
        <div className="stack-row">
          <div className="stack-row__top">
            <div className="stack-row__name-group">
              <span className="stack-row__name">{goal.name}</span>
              {goal.priority != null && <span className="goal-row__priority">#{goal.priority}</span>}
              <button
                type="button"
                className="stack-row__edit"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('goalForm', { mode: 'edit', goal });
                }}
                aria-label={`Edit ${goal.name}`}
              >
                <PencilIcon size={15} />
              </button>
            </div>
            <span className="stack-row__action">{archived ? 'Restore' : primaryAction.label}</span>
          </div>
          <span className="stack-row__amount">
            {formatPHP(goal.saved)} of {formatPHP(goal.target)}
            {achieved && !goal.isSinkingFund ? ' · reached' : ''}
          </span>
          {meta.length > 0 && <span className="goal-row__meta">{meta.join(' · ')}</span>}
          <ProgressBar value={goal.saved} max={goal.target} />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={hasSavings && !archived ? `Archive "${goal.name}"?` : `Delete "${goal.name}"?`}
          message={
            hasSavings && !archived
              ? `${formatPHP(goal.saved)} is saved toward it, so it moves to Archived rather than being deleted. You can restore it any time.`
              : 'This goal has nothing saved toward it and will be removed.'
          }
          confirmLabel={hasSavings && !archived ? 'Archive' : 'Delete'}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({
              type: hasSavings && !archived ? 'goal/archive' : 'goal/remove',
              payload: { id: goal.id },
            });
          }}
        />
      )}
    </>
  );
}
