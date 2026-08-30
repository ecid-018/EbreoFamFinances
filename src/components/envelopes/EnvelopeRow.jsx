import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { StatusBar } from './StatusBar.jsx';

export function EnvelopeRow({ envelope }) {
  const { dispatch, openModal } = useApp();
  const { id, name, monthlyBudget, spent, isOver } = envelope;

  return (
    <div className="envelope-row">
      <div className="envelope-row__top">
        <span className="envelope-row__name">{name}</span>
        <div className="envelope-row__actions">
          <button
            type="button"
            className="btn-icon"
            aria-label={`Edit ${name}`}
            onClick={() => openModal('envelopeForm', { mode: 'edit', envelope })}
          >
            ✎
          </button>
          <button
            type="button"
            className="btn-icon btn-icon--danger"
            aria-label={`Remove ${name}`}
            onClick={() => dispatch({ type: 'envelope/remove', payload: { id } })}
          >
            ×
          </button>
        </div>
      </div>
      <div className={`envelope-row__amount ${isOver ? 'envelope-row__amount--over' : ''}`.trim()}>
        {isOver
          ? formatPHP(monthlyBudget - spent)
          : `${formatPHP(spent)} of ${formatPHP(monthlyBudget)}`}
      </div>
      <StatusBar isOver={isOver} />
    </div>
  );
}
