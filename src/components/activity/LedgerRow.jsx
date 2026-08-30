import { formatPHP } from '../../utils/currency.js';

export function LedgerRow({ entry }) {
  const date = new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="ios-row-wrap list-row">
      <div className="list-row__main">
        <span className="list-row__title">{entry.name}</span>
        <span className="list-row__meta">
          {entry.domain} · {entry.type} · {date}
        </span>
      </div>
      <span className="list-row__value">{formatPHP(entry.amount)}</span>
    </div>
  );
}
