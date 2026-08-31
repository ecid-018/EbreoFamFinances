import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ConfirmDialog } from '../shared/ConfirmDialog.jsx';
import { StatusBar } from './StatusBar.jsx';

export function EnvelopeRow({ envelope, indented = false }) {
  const { dispatch, openModal } = useApp();
  const { id, name, monthlyBudget, spent, isOver } = envelope;
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SwipeToDeleteRow
        className="ios-row-wrap"
        onDelete={() => setConfirmOpen(true)}
        onTap={() => openModal('envelopeForm', { mode: 'edit', envelope })}
      >
        <div className={`stack-row ${indented ? 'stack-row--indented' : ''}`.trim()}>
          <div className="stack-row__top">
            <span className="stack-row__name">{name}</span>
            <span className={`stack-row__amount ${isOver ? 'stack-row__amount--over' : ''}`.trim()}>
              {isOver ? formatPHP(monthlyBudget - spent) : `${formatPHP(spent)} of ${formatPHP(monthlyBudget)}`}
            </span>
          </div>
          <StatusBar isOver={isOver} />
        </div>
      </SwipeToDeleteRow>
      {confirmOpen && (
        <ConfirmDialog
          title={`Delete "${name}"?`}
          message="Its transactions will move to Needs a Category instead of being deleted."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            dispatch({ type: 'envelope/remove', payload: { id } });
          }}
        />
      )}
    </>
  );
}
