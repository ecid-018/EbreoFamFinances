import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';

export function IncomeRow({ entry }) {
  const { dispatch } = useApp();
  const date = new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="list-row">
      <div className="list-row__main">
        <span className="list-row__title">{entry.source}</span>
        <span className="list-row__meta">{date}</span>
      </div>
      <div className="list-row__end">
        <span className="list-row__amount">{formatPHP(entry.amount)}</span>
        <button
          type="button"
          className="btn-icon btn-icon--danger"
          aria-label={`Remove ${entry.source}`}
          onClick={() => dispatch({ type: 'income/remove', payload: { id: entry.id } })}
        >
          ×
        </button>
      </div>
    </div>
  );
}
