import { useApp } from '../../context/AppContext.jsx';
import { formatPHP } from '../../utils/currency.js';
import { SwipeToDeleteRow } from '../shared/SwipeToDeleteRow.jsx';
import { ChevronRightIcon } from '../shared/Icon.jsx';

export function IncomeRow({ entry }) {
  const { dispatch, openModal } = useApp();
  const date = new Date(`${entry.date}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <SwipeToDeleteRow
      className="ios-row-wrap"
      onDelete={() => dispatch({ type: 'income/remove', payload: { id: entry.id } })}
      onTap={() => openModal('incomeForm', { mode: 'edit', entry })}
    >
      <div className="list-row">
        <div className="list-row__main">
          <span className="list-row__title">{entry.source}</span>
          <span className="list-row__meta">{date}</span>
        </div>
        <span className="list-row__value">{formatPHP(entry.amount)}</span>
        <ChevronRightIcon size={16} className="list-row__chevron" />
      </div>
    </SwipeToDeleteRow>
  );
}
