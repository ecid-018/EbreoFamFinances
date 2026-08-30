import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { StatusBar } from './StatusBar.jsx';

export function EnvelopeRow({ envelope }) {
  const { dispatch, openModal } = useApp();
  const { id, name, monthlyBudget, spent, isOver } = envelope;

  return (
    <SwipeToDeleteRow
      className="ios-row-wrap"
      onDelete={() => dispatch({ type: 'envelope/remove', payload: { id } })}
      onTap={() => openModal('envelopeForm', { mode: 'edit', envelope })}
    >
      <div className="stack-row">
        <div className="stack-row__top">
          <span className="stack-row__name">{name}</span>
          <span className={`stack-row__amount ${isOver ? 'stack-row__amount--over' : ''}`.trim()}>
            {isOver ? formatPHP(monthlyBudget - spent) : `${formatPHP(spent)} of ${formatPHP(monthlyBudget)}`}
          </span>
        </div>
        <StatusBar isOver={isOver} />
      </div>
    </SwipeToDeleteRow>
  );
}
